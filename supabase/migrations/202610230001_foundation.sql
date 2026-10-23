-- FR-001/002, NFR-005: family isolation. All writes use transactional RPCs.
create table public.families(id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz not null default now());
create table public.profiles(id uuid primary key references auth.users on delete cascade, family_id uuid not null references families, role text not null check(role in ('parent','student')), display_name text not null, created_at timestamptz default now());
create table public.student_profiles(id uuid primary key default gen_random_uuid(), user_id uuid unique references profiles, family_id uuid not null references families, display_name text not null, current_grade int default 7, timezone text default 'Europe/Istanbul');
create table public.invites(code uuid primary key default gen_random_uuid(), student_id uuid unique not null references student_profiles, family_id uuid not null references families);
create table public.settings(family_id uuid primary key references families, streak_threshold_percent int not null default 70 check(streak_threshold_percent between 1 and 100), light_day_threshold_percent int not null default 50 check(light_day_threshold_percent between 1 and 100), max_light_days_per_week int not null default 1 check(max_light_days_per_week between 0 and 7), minimum_study_session_seconds int not null default 300 check(minimum_study_session_seconds>=300), student_created_task_xp int not null default 5 check(student_created_task_xp between 0 and 20));
create table public.tasks(id uuid primary key default gen_random_uuid(), student_id uuid not null references student_profiles, created_by uuid not null references profiles, category text not null check(category in ('HOMEWORK','STUDY','HABIT')), source text not null, title text not null check(length(title) between 1 and 160), subject text, description text, active_date date not null, due_at timestamptz, recurrence_rule text check(recurrence_rule is null or recurrence_rule='DAILY'), estimated_minutes int check(estimated_minutes>0), weight numeric not null default 1 check(weight>0), xp_reward int not null default 0 check(xp_reward>=0), coin_reward int not null default 0 check(coin_reward>=0), priority text not null default 'MEDIUM' check(priority in ('LOW','MEDIUM','HIGH')), active boolean not null default true, created_at timestamptz default now(), updated_at timestamptz default now());
-- HOMEWORK tasks are the canonical homework records, avoiding duplicate reward sources.
create view public.homework with (security_invoker=true) as select * from tasks where category='HOMEWORK';
create table public.task_completions(id uuid primary key default gen_random_uuid(), task_id uuid not null references tasks, student_id uuid not null references student_profiles, occurrence_key date not null, completed_by uuid not null references profiles, completed_at timestamptz not null default now(), reversed_at timestamptz);
create unique index one_current_completion on task_completions(task_id,student_id,occurrence_key) where reversed_at is null;
create table public.study_blocks(id uuid primary key default gen_random_uuid(), student_id uuid not null references student_profiles, title text not null, subject text, topic text, date date not null, order_index int not null default 0, start_time time, planned_minutes int not null check(planned_minutes>0), linked_task_id uuid references tasks, xp_reward int not null default 10 check(xp_reward>=0), coin_reward int not null default 0 check(coin_reward>=0), status text not null default 'PLANNED' check(status in ('PLANNED','IN_PROGRESS','COMPLETED','SKIPPED')), created_by uuid references profiles, updated_at timestamptz default now());
create table public.study_sessions(id uuid primary key default gen_random_uuid(), student_id uuid not null references student_profiles, study_block_id uuid not null references study_blocks, started_at timestamptz not null default now(), last_resumed_at timestamptz default now(), ended_at timestamptz, active_seconds int not null default 0, questions_solved int check(questions_solved>=0), status text not null default 'RUNNING' check(status in ('RUNNING','PAUSED','COMPLETED')));
create unique index one_active_session on study_sessions(student_id) where status in ('RUNNING','PAUSED');
create table public.rewards(id uuid primary key default gen_random_uuid(), family_id uuid not null references families, name text not null, description text, coin_cost int not null check(coin_cost>0), active boolean not null default true, created_by uuid references profiles, updated_at timestamptz default now());
create table public.reward_requests(id uuid primary key default gen_random_uuid(), reward_id uuid not null references rewards, student_id uuid not null references student_profiles, coin_cost_snapshot int not null check(coin_cost_snapshot>0), status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED','CANCELLED')), requested_at timestamptz default now(), reviewed_at timestamptz, reviewed_by uuid references profiles);
create table public.transactions(id uuid primary key default gen_random_uuid(), student_id uuid not null references student_profiles, currency text not null check(currency in ('XP','COIN')), amount int not null, transaction_type text not null check(transaction_type in ('EARN','SPEND','ADJUSTMENT','REVERSAL')), description text not null, source_type text not null, source_id uuid not null, created_by uuid references profiles, created_at timestamptz not null default now(), unique(student_id,currency,source_type,source_id,transaction_type));
create view public.xp_transactions with (security_invoker=true) as select * from transactions where currency='XP';
create view public.coin_transactions with (security_invoker=true) as select * from transactions where currency='COIN';
create table public.calendar_events(id uuid primary key default gen_random_uuid(), student_id uuid not null references student_profiles, title text not null, type text not null check(type in ('EXAM','OTHER')), starts_at timestamptz not null, created_by uuid references profiles);
create table public.light_days(student_id uuid not null references student_profiles, date date not null, primary key(student_id,date));
create function public.can_access(s uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from student_profiles sp join profiles p on p.id=auth.uid() where sp.id=s and (sp.user_id=p.id or (p.role='parent' and p.family_id=sp.family_id))) $$;
create function public.my_family() returns uuid language sql stable security definer set search_path=public as $$ select family_id from profiles where id=auth.uid() $$;
do $$ declare t text; begin
foreach t in array array['families','profiles','student_profiles','invites','settings','tasks','task_completions','study_blocks','study_sessions','rewards','reward_requests','transactions','calendar_events','light_days'] loop
execute format('alter table public.%I enable row level security',t);
end loop;
foreach t in array array['tasks','task_completions','study_blocks','study_sessions','reward_requests','transactions','calendar_events','light_days'] loop
execute format('create policy read_scope on public.%I for select to authenticated using (public.can_access(student_id))',t);
end loop;
end $$;
create policy read_family on families for select to authenticated using(id=my_family());
create policy read_profiles on profiles for select to authenticated using(id=auth.uid() or (family_id=my_family() and exists(select 1 from profiles p where p.id=auth.uid() and p.role='parent')));
-- Replace recursive policy with a definer role helper.
create function public.is_parent() returns boolean language sql stable security definer set search_path=public as $$ select coalesce((select role='parent' from profiles where id=auth.uid()),false) $$;
drop policy read_profiles on profiles;
create policy read_profiles on profiles for select to authenticated using(id=auth.uid() or (family_id=my_family() and is_parent()));
create policy read_students on student_profiles for select to authenticated using(can_access(id));
create policy read_invites on invites for select to authenticated using(family_id=my_family() and is_parent());
create policy read_settings on settings for select to authenticated using(family_id=my_family());
create policy read_rewards on rewards for select to authenticated using(family_id=my_family());
-- No direct write policies: clients cannot forge rewards, family IDs or ledgers.
create function public.register_account(display_name text, invite_code uuid default null) returns void language plpgsql security definer set search_path=public as $$
declare f uuid; s student_profiles; begin
if auth.uid() is null or exists(select 1 from profiles where id=auth.uid()) then raise exception 'Kayıt yapılamadı'; end if;
if length(trim(display_name)) not between 1 and 80 then raise exception 'Ad gerekli'; end if;
if invite_code is null then
insert into families(name) values('Ailem') returning id into f;
insert into profiles values(auth.uid(),f,'parent',display_name,now());
insert into settings(family_id) values(f);
else
select sp.* into s from invites i join student_profiles sp on sp.id=i.student_id where i.code=invite_code for update of sp;
if s.id is null or s.user_id is not null then raise exception 'Davet geçersiz'; end if;
insert into profiles values(auth.uid(),s.family_id,'student',display_name,now());
update student_profiles set user_id=auth.uid(),display_name=register_account.display_name where id=s.id;
delete from invites where code=invite_code;
end if; end $$;
create function public.wallet(s uuid, c text) returns bigint language sql stable security definer set search_path=public as $$ select coalesce(sum(amount),0) from transactions where student_id=s and currency=c and can_access(s) $$;
-- One lock per student serializes ALL balance-changing operations (BR-002/013).
create function public.perform_action(action text, student uuid, payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public as $$
declare p profiles; t tasks; c task_completions; r rewards; q reward_requests; b study_blocks; ss study_sessions; cfg settings; entity uuid; seconds int; day date := (now() at time zone 'Europe/Istanbul')::date; occurrence date; amount int; begin
select * into p from profiles where id=auth.uid();
if p.id is null then raise exception 'Oturum gerekli'; end if;
if action='create_student' then
if p.role<>'parent' then raise exception 'Ebeveyn yetkisi gerekli'; end if;
insert into student_profiles(family_id,display_name) values(p.family_id,coalesce(nullif(payload->>'title',''),'Öğrenci')) returning id into entity;
insert into invites(student_id,family_id) values(entity,p.family_id);
return jsonb_build_object('id',entity);
end if;
if not can_access(student) then raise exception 'Erişim reddedildi'; end if;
perform 1 from student_profiles where id=student for update;
select * into cfg from settings where family_id=p.family_id;
if action in ('create_block','create_reward','create_event','adjust','approve','reject','settings','archive','edit_task','edit_block','delete_block','edit_reward','archive_reward') and p.role<>'parent' then raise exception 'Ebeveyn yetkisi gerekli'; end if;
if action='create_task' then
if payload->>'category'='HOMEWORK' and nullif(payload->>'due_at','') is null then raise exception 'Ödev teslim tarihi gerekli'; end if;
if p.role='student' and payload->>'category'='HOMEWORK' then raise exception 'Ödev oluşturmak için ebeveyn yetkisi gerekli'; end if;
insert into tasks(student_id,created_by,category,source,title,subject,active_date,due_at,recurrence_rule,weight,xp_reward,coin_reward,estimated_minutes,priority)
values(student,p.id,payload->>'category',case when p.role='parent' then 'PARENT_CREATED' else 'STUDENT_CREATED' end,payload->>'title',payload->>'subject',coalesce((payload->>'date')::date,day),(nullif(payload->>'due_at',''))::timestamptz,nullif(payload->>'recurrence',''),coalesce((payload->>'weight')::numeric,1),case when p.role='parent' then coalesce((payload->>'xp')::int,0) else cfg.student_created_task_xp end,case when p.role='parent' then coalesce((payload->>'coin')::int,0) else 0 end,nullif(payload->>'minutes','')::int,coalesce(payload->>'priority','MEDIUM'));
elsif action='complete' then
select * into t from tasks where id=(payload->>'id')::uuid and student_id=student and active;
occurrence:=coalesce((payload->>'date')::date,day);
if t.id is null or occurrence<>day or t.active_date>day then raise exception 'Görev bugün tamamlanamaz'; end if;
if t.recurrence_rule is null then occurrence:=t.active_date; end if;
insert into task_completions(task_id,student_id,occurrence_key,completed_by) values(t.id,student,occurrence,p.id) on conflict (task_id,student_id,occurrence_key) where reversed_at is null do nothing returning * into c;
if c.id is null then return '{"duplicate":true}'; end if;
insert into transactions(student_id,currency,amount,transaction_type,description,source_type,source_id,created_by) values(student,'XP',t.xp_reward,'EARN',t.title,'completion',c.id,p.id),(student,'COIN',t.coin_reward,'EARN',t.title,'completion',c.id,p.id);
elsif action='reverse' then
select * into c from task_completions where id=(payload->>'id')::uuid and student_id=student;
if c.id is null then raise exception 'Tamamlama bulunamadı'; end if;
if c.reversed_at is not null then return '{"duplicate":true}'; end if;
select coalesce(sum(x.amount),0) into amount from transactions x where x.source_id=c.id and x.currency='COIN';
if wallet(student,'COIN')<amount then raise exception 'Coin harcandığı için geri alınamaz'; end if;
insert into transactions(student_id,currency,amount,transaction_type,description,source_type,source_id,created_by) select student,currency,-x.amount,'REVERSAL','Tamamlama geri alındı','completion',c.id,p.id from transactions x where x.source_id=c.id and x.transaction_type='EARN';
update task_completions set reversed_at=now() where id=c.id;
elsif action='create_block' then
if nullif(payload->>'linked_task_id','') is not null and not exists(select 1 from tasks where id=(payload->>'linked_task_id')::uuid and student_id=student) then raise exception 'Görev bulunamadı'; end if;
insert into study_blocks(student_id,title,subject,date,order_index,start_time,planned_minutes,linked_task_id,xp_reward,coin_reward,created_by) values(student,payload->>'title',payload->>'subject',(payload->>'date')::date,coalesce((payload->>'order_index')::int,0),nullif(payload->>'start_time','')::time,(payload->>'minutes')::int,nullif(payload->>'linked_task_id','')::uuid,coalesce((payload->>'xp')::int,10),coalesce((payload->>'coin')::int,0),p.id);
elsif action='start' then
if p.role<>'student' then raise exception 'Öğrenci oturumu gerekli'; end if;
select * into b from study_blocks where id=(payload->>'id')::uuid and student_id=student;
if b.id is null or b.status in ('COMPLETED','SKIPPED') then raise exception 'Blok başlatılamaz'; end if;
insert into study_sessions(student_id,study_block_id) values(student,b.id);
update study_blocks set status='IN_PROGRESS',updated_at=now() where id=b.id;
elsif action in ('pause','resume','finish') then
if p.role<>'student' then raise exception 'Öğrenci oturumu gerekli'; end if;
select * into ss from study_sessions where id=(payload->>'id')::uuid and student_id=student for update;
if ss.id is null then raise exception 'Oturum bulunamadı'; end if;
if ss.status='COMPLETED' then return '{"duplicate":true}'; end if;
seconds:=ss.active_seconds+case when ss.status='RUNNING' then greatest(0,floor(extract(epoch from now()-ss.last_resumed_at))::int) else 0 end;
if action='pause' and ss.status='RUNNING' then update study_sessions set active_seconds=seconds,status='PAUSED',last_resumed_at=null where id=ss.id;
elsif action='resume' and ss.status='PAUSED' then update study_sessions set status='RUNNING',last_resumed_at=now() where id=ss.id;
elsif action='finish' then
if seconds<cfg.minimum_study_session_seconds then raise exception 'En az % dakika aktif çalışmalısın',cfg.minimum_study_session_seconds/60; end if;
update study_sessions set active_seconds=seconds,status='COMPLETED',ended_at=now(),last_resumed_at=null,questions_solved=(payload->>'questions')::int where id=ss.id;
select * into b from study_blocks where id=ss.study_block_id;
update study_blocks set status='COMPLETED',updated_at=now() where id=b.id;
insert into transactions(student_id,currency,amount,transaction_type,description,source_type,source_id,created_by) values(student,'XP',b.xp_reward,'EARN',b.title,'session',ss.id,p.id),(student,'COIN',b.coin_reward,'EARN',b.title,'session',ss.id,p.id);
return jsonb_build_object('seconds',seconds,'xp',b.xp_reward,'coin',b.coin_reward);
end if;
elsif action='create_reward' then insert into rewards(family_id,name,coin_cost,description,created_by) values(p.family_id,payload->>'title',(payload->>'coin')::int,payload->>'description',p.id);
elsif action='request' then
if p.role<>'student' then raise exception 'Öğrenci yetkisi gerekli'; end if;
select * into r from rewards where id=(payload->>'id')::uuid and family_id=p.family_id and active;
if r.id is null or wallet(student,'COIN')<r.coin_cost then raise exception 'Ödül için yeterli Coin yok'; end if;
insert into reward_requests(reward_id,student_id,coin_cost_snapshot) values(r.id,student,r.coin_cost);
elsif action in ('approve','reject') then
select * into q from reward_requests where id=(payload->>'id')::uuid and student_id=student for update;
if q.id is null then raise exception 'Talep bulunamadı'; end if;
if q.status<>'PENDING' then return '{"duplicate":true}'; end if;
if action='approve' then
if wallet(student,'COIN')<q.coin_cost_snapshot then raise exception 'Onay anında yeterli Coin yok'; end if;
insert into transactions(student_id,currency,amount,transaction_type,description,source_type,source_id,created_by) values(student,'COIN',-q.coin_cost_snapshot,'SPEND','Ödül onaylandı','reward_request',q.id,p.id);
end if;
update reward_requests set status=case when action='approve' then 'APPROVED' else 'REJECTED' end,reviewed_at=now(),reviewed_by=p.id where id=q.id;
elsif action='adjust' then
if length(trim(coalesce(payload->>'reason','')))<3 then raise exception 'Düzeltme açıklaması gerekli'; end if;
amount:=(payload->>'amount')::int;
if payload->>'currency' not in ('XP','COIN') or wallet(student,payload->>'currency')+amount<0 then raise exception 'Geçersiz bakiye'; end if;
insert into transactions(student_id,currency,amount,transaction_type,description,source_type,source_id,created_by) values(student,payload->>'currency',amount,'ADJUSTMENT',payload->>'reason','adjustment',gen_random_uuid(),p.id);
elsif action='create_event' then insert into calendar_events(student_id,title,type,starts_at,created_by) values(student,payload->>'title',payload->>'type',(payload->>'starts_at')::timestamptz,p.id);
elsif action='light_day' then
if (select count(*) from light_days where student_id=student and date>=date_trunc('week',day)::date and date<date_trunc('week',day)::date+7)>=cfg.max_light_days_per_week then raise exception 'Haftalık hafif gün hakkı doldu'; end if;
insert into light_days values(student,day) on conflict do nothing;
elsif action='edit_task' then
update tasks set title=payload->>'title',xp_reward=(payload->>'xp')::int,coin_reward=(payload->>'coin')::int,updated_at=now() where id=(payload->>'id')::uuid and student_id=student;
elsif action='edit_block' then
update study_blocks set title=payload->>'title',date=(payload->>'date')::date,planned_minutes=(payload->>'minutes')::int,order_index=coalesce((payload->>'order_index')::int,0),start_time=nullif(payload->>'start_time','')::time,updated_at=now() where id=(payload->>'id')::uuid and student_id=student and status='PLANNED';
elsif action='delete_block' then
update study_blocks set status='SKIPPED',updated_at=now() where id=(payload->>'id')::uuid and student_id=student and status='PLANNED';
elsif action='edit_reward' then
update rewards set name=payload->>'title',coin_cost=(payload->>'coin')::int,updated_at=now() where id=(payload->>'id')::uuid and family_id=p.family_id;
elsif action='archive_reward' then
update rewards set active=false,updated_at=now() where id=(payload->>'id')::uuid and family_id=p.family_id;
elsif action='archive' then update tasks set active=false,updated_at=now() where id=(payload->>'id')::uuid and student_id=student;
elsif action='settings' then update settings set minimum_study_session_seconds=(payload->>'minimum_seconds')::int,streak_threshold_percent=(payload->>'threshold')::int where family_id=p.family_id;
else raise exception 'Bilinmeyen işlem'; end if;
return '{"ok":true}'; end $$;
revoke all on function register_account(text,uuid),perform_action(text,uuid,jsonb) from public;
grant execute on function register_account(text,uuid),perform_action(text,uuid,jsonb) to authenticated;
-- Table privileges are explicit; RLS blocks direct writes even with authenticated grants.
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
