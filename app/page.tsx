import { db, configured } from "@/lib/supabase";
import { act, authenticate, logout, registerProfile } from "./actions";
import {
  today,
  level,
  balance,
  progress,
  qualified,
  streak,
  overdue,
  labels,
  thresholds,
} from "@/lib/domain";
import Timer from "./timer";
import {
  BookOpen,
  LayoutDashboard,
  CalendarDays,
  Gift,
  GraduationCap,
  Flame,
  Coins,
  ArrowUpRight,
  Check,
  Clock,
  Plus,
  LogOut,
  Sparkles,
  Target,
} from "lucide-react";
type Row = Record<string, any>;
const tabs = [
  ["today", "Bugün", LayoutDashboard],
  ["tasks", "Görevler", Check],
  ["homework", "Ödevler", BookOpen],
  ["plan", "Haftalık plan", CalendarDays],
  ["calendar", "Takvim", CalendarDays],
  ["rewards", "Ödül mağazası", Gift],
  ["profile", "Gelişimim", GraduationCap],
] as const;
function Field({
  name,
  label,
  type = "text",
  value,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  value?: string | number;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        min={type === "number" ? "0" : undefined}
      />
    </label>
  );
}
function Action({
  action,
  student,
  id,
  children,
  ...props
}: {
  action: string;
  student: string;
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form action={act} {...props}>
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="student" value={student} />
      {id && <input type="hidden" name="id" value={id} />}
      {children}
    </form>
  );
}
function Notice({ params }: { params: Row }) {
  return (
    <>
      {params.error && (
        <p className="notice error" role="alert">
          {params.error}
        </p>
      )}
      {params.ok && (
        <p className="notice" role="status">
          {params.ok}
        </p>
      )}
    </>
  );
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Row>;
}) {
  const params = await searchParams;
  const day = today();
  if (!configured())
    return (
      <main className="auth">
        <div className="brand">
          <GraduationCap /> Studycoach
        </div>
        <h1>Çalışma alanını bağlayalım.</h1>
        <p>
          Supabase bağlantısı henüz yapılandırılmadı. README adımlarını izleyip
          .env.local dosyasını oluştur.
        </p>
      </main>
    );
  const client = await db();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return (
      <main className="auth">
        <div className="brand">
          <GraduationCap /> Studycoach
        </div>
        <span className="eyebrow">HER GÜN BİR ADIM İLERİ</span>
        <h1>
          Küçük adımlar.
          <br />
          Büyük gelişim.
        </h1>
        <p>Planını gör, odağını bul ve emeğinin karşılığını keşfet.</p>
        <Notice params={params} />
        <form action={authenticate} className="stack">
          <Field name="email" label="E-posta" type="email" />
          <Field
            name="password"
            label="Parola (en az 8 karakter)"
            type="password"
          />
          <button name="mode" value="login">
            Giriş yap <ArrowUpRight size={18} />
          </button>
          <details>
            <summary>Yeni hesap oluştur</summary>
            <Field name="name" label="Görünen ad" required={false} />
            <Field
              name="invite"
              label="Öğrenci davet kodu (ebeveyn için boş bırak)"
              required={false}
            />
            <button name="mode" value="signup">
              Hesap oluştur
            </button>
            <small>E-posta onayı istenirse onayladıktan sonra giriş yap.</small>
          </details>
        </form>
      </main>
    );
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw new Error("Profil yüklenemedi");
  if (!profile)
    return (
      <main className="auth">
        <h1>Profilini tamamla</h1>
        <Notice params={params} />
        <form action={registerProfile}>
          <Field name="name" label="Görünen ad" />
          <Field
            name="invite"
            label="Öğrenci davet kodu (ebeveyn için boş)"
            required={false}
          />
          <button>Profili oluştur</button>
        </form>
        <form action={logout}>
          <button>Çıkış yap</button>
        </form>
      </main>
    );
  let week = new Date(day + "T12:00:00Z");
  week.setUTCDate(week.getUTCDate() - ((week.getUTCDay() + 6) % 7));
  if (
    typeof params.week === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(params.week) &&
    !isNaN(Date.parse(params.week))
  )
    week = new Date(params.week + "T12:00:00Z");
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    new Date(week.getTime() + i * 86400000).toISOString().slice(0, 10),
  );
  const prevWeek = new Date(week.getTime() - 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  const nextWeek = new Date(week.getTime() + 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  const parent = profile.role === "parent";
  const { data: students, error: studentError } = await client
    .from("student_profiles")
    .select("*")
    .order("display_name");
  if (studentError) throw new Error("Öğrenciler yüklenemedi");
  const student =
    students?.find((s) => s.id === params.student) || students?.[0];
  const sid = student?.id || "";
  const tab = String(params.tab || "today");
  const tables = [
    "tasks",
    "task_completions",
    "study_blocks",
    "study_sessions",
    "transactions",
    "reward_requests",
    "calendar_events",
    "light_days",
  ];
  const results = sid
    ? await Promise.all(
        tables.map((t) => client.from(t).select("*").eq("student_id", sid)),
      )
    : [];
  if (results.some((r) => r.error)) throw new Error("Veriler yüklenemedi");
  const [
    tasks = [],
    completions = [],
    blocks = [],
    sessions = [],
    transactions = [],
    requests = [],
    events = [],
    lightDays = [],
  ] = results.map((r) => (r.data || []) as Row[]);
  const { data: rewards, error: rewardError } = await client
    .from("rewards")
    .select("*")
    .eq("family_id", profile.family_id);
  if (rewardError) throw new Error("Ödüller yüklenemedi");
  const { data: cfg } = await client
    .from("settings")
    .select("*")
    .eq("family_id", profile.family_id)
    .single();
  const { data: invites } = parent
    ? await client.from("invites").select("*")
    : { data: [] };
  const completionFor = (t: Row, date = day) =>
    completions.find(
      (c) =>
        c.task_id === t.id &&
        !c.reversed_at &&
        (t.recurrence_rule === "DAILY" ? c.occurrence_key === date : true),
    );
  const activeAt = (t: Row, date: string) =>
    (t.active || today(new Date(t.updated_at)) > date) &&
    t.active_date <= date &&
    (t.recurrence_rule === "DAILY" ||
      t.active_date === date ||
      t.category === "HOMEWORK") &&
    !(
      t.category === "HOMEWORK" &&
      completionFor(t, date) &&
      today(new Date(completionFor(t, date)!.completed_at)) < date
    );
  const currentTasks = tasks.filter((t) => activeAt(t, day));
  const done = new Set(
    currentTasks.filter((t) => completionFor(t)).map((t) => t.id),
  );
  const percent = progress(
    currentTasks as { weight: number }[],
    done,
    currentTasks.map((t) => t.id),
  );
  const xp = balance(
    transactions.filter((t) => t.currency === "XP") as { amount: number }[],
  );
  const coin = balance(
    transactions.filter((t) => t.currency === "COIN") as { amount: number }[],
  );
  const lvl = level(xp);
  const nextXP = thresholds[lvl];
  const first = tasks.reduce(
    (d, t) => (t.active_date < d ? t.active_date : d),
    day,
  );
  const history = [];
  for (let date = first; date <= day;) {
    const active = tasks.filter((t) => activeAt(t, date));
    const completed = new Set(
      active
        .filter(
          (t) =>
            completionFor(t, date) &&
            today(new Date(completionFor(t, date)!.completed_at)) <= date,
        )
        .map((t) => t.id),
    );
    const p = progress(
      active as { weight: number }[],
      completed,
      active.map((t) => t.id),
    );
    history.push({
      date,
      qualified:
        active.length > 0 &&
        qualified(
          p,
          lightDays.some((d) => d.date === date),
          cfg?.streak_threshold_percent,
          cfg?.light_day_threshold_percent,
        ),
    });
    const d = new Date(date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    date = d.toISOString().slice(0, 10);
    if (history.length > 3660) break;
  }
  const series = streak(history, day);
  const todayBlocks = blocks
    .filter((b) => b.date === day)
    .sort((a, b) => a.order_index - b.order_index);
  const activeSession = sessions.find((s) => s.status !== "COMPLETED");
  const href = (name: string) => `/?tab=${name}&student=${sid}`;
  const taskCard = (t: Row) => {
    const completion = completionFor(t);
    return (
      <article className={"task " + (completion ? "done" : "")} key={t.id}>
        <span className={"task-icon " + t.category.toLowerCase()}>
          {completion ? (
            <Check size={20} />
          ) : t.category === "HABIT" ? (
            <Sparkles size={20} />
          ) : (
            <BookOpen size={20} />
          )}
        </span>
        <div className="grow">
          <span className="meta">
            {labels[t.category]} {t.subject && `· ${t.subject}`}
          </span>
          <h3>{t.title}</h3>
          {parent && (
            <details>
              <summary className="meta">Düzenle</summary>
              <Action
                action="edit_task"
                student={sid}
                id={t.id}
                className="fields"
              >
                <Field name="title" label="Başlık" value={t.title} />
                <Field name="xp" label="XP" type="number" value={t.xp_reward} />
                <Field
                  name="coin"
                  label="Coin"
                  type="number"
                  value={t.coin_reward}
                />
                <button>Kaydet</button>
              </Action>
              <Action action="archive" student={sid} id={t.id}>
                <button className="secondary">Görevi arşivle</button>
              </Action>
            </details>
          )}
          <small>
            {t.due_at
              ? new Date(t.due_at).toLocaleString("tr-TR", {
                  timeZone: "Europe/Istanbul",
                  dateStyle: "short",
                  timeStyle: "short",
                })
              : "Bugünkü hedefin"}{" "}
            {overdue(t.due_at, !!completion) && (
              <b className="overdue"> · Geciken</b>
            )}
          </small>
        </div>
        <div className="earn">
          <b>+{t.xp_reward} XP</b>
          <small>+{t.coin_reward} Coin</small>
        </div>
        <Action
          action={completion ? "reverse" : "complete"}
          student={sid}
          id={completion?.id || t.id}
        >
          <button
            className="icon-button"
            aria-label={
              completion ? `${t.title}: geri al` : `${t.title}: tamamla`
            }
          >
            {completion ? <Check size={18} /> : <Plus size={18} />}
          </button>
        </Action>
      </article>
    );
  };
  const addTask = (
    <details className="card add">
      <summary>
        <Plus size={18} /> Yeni görev / ödev ekle
      </summary>
      <Action action="create_task" student={sid} className="fields">
        <Field name="title" label="Başlık" />
        <label>
          Tür
          <select name="category">
            <option value="STUDY">Çalışma</option>
            {parent && <option value="HOMEWORK">Ödev</option>}
            <option value="HABIT">Alışkanlık</option>
          </select>
        </label>
        <Field name="subject" label="Ders" required={false} />
        <Field name="date" label="Aktif tarih" type="date" value={day} />
        <Field
          name="due_at"
          label="Teslim tarihi"
          type="datetime-local"
          required={false}
        />
        <label>
          Tekrar
          <select name="recurrence">
            <option value="">Bir kez</option>
            <option value="DAILY">Her gün</option>
          </select>
        </label>
        <Field name="weight" label="Ağırlık" type="number" value="1" />
        <Field
          name="minutes"
          label="Tahmini dakika"
          type="number"
          required={false}
        />
        {parent ? (
          <>
            <Field name="xp" label="XP" type="number" value="20" />
            <Field name="coin" label="Coin" type="number" value="10" />
          </>
        ) : (
          <>
            <input type="hidden" name="xp" value="5" />
            <input type="hidden" name="coin" value="0" />
            <p>
              Kendi görevlerin +{cfg?.student_created_task_xp || 5} XP
              kazandırır; Coin ödülünü ebeveynin belirler.
            </p>
          </>
        )}
        <label>
          Öncelik
          <select name="priority">
            <option value="MEDIUM">Normal</option>
            <option value="HIGH">Yüksek</option>
            <option value="LOW">Düşük</option>
          </select>
        </label>
        <button>Görevi kaydet</button>
      </Action>
    </details>
  );
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href={href("today")}>
          <span className="brand-icon">
            <GraduationCap size={25} />
          </span>{" "}
          Studycoach<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">
          {parent ? "AİLE ÇALIŞMA ALANI" : "KİŞİSEL ÇALIŞMA ALANIN"}
        </div>
        <nav>
          {tabs.map(([key, title, Icon]) => (
            <a
              key={key}
              className={tab === key ? "selected" : ""}
              href={href(key)}
            >
              <Icon size={20} />
              {title}
              {key === "today" && <span className="nav-dot" />}
            </a>
          ))}
          {parent && (
            <a
              href={href("parent")}
              className={tab === "parent" ? "selected" : ""}
            >
              <Target size={20} />
              Ebeveyn paneli
            </a>
          )}
        </nav>
        <div className="sidebar-note">
          <span>🌱</span>
          <b>Her gün biraz daha iyi.</b>
          <p>Önemli olan mükemmel olmak değil, devam etmek.</p>
        </div>
        <div className="account">
          <span className="avatar">{profile.display_name[0]}</span>
          <div>
            <b>{profile.display_name}</b>
            <small>{parent ? "Ebeveyn hesabı" : "Öğrenci hesabı"}</small>
          </div>
          <form action={logout}>
            <button className="plain" aria-label="Çıkış yap">
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <span className="breadcrumb">Çalışma alanım</span>
            <span className="divider">/</span>
            <b>{tabs.find((t) => t[0] === tab)?.[1] || "Ebeveyn paneli"}</b>
          </div>
          <span className="date">
            {new Date().toLocaleDateString("tr-TR", {
              timeZone: "Europe/Istanbul",
              day: "numeric",
              month: "long",
              weekday: "long",
            })}
          </span>
          <form action={logout} className="mobile-logout">
            <button className="plain" aria-label="Çıkış yap">
              <LogOut size={18} />
            </button>
          </form>
        </header>
        <div className="content">
          <Notice params={params} />
          {parent && students && students.length > 1 && (
            <div className="chips">
              {students.map((s) => (
                <a
                  className={s.id === sid ? "active" : ""}
                  key={s.id}
                  href={`/?student=${s.id}&tab=${tab}`}
                >
                  {s.display_name}
                </a>
              ))}
            </div>
          )}
          {!student ? (
            <section className="card">
              <h1>Birlikte başlayalım.</h1>
              <p>
                Öğrenci profili oluştur; ardından davet koduyla ayrı bir öğrenci
                hesabı aç.
              </p>
              <Action action="create_student" student="">
                <Field name="title" label="Öğrencinin görünen adı" />
                <button>Öğrenci oluştur</button>
              </Action>
            </section>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">KÜÇÜK ADIMLAR, BÜYÜK GELİŞİM</span>
                  <h1>
                    {tab === "today"
                      ? `Merhaba, ${student.display_name} ☀️`
                      : tabs.find((t) => t[0] === tab)?.[1] || "Ebeveyn paneli"}
                  </h1>
                  <p>
                    {tab === "today"
                      ? "Bugün kendin için güzel bir şey yap. Her adımın değerli."
                      : "Planla, takip et ve gelişiminin tadını çıkar."}
                  </p>
                </div>
                <span className="grade">
                  {student.current_grade}. sınıf · Öğrenme yolculuğun
                </span>
              </div>
              {(tab === "today" || tab === "profile" || tab === "parent") && (
                <div className="stats">
                  <article className="card stat">
                    <span className="stat-icon green">
                      <GraduationCap />
                    </span>
                    <div>
                      <span>Toplam deneyim</span>
                      <strong>
                        {xp} <small>XP</small>
                      </strong>
                      <small>
                        Seviye {lvl}
                        {nextXP
                          ? ` · Sonraki seviye ${nextXP} XP`
                          : " · En yüksek MVP seviyesi"}
                      </small>
                    </div>
                  </article>
                  <article className="card stat">
                    <span className="stat-icon gold">
                      <Coins />
                    </span>
                    <div>
                      <span>Coin cüzdanın</span>
                      <strong>
                        {coin} <small>Coin</small>
                      </strong>
                      <small>Emeklerin ödüle dönüşsün</small>
                    </div>
                  </article>
                  <article className="card stat">
                    <span className="stat-icon coral">
                      <Flame />
                    </span>
                    <div>
                      <span>Çalışma serin</span>
                      <strong>
                        {series.current} <small>gün</small>
                      </strong>
                      <small>En uzun serin: {series.longest} gün</small>
                    </div>
                  </article>
                </div>
              )}
              {tab === "today" && (
                <>
                  <div className="dashboard-grid">
                    <section className="hero">
                      <span className="pill">BUGÜNÜN HEDEFİ</span>
                      <h2>
                        Bir adım at,
                        <br />
                        <em>kendini geliştir.</em>
                      </h2>
                      <p>
                        {done.size === currentTasks.length &&
                        currentTasks.length
                          ? "Bugünkü görevlerini tamamladın. Harika iş!"
                          : `${currentTasks.length} görevden ${done.size} tanesini tamamladın. Kendi hızında devam et.`}
                      </p>
                      <div className="progress-track">
                        <span style={{ width: `${percent}%` }} />
                      </div>
                      <div className="hero-bottom">
                        <b>%{percent} tamamlandı</b>
                        <span>
                          {done.size} / {currentTasks.length} görev
                        </span>
                      </div>
                      <div className="hero-deco">✦</div>
                    </section>
                    <section className="card focus">
                      <span className="eyebrow">
                        <Clock size={16} /> ODAK ZAMANI
                      </span>
                      <h2>Sıradaki küçük adımın</h2>
                      {todayBlocks.find((b) => b.status !== "COMPLETED") ? (
                        <>
                          <h3>
                            {
                              todayBlocks.find((b) => b.status !== "COMPLETED")!
                                .title
                            }
                          </h3>
                          <p>
                            {
                              todayBlocks.find((b) => b.status !== "COMPLETED")!
                                .planned_minutes
                            }{" "}
                            dakika · Sessiz bir alan, tek bir hedef.
                          </p>
                          <a className="button" href={href("plan")}>
                            Çalışmaya başla <ArrowUpRight size={18} />
                          </a>
                        </>
                      ) : (
                        <>
                          <p>Bugün için henüz çalışma bloğu yok.</p>
                          <a href={href("plan")} className="button">
                            Planını gör <ArrowUpRight size={18} />
                          </a>
                        </>
                      )}
                    </section>
                  </div>
                  <div className="section-title">
                    <h2>
                      Bugünün görevleri <span>{currentTasks.length}</span>
                    </h2>
                    <a href={href("tasks")}>
                      Tüm görevler <ArrowUpRight size={16} />
                    </a>
                  </div>
                  <section className="card task-list">
                    {currentTasks.length ? (
                      currentTasks.map(taskCard)
                    ) : (
                      <p className="empty">
                        Bugün için henüz görev yok. Planına yeni bir görev
                        ekleyebilirsin.
                      </p>
                    )}
                  </section>
                  <div className="section-title">
                    <h2>Yaklaşan işler</h2>
                    <a href={href("calendar")}>Takvimi gör →</a>
                  </div>
                  <section className="card">
                    {[
                      ...tasks
                        .filter(
                          (t) =>
                            t.due_at &&
                            !completionFor(t) &&
                            t.due_at >= new Date().toISOString(),
                        )
                        .map((t) => ({
                          id: t.id,
                          title: t.title,
                          when: t.due_at,
                        })),
                      ...events.map((e) => ({
                        id: e.id,
                        title: e.title,
                        when: e.starts_at,
                      })),
                    ]
                      .filter(
                        (e) =>
                          e.when <
                          new Date(Date.now() + 7 * 86400000).toISOString(),
                      )
                      .sort((a, b) => a.when.localeCompare(b.when))
                      .map((e) => (
                        <p key={e.id}>
                          {e.title}{" "}
                          <small>
                            ·{" "}
                            {new Date(e.when).toLocaleDateString("tr-TR", {
                              timeZone: "Europe/Istanbul",
                            })}
                          </small>
                        </p>
                      ))}
                    <small>
                      Önümüzdeki 7 günün ödev ve etkinlikleri burada görünür.
                    </small>
                  </section>
                </>
              )}
              {(tab === "tasks" || tab === "homework") && (
                <>
                  {addTask}
                  <div className="chips">
                    {(tab === "tasks"
                      ? ["Tümü", "Çalışma", "Alışkanlık", "Ödev", "Tamamlanan"]
                      : [
                          "Tümü",
                          "Bugün",
                          "Yarın",
                          "Bu hafta",
                          "Geciken",
                          "Tamamlanan",
                        ]
                    ).map((f) => (
                      <a
                        key={f}
                        className={
                          (params.filter || "Tümü") === f ? "active" : ""
                        }
                        href={href(tab) + "&filter=" + encodeURIComponent(f)}
                      >
                        {f}
                      </a>
                    ))}
                  </div>
                  <section className="card task-list">
                    {tasks
                      .filter(
                        (t) =>
                          t.active &&
                          (tab !== "homework" || t.category === "HOMEWORK"),
                      )
                      .filter((t) => {
                        const f = params.filter;
                        if (!f || f === "Tümü") return true;
                        if (f === "Tamamlanan") return !!completionFor(t);
                        if (f === "Geciken")
                          return overdue(t.due_at, !!completionFor(t));
                        if (f === "Çalışma") return t.category === "STUDY";
                        if (f === "Alışkanlık") return t.category === "HABIT";
                        if (f === "Ödev") return t.category === "HOMEWORK";
                        const d = t.due_at
                          ? today(new Date(t.due_at))
                          : t.active_date;
                        if (f === "Bugün") return d === day;
                        if (f === "Yarın")
                          return d === today(new Date(Date.now() + 86400000));
                        if (f === "Bu hafta") {
                          const monday = new Date(day + "T12:00:00Z");
                          monday.setUTCDate(
                            monday.getUTCDate() -
                              ((monday.getUTCDay() + 6) % 7),
                          );
                          return (
                            d >= monday.toISOString().slice(0, 10) &&
                            d < today(new Date(monday.getTime() + 7 * 86400000))
                          );
                        }
                        return true;
                      })
                      .map(taskCard)}
                    {!tasks.length && (
                      <p className="empty">
                        Henüz görev yok. İlk görevini ekleyerek başla.
                      </p>
                    )}
                  </section>
                </>
              )}
              {tab === "plan" && (
                <>
                  <div className="chips">
                    <a href={href("plan") + "&week=" + prevWeek}>
                      ← Önceki hafta
                    </a>
                    <span>
                      {weekDates[0]} — {weekDates[6]}
                    </span>
                    <a href={href("plan") + "&week=" + nextWeek}>
                      Sonraki hafta →
                    </a>
                  </div>
                  {parent && (
                    <details className="card add">
                      <summary>
                        <Plus size={18} /> Çalışma bloğu ekle
                      </summary>
                      <Action
                        action="create_block"
                        student={sid}
                        className="fields"
                      >
                        <Field name="title" label="Başlık" />
                        <Field name="subject" label="Ders" required={false} />
                        <Field
                          name="date"
                          label="Tarih"
                          type="date"
                          value={day}
                        />
                        <Field
                          name="minutes"
                          label="Planlanan dakika"
                          type="number"
                          value="25"
                        />
                        <Field name="xp" label="XP" type="number" value="10" />
                        <Field
                          name="coin"
                          label="Coin"
                          type="number"
                          value="0"
                        />
                        <Field
                          name="order_index"
                          label="Sıra"
                          type="number"
                          value="0"
                        />
                        <Field
                          name="start_time"
                          label="Başlangıç saati (isteğe bağlı)"
                          type="time"
                          required={false}
                        />
                        <label>
                          Bağlı görev (isteğe bağlı)
                          <select name="linked_task_id">
                            <option value="">Bağlantı yok</option>
                            {tasks.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button>Bloğu kaydet</button>
                      </Action>
                    </details>
                  )}
                  {activeSession && !parent && (
                    <section className="card session">
                      <span className="eyebrow">
                        ODAK OTURUMUN · {labels[activeSession.status]}
                      </span>
                      <h2>
                        {
                          blocks.find(
                            (b) => b.id === activeSession.study_block_id,
                          )?.title
                        }
                      </h2>
                      <Timer
                        seconds={activeSession.active_seconds}
                        running={activeSession.status === "RUNNING"}
                        resumed={activeSession.last_resumed_at}
                      />
                      <div className="row">
                        <Action
                          action={
                            activeSession.status === "RUNNING"
                              ? "pause"
                              : "resume"
                          }
                          student={sid}
                          id={activeSession.id}
                        >
                          <button className="secondary">
                            {activeSession.status === "RUNNING"
                              ? "Duraklat"
                              : "Devam et"}
                          </button>
                        </Action>
                        <Action
                          action="finish"
                          student={sid}
                          id={activeSession.id}
                        >
                          <Field
                            name="questions"
                            label="Çözülen soru"
                            type="number"
                            value="0"
                          />
                          <button>Oturumu bitir</button>
                        </Action>
                      </div>
                      <small>
                        En az {(cfg?.minimum_study_session_seconds || 300) / 60}{" "}
                        dakika aktif çalışma gereklidir. Sayfa kapansa da oturum
                        korunur.
                      </small>
                    </section>
                  )}
                  <div className="week-list">
                    {weekDates.map((date) => (
                      <section className="card" key={date}>
                        <h2>
                          {new Date(date + "T12:00:00Z").toLocaleDateString(
                            "tr-TR",
                            { weekday: "long", day: "numeric", month: "long" },
                          )}
                        </h2>
                        {blocks
                          .filter((b) => b.date === date)
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((b) => (
                            <article className="task" key={b.id}>
                              <Clock size={22} />
                              <div className="grow">
                                <h3>{b.title}</h3>
                                <small>
                                  {b.subject} · {b.planned_minutes} dk ·{" "}
                                  {labels[b.status]} · +{b.xp_reward} XP / +
                                  {b.coin_reward} Coin
                                </small>
                                {parent && b.status === "PLANNED" && (
                                  <details>
                                    <summary>Düzenle</summary>
                                    <Action
                                      action="edit_block"
                                      student={sid}
                                      id={b.id}
                                      className="fields"
                                    >
                                      <Field
                                        name="title"
                                        label="Başlık"
                                        value={b.title}
                                      />
                                      <Field
                                        name="date"
                                        label="Tarih"
                                        type="date"
                                        value={b.date}
                                      />
                                      <Field
                                        name="minutes"
                                        label="Dakika"
                                        type="number"
                                        value={b.planned_minutes}
                                      />
                                      <Field
                                        name="order_index"
                                        label="Sıra"
                                        type="number"
                                        value={b.order_index}
                                      />
                                      <Field
                                        name="start_time"
                                        label="Saat"
                                        type="time"
                                        value={b.start_time || ""}
                                        required={false}
                                      />
                                      <button>Kaydet</button>
                                    </Action>
                                    <Action
                                      action="delete_block"
                                      student={sid}
                                      id={b.id}
                                    >
                                      <button className="secondary">
                                        Bloğu iptal et
                                      </button>
                                    </Action>
                                  </details>
                                )}
                              </div>
                              {!parent &&
                                !activeSession &&
                                b.status !== "COMPLETED" && (
                                  <Action
                                    action="start"
                                    student={sid}
                                    id={b.id}
                                  >
                                    <button>Başla</button>
                                  </Action>
                                )}
                            </article>
                          ))}
                      </section>
                    ))}
                  </div>
                  {!blocks.length && (
                    <p className="empty">
                      Henüz çalışma bloğu yok. Ebeveyn panelinden ilk planını
                      oluştur.
                    </p>
                  )}
                </>
              )}
              {tab === "calendar" && (
                <>
                  <div className="chips">
                    <a href={href("calendar") + "&week=" + prevWeek}>
                      ← Önceki hafta
                    </a>
                    <span>
                      {weekDates[0]} — {weekDates[6]}
                    </span>
                    <a href={href("calendar") + "&week=" + nextWeek}>
                      Sonraki hafta →
                    </a>
                  </div>
                  {parent && (
                    <details className="card add">
                      <summary>
                        <Plus size={18} /> Sınav / etkinlik ekle
                      </summary>
                      <Action
                        action="create_event"
                        student={sid}
                        className="fields"
                      >
                        <Field name="title" label="Başlık" />
                        <label>
                          Tür
                          <select name="type">
                            <option value="EXAM">Sınav</option>
                            <option value="OTHER">Etkinlik</option>
                          </select>
                        </label>
                        <Field
                          name="starts_at"
                          label="Tarih ve saat"
                          type="datetime-local"
                        />
                        <button>Etkinliği kaydet</button>
                      </Action>
                    </details>
                  )}
                  <div className="calendar-week">
                    {weekDates.map((date) => (
                      <section className="card" key={date}>
                        <h2>
                          {new Date(date + "T12:00:00Z").toLocaleDateString(
                            "tr-TR",
                            {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            },
                          )}
                        </h2>
                        {[
                          ...tasks
                            .filter(
                              (t) =>
                                t.category === "HOMEWORK" &&
                                t.due_at &&
                                today(new Date(t.due_at)) === date,
                            )
                            .map((t) => ({
                              id: t.id,
                              title: t.title,
                              type: "📚 Ödev teslimi",
                            })),
                          ...blocks
                            .filter(
                              (b) => b.date === date && b.status !== "SKIPPED",
                            )
                            .map((b) => ({
                              id: b.id,
                              title: b.title,
                              type: "◷ Çalışma bloğu",
                            })),
                          ...events
                            .filter(
                              (e) => today(new Date(e.starts_at)) === date,
                            )
                            .map((e) => ({
                              id: e.id,
                              title: e.title,
                              type:
                                e.type === "EXAM" ? "✎ Sınav" : "◇ Etkinlik",
                            })),
                        ].map((e) => (
                          <article key={e.id} className="calendar-event">
                            <span className="meta">{e.type}</span>
                            <h3>{e.title}</h3>
                          </article>
                        ))}
                        <small className="calendar-end">Günün planı</small>
                      </section>
                    ))}
                  </div>
                </>
              )}
              {tab === "rewards" && (
                <>
                  <div className="notice">
                    Cüzdanın: <b>{coin} Coin</b> · Coin yalnızca ebeveyn
                    onayında harcanır.
                  </div>
                  {parent && (
                    <details className="card add">
                      <summary>
                        <Plus size={18} /> Ödül oluştur
                      </summary>
                      <Action
                        action="create_reward"
                        student={sid}
                        className="fields"
                      >
                        <Field name="title" label="Ödül adı" />
                        <Field
                          name="coin"
                          label="Coin bedeli"
                          type="number"
                          value="40"
                        />
                        <button>Ödülü kaydet</button>
                      </Action>
                    </details>
                  )}
                  <div className="reward-grid">
                    {rewards
                      ?.filter((r) => r.active)
                      .map((r, i) => (
                        <article className="card reward" key={r.id}>
                          <div className="reward-emoji">
                            {["🎮", "🎬", "🍽️", "🎯"][i % 4]}
                          </div>
                          <h2>{r.name}</h2>
                          <p>
                            {r.description || "Emeklerine küçük bir teşekkür."}
                          </p>
                          <b>{r.coin_cost} Coin</b>
                          {parent && (
                            <details>
                              <summary>Düzenle</summary>
                              <Action
                                action="edit_reward"
                                student={sid}
                                id={r.id}
                              >
                                <Field
                                  name="title"
                                  label="Ödül adı"
                                  value={r.name}
                                />
                                <Field
                                  name="coin"
                                  label="Coin"
                                  type="number"
                                  value={r.coin_cost}
                                />
                                <button>Kaydet</button>
                              </Action>
                              <Action
                                action="archive_reward"
                                student={sid}
                                id={r.id}
                              >
                                <button className="secondary">
                                  Ödülü arşivle
                                </button>
                              </Action>
                            </details>
                          )}
                          {!parent && (
                            <Action action="request" student={sid} id={r.id}>
                              <button disabled={coin < r.coin_cost}>
                                {coin < r.coin_cost
                                  ? "Biraz daha Coin gerekli"
                                  : "Ödül talep et"}
                              </button>
                            </Action>
                          )}
                        </article>
                      ))}
                  </div>
                  <h2>Ödül talepleri</h2>
                  <section className="card">
                    {requests.map((r) => (
                      <article className="task" key={r.id}>
                        <Gift />
                        <div className="grow">
                          <h3>
                            {rewards?.find((x) => x.id === r.reward_id)?.name}
                          </h3>
                          <small>
                            {r.coin_cost_snapshot} Coin · {labels[r.status]}
                          </small>
                        </div>
                        {parent && r.status === "PENDING" && (
                          <>
                            <Action action="approve" student={sid} id={r.id}>
                              <button>Onayla</button>
                            </Action>
                            <Action action="reject" student={sid} id={r.id}>
                              <button className="secondary">Reddet</button>
                            </Action>
                          </>
                        )}
                      </article>
                    ))}
                    {!requests.length && (
                      <p className="empty">Henüz ödül talebi yok.</p>
                    )}
                  </section>
                </>
              )}
              {tab === "profile" && (
                <section className="card">
                  <h2>Kendi yolculuğunda ilerle.</h2>
                  <p>
                    Başka kimseyle yarışmıyorsun. Bugünkü emeğin, yarına
                    yatırımın.
                  </p>
                  <p>
                    Seriye uygun gün: günlük ilerleme ≥ %
                    {cfg?.streak_threshold_percent || 70}
                  </p>
                  <Action action="light_day" student={sid}>
                    <button disabled={lightDays.some((d) => d.date === day)}>
                      Bugünü hafif gün yap
                    </button>
                  </Action>
                  <p>
                    Haftada {cfg?.max_light_days_per_week || 1} kez · Eşik %
                    {cfg?.light_day_threshold_percent || 50}
                  </p>
                  <h3>Günlük geçmişin</h3>
                  {history.slice(-14).map((d) => (
                    <p key={d.date}>
                      {d.date} ·{" "}
                      {d.qualified
                        ? "✓ Hedefe ulaşıldı"
                        : "○ Hedef henüz tamamlanmadı"}
                    </p>
                  ))}
                </section>
              )}
              {tab === "parent" && !parent && (
                <p role="alert" className="notice error">
                  Bu ekran için ebeveyn yetkisi gerekli.
                </p>
              )}
              {tab === "parent" && parent && (
                <>
                  <section className="card">
                    <h2>Haftalık özet</h2>
                    {(() => {
                      const monday = new Date(day + "T00:00:00+03:00");
                      monday.setUTCDate(
                        monday.getUTCDate() -
                          ((new Date(day + "T12:00:00Z").getUTCDay() + 6) % 7),
                      );
                      const start = monday.toISOString();
                      const end = new Date(
                        monday.getTime() + 7 * 86400000,
                      ).toISOString();
                      const within = (s: string) => s >= start && s < end;
                      const tx = transactions.filter((t) =>
                        within(t.created_at),
                      );
                      const studies = sessions.filter(
                        (s) => s.status === "COMPLETED" && within(s.ended_at),
                      );
                      const completed = completions.filter(
                        (c) => !c.reversed_at && within(c.completed_at),
                      );
                      const weekDays = history.filter(
                        (h) =>
                          h.date >= today(monday) &&
                          h.date <
                            today(new Date(monday.getTime() + 7 * 86400000)),
                      );
                      const totalOccurrences = weekDays.reduce(
                        (sum, h) =>
                          sum +
                          tasks.filter(
                            (t) =>
                              t.active &&
                              t.active_date <= h.date &&
                              (t.recurrence_rule === "DAILY" ||
                                t.active_date === h.date),
                          ).length,
                        0,
                      );
                      return (
                        <div className="report-grid">
                          <p>
                            <strong>
                              %
                              {totalOccurrences
                                ? Math.round(
                                    (completed.length / totalOccurrences) * 100,
                                  )
                                : 0}
                            </strong>{" "}
                            görev tamamlama oranı
                          </p>
                          <p>
                            <strong>{completed.length}</strong> tamamlanan görev
                          </p>
                          <p>
                            <strong>
                              {Math.floor(
                                studies.reduce(
                                  (s, t) => s + t.active_seconds,
                                  0,
                                ) / 60,
                              )}
                            </strong>{" "}
                            aktif dakika
                          </p>
                          <p>
                            <strong>
                              {studies.reduce(
                                (s, t) => s + (t.questions_solved || 0),
                                0,
                              )}
                            </strong>{" "}
                            soru
                          </p>
                          <p>
                            <strong>
                              {tx
                                .filter((t) => t.currency === "XP")
                                .reduce((s, t) => s + t.amount, 0)}
                            </strong>{" "}
                            XP değişimi
                          </p>
                          <p>
                            <strong>
                              {tx
                                .filter(
                                  (t) => t.currency === "COIN" && t.amount > 0,
                                )
                                .reduce((s, t) => s + t.amount, 0)}
                            </strong>{" "}
                            kazanılan Coin
                          </p>
                          <p>
                            <strong>
                              {
                                -tx
                                  .filter(
                                    (t) =>
                                      t.currency === "COIN" && t.amount < 0,
                                  )
                                  .reduce((s, t) => s + t.amount, 0)
                              }
                            </strong>{" "}
                            harcanan Coin
                          </p>
                        </div>
                      );
                    })()}
                  </section>
                  <div className="chips">
                    <a href={href("tasks")}>Görev yönetimi</a>
                    <a href={href("plan")}>Plan yönetimi</a>
                    <a href={href("rewards")}>
                      Ödüller ve{" "}
                      {requests.filter((r) => r.status === "PENDING").length}{" "}
                      bekleyen talep
                    </a>
                  </div>
                  <section className="card">
                    <h2>Öğrenci hesabını bağla</h2>
                    {invites
                      ?.filter((i) => i.student_id === sid)
                      .map((i) => (
                        <p key={i.code}>
                          Öğrenci, kayıt ekranında bu tek kullanımlık kodu
                          girmeli: <code>{i.code}</code>
                        </p>
                      ))}
                    {!invites?.some((i) => i.student_id === sid) && (
                      <p>Öğrenci hesabı bağlandı.</p>
                    )}
                    <details>
                      <summary>Başka öğrenci ekle</summary>
                      <Action action="create_student" student={sid}>
                        <Field name="title" label="Görünen ad" />
                        <button>Öğrenci ekle</button>
                      </Action>
                    </details>
                  </section>
                  <section className="card">
                    <h2>XP / Coin düzeltmesi</h2>
                    <Action action="adjust" student={sid} className="fields">
                      <label>
                        Birim
                        <select name="currency">
                          <option>XP</option>
                          <option>COIN</option>
                        </select>
                      </label>
                      <label>
                        Tutar (+ / −)
                        <input type="number" name="amount" required />
                      </label>
                      <Field name="reason" label="Açıklama (zorunlu)" />
                      <button>Düzeltmeyi kaydet</button>
                    </Action>
                  </section>
                  <section className="card">
                    <h2>Aile kuralları</h2>
                    <Action action="settings" student={sid} className="fields">
                      <Field
                        name="minimum_seconds"
                        label="Asgari aktif süre (saniye, en az 300)"
                        type="number"
                        value={cfg?.minimum_study_session_seconds || 300}
                      />
                      <Field
                        name="threshold"
                        label="Seri eşiği (%)"
                        type="number"
                        value={cfg?.streak_threshold_percent || 70}
                      />
                      <button>Ayarları kaydet</button>
                    </Action>
                  </section>
                </>
              )}
              {(tab === "profile" || (tab === "parent" && parent)) && (
                <section className="card">
                  <h2>XP / Coin hareketleri</h2>
                  {transactions
                    .sort((a, b) => b.created_at.localeCompare(a.created_at))
                    .map((t) => (
                      <article key={t.id} className="task">
                        <div className="grow">
                          <h3>{t.description}</h3>
                          <small>
                            {new Date(t.created_at).toLocaleString("tr-TR", {
                              timeZone: "Europe/Istanbul",
                            })}{" "}
                            · {t.transaction_type} · {t.source_type}
                          </small>
                        </div>
                        <b>
                          {t.amount > 0 ? "+" : ""}
                          {t.amount} {t.currency}
                        </b>
                      </article>
                    ))}
                </section>
              )}
            </>
          )}
          <footer>
            Studycoach · Her gün, kendi hızında.{" "}
            <span>Birlikte gelişiyoruz 🌱</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
