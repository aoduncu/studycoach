import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
if (!["http://127.0.0.1:54321", "http://localhost:54321"].includes(url))
  throw new Error(
    "Entegrasyon testleri yalnız yerel Supabase üzerinde çalışır.",
  );
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
let p: SupabaseClient,
  s: SupabaseClient,
  other: SupabaseClient,
  sid: string,
  task: string,
  reward: string,
  request: string,
  session: string;
const users: string[] = [];
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
async function check(q: PromiseLike<any>) {
  const r = await q;
  if (r.error) throw new Error(r.error.message);
  return r.data;
}
const action = (c: SupabaseClient, a: string, payload: any = {}) =>
  c.rpc("perform_action", { action: a, student: sid, payload });
async function account() {
  const email = `test-${randomUUID()}@studycoach.local`,
    password = randomUUID();
  const created = await check(
    admin.auth.admin.createUser({ email, password, email_confirm: true }),
  );
  users.push(created.user.id);
  const c = createClient(url, key, { auth: { persistSession: false } });
  await check(c.auth.signInWithPassword({ email, password }));
  return c;
}
beforeAll(async () => {
  p = await account();
  await check(
    p.rpc("register_account", {
      display_name: "Test Ebeveyn",
      invite_code: null,
    }),
  );
  await check(
    p.rpc("perform_action", {
      action: "create_student",
      student: null,
      payload: { title: "Test Öğrenci" },
    }),
  );
  sid = (await check(p.from("student_profiles").select("*")))[0].id;
  const invite = (await check(p.from("invites").select("*")))[0];
  s = await account();
  await check(
    s.rpc("register_account", {
      display_name: "Test Öğrenci",
      invite_code: invite.code,
    }),
  );
  other = await account();
  await check(
    other.rpc("register_account", {
      display_name: "Başka Aile",
      invite_code: null,
    }),
  );
}, 30000);
describe.sequential("Real PostgreSQL + Auth + RLS (FR-001..092)", () => {
  it("isolates families and blocks arbitrary ledger writes", async () => {
    expect(
      await check(other.from("student_profiles").select("*").eq("id", sid)),
    ).toEqual([]);
    expect(
      (await action(other, "create_task", { title: "x" })).error,
    ).toBeTruthy();
    expect(
      (
        await s
          .from("transactions")
          .insert({ student_id: sid, currency: "COIN", amount: 999 })
      ).error,
    ).toBeTruthy();
    expect(
      (await action(s, "create_reward", { title: "bad", coin: 1 })).error,
    ).toBeTruthy();
  });
  it("creates task, exposes to student, completes concurrently exactly once", async () => {
    await check(
      action(p, "create_task", {
        title: "Test matematik",
        category: "STUDY",
        date,
        xp: 20,
        coin: 10,
        weight: 2,
      }),
    );
    const tasks = await check(s.from("tasks").select("*"));
    task = tasks[0].id;
    const results = await Promise.all([
      action(s, "complete", { id: task }),
      action(s, "complete", { id: task }),
    ]);
    expect(results.every((r) => !r.error)).toBe(true);
    expect(await check(s.from("task_completions").select("*"))).toHaveLength(1);
    expect(await check(s.rpc("wallet", { s: sid, c: "XP" }))).toBe(20);
    expect(await check(s.rpc("wallet", { s: sid, c: "COIN" }))).toBe(10);
  });
  it("cannot forge student-created reward amounts", async () => {
    await check(
      action(s, "create_task", {
        title: "Kendi görevim",
        category: "HABIT",
        date,
        xp: 9999,
        coin: 9999,
        weight: 1,
      }),
    );
    const [t] = await check(
      s.from("tasks").select("*").eq("title", "Kendi görevim"),
    );
    expect(t.coin_reward).toBe(0);
    expect(t.xp_reward).toBe(5);
  });
  it("requests do not spend; parent approval spends once and blocks reversal after spend", async () => {
    await check(action(p, "create_reward", { title: "Test ödül", coin: 8 }));
    reward = (await check(p.from("rewards").select("*")))[0].id;
    await check(action(s, "request", { id: reward }));
    request = (await check(p.from("reward_requests").select("*")))[0].id;
    expect(await check(s.rpc("wallet", { s: sid, c: "COIN" }))).toBe(10);
    expect((await action(s, "approve", { id: request })).error).toBeTruthy();
    await check(
      action(p, "edit_reward", { id: reward, title: "Yeni fiyat", coin: 9 }),
    );
    await Promise.all([
      check(action(p, "approve", { id: request })),
      check(action(p, "approve", { id: request })),
    ]);
    expect(await check(s.rpc("wallet", { s: sid, c: "COIN" }))).toBe(2);
    const [c] = await check(s.from("task_completions").select("*"));
    expect((await action(s, "reverse", { id: c.id })).error).toBeTruthy();
  });
  it("requires reason and allows safe reverse then complete again", async () => {
    expect(
      (await action(p, "adjust", { currency: "COIN", amount: 10, reason: "" }))
        .error,
    ).toBeTruthy();
    await check(
      action(p, "adjust", {
        currency: "COIN",
        amount: 10,
        reason: "Test iadesi",
      }),
    );
    const [c] = await check(s.from("task_completions").select("*"));
    await check(action(s, "reverse", { id: c.id }));
    await check(action(s, "reverse", { id: c.id }));
    expect(await check(s.rpc("wallet", { s: sid, c: "COIN" }))).toBe(2);
    await check(action(s, "complete", { id: task }));
    expect(await check(s.rpc("wallet", { s: sid, c: "COIN" }))).toBe(12);
  });
  it("does not penalize overdue homework and scopes calendar", async () => {
    const before = await check(s.rpc("wallet", { s: sid, c: "COIN" }));
    await check(
      action(p, "create_task", {
        title: "Geciken ödev",
        category: "HOMEWORK",
        date,
        due_at: "2026-01-01T12:00:00Z",
        xp: 15,
        coin: 5,
      }),
    );
    expect(await check(s.from("homework").select("*"))).toHaveLength(1);
    await check(
      action(p, "create_event", {
        title: "Fen sınavı",
        type: "EXAM",
        starts_at: date + "T12:00:00+03:00",
      }),
    );
    expect(await check(s.from("calendar_events").select("*"))).toHaveLength(1);
    expect(
      await check(
        other.from("calendar_events").select("*").eq("student_id", sid),
      ),
    ).toHaveLength(0);
    expect(await check(s.rpc("wallet", { s: sid, c: "COIN" }))).toBe(before);
  });
  it("enforces one light day per week", async () => {
    await check(action(s, "light_day"));
    expect((await action(s, "light_day")).error).toBeTruthy();
  });
  it("persists server timer pause/resume, rejects early completion, then accepts 5 real minutes", async () => {
    await check(
      action(p, "create_block", {
        title: "Gerçek 5 dakika testi",
        date,
        minutes: 5,
        xp: 10,
        coin: 1,
      }),
    );
    const [b] = await check(s.from("study_blocks").select("*"));
    await check(action(s, "start", { id: b.id }));
    session = (await check(s.from("study_sessions").select("*")))[0].id;
    await new Promise((r) => setTimeout(r, 1100));
    await check(action(s, "pause", { id: session }));
    const [paused] = await check(s.from("study_sessions").select("*"));
    expect(paused.active_seconds).toBeGreaterThanOrEqual(1);
    await check(action(s, "resume", { id: session }));
    expect(
      (await action(s, "finish", { id: session, questions: 12 })).error,
    ).toBeTruthy();
    await new Promise((r) => setTimeout(r, 300000));
    const done = await check(
      action(s, "finish", { id: session, questions: 12 }),
    );
    expect(done.seconds).toBeGreaterThanOrEqual(300);
    expect(done.xp).toBe(10);
    const [finished] = await check(s.from("study_sessions").select("*"));
    expect(finished.questions_solved).toBe(12);
    expect(finished.status).toBe("COMPLETED");
    await check(action(s, "finish", { id: session, questions: 12 }));
    const tx = await check(
      s.from("transactions").select("*").eq("source_id", session),
    );
    expect(tx).toHaveLength(2);
  }, 330000);
});
afterAll(async () => {
  for (const id of users) {
    /* Auth deletion is intentionally omitted: FK audit records preserve actors. Test users stay in local-only DB. */ void id;
  }
});
