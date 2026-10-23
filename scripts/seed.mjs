import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
if (
  !["http://127.0.0.1:54321", "http://localhost:54321"].includes(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  )
)
  throw new Error("Seed yalnız yerel Supabase için çalışır.");
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
if (existsSync(".local-demo.json")) {
  const saved = JSON.parse(readFileSync(".local-demo.json", "utf8"));
  const probe = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false } },
  );
  const result = await probe.auth.signInWithPassword(saved.parent);
  if (!result.error) {
    console.log("Demo bağlantısı doğrulandı; yeniden oluşturulmadı.");
    process.exit(0);
  }
  const existing = await admin.auth.admin.listUsers();
  if (existing.error) throw existing.error;
  if (existing.data.users.some((u) => u.email === saved.parent.email))
    throw new Error("Demo hesap parolası değişmiş; mevcut veriler korunuyor.");
}
const password = randomBytes(18).toString("base64url");
const accounts = {
  parent: { email: "parent@studycoach.local", password },
  student: { email: "student@studycoach.local", password },
};
async function check(p) {
  const r = await p;
  if (r.error) throw r.error;
  return r.data;
}
for (const a of Object.values(accounts))
  await check(admin.auth.admin.createUser({ ...a, email_confirm: true }));
function client() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false } },
  );
}
const p = client(),
  s = client();
await check(p.auth.signInWithPassword(accounts.parent));
await check(
  p.rpc("register_account", { display_name: "Deniz", invite_code: null }),
);
await check(
  p.rpc("perform_action", {
    action: "create_student",
    student: null,
    payload: { title: "Zeynep" },
  }),
);
const [student] = await check(p.from("student_profiles").select("*"));
const [invite] = await check(p.from("invites").select("*"));
await check(s.auth.signInWithPassword(accounts.student));
await check(
  s.rpc("register_account", {
    display_name: "Zeynep",
    invite_code: invite.code,
  }),
);
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
for (const [title, category, xp, coin, weight, subject] of [
  ["Matematik — 20 soru", "STUDY", 20, 10, 2, "Matematik"],
  ["20 dk kitap oku", "HABIT", 10, 5, 1, "Türkçe"],
  ["Çantayı hazırla", "HABIT", 5, 2, 1, ""],
  ["Çalışma kağıdını tamamla", "HOMEWORK", 15, 5, 1, "Fen Bilimleri"],
])
  await check(
    p.rpc("perform_action", {
      action: "create_task",
      student: student.id,
      payload: {
        title,
        category,
        xp,
        coin,
        weight,
        subject,
        date,
        due_at: category === "HOMEWORK" ? date + "T20:00:00+03:00" : null,
      },
    }),
  );
for (const [title, subject] of [
  ["Kesirlerle işlemler", "Matematik"],
  ["Kitabımla 20 dakika", "Türkçe"],
])
  await check(
    p.rpc("perform_action", {
      action: "create_block",
      student: student.id,
      payload: { title, subject, date, minutes: 25, xp: 10, coin: 0 },
    }),
  );
for (const [title, coin] of [
  ["+30 dk oyun", 40],
  ["Film seçme hakkı", 60],
  ["Hafta sonu yemeğini seçme", 80],
])
  await check(
    p.rpc("perform_action", {
      action: "create_reward",
      student: student.id,
      payload: { title, coin },
    }),
  );
writeFileSync(
  ".local-demo.json",
  JSON.stringify({ ...accounts, studentId: student.id }, null, 2),
  { mode: 0o600 },
);
console.log(
  "Demo oluşturuldu. Yerel giriş bilgileri .local-demo.json dosyasında (Git dışında).",
);
