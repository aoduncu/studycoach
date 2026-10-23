"use server";
import { db } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
const text = z.string().trim().min(1).max(160);
const date = z.iso.date();
const nonnegative = z.coerce.number().int().min(0).max(10000);
const uuid = z.uuid();
const schemas: Record<string, z.ZodType> = {
  edit_task: z.object({
    id: uuid,
    title: text,
    xp: nonnegative,
    coin: nonnegative,
  }),
  edit_block: z.object({
    id: uuid,
    title: text,
    date,
    minutes: z.coerce.number().int().min(1).max(480),
    order_index: nonnegative,
    start_time: z.string(),
  }),
  edit_reward: z.object({
    id: uuid,
    title: text,
    coin: z.coerce.number().int().positive(),
  }),
  create_student: z.object({ title: text }),
  create_task: z.object({
    title: text,
    category: z.enum(["STUDY", "HOMEWORK", "HABIT"]),
    subject: z.string().max(80),
    date,
    due_at: z.string(),
    recurrence: z.enum(["", "DAILY"]),
    xp: nonnegative,
    coin: nonnegative,
    weight: z.coerce.number().positive().max(100),
    minutes: z.string(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  }),
  create_block: z.object({
    title: text,
    subject: z.string().max(80),
    date,
    minutes: z.coerce.number().int().min(1).max(480),
    xp: nonnegative,
    coin: nonnegative,
    order_index: nonnegative,
    start_time: z.string(),
    linked_task_id: z.string(),
  }),
  create_reward: z.object({
    title: text,
    coin: z.coerce.number().int().positive().max(10000),
  }),
  create_event: z.object({
    title: text,
    type: z.enum(["EXAM", "OTHER"]),
    starts_at: z.string().min(10),
  }),
  adjust: z.object({
    currency: z.enum(["XP", "COIN"]),
    amount: z.coerce.number().int().min(-10000).max(10000),
    reason: z.string().trim().min(3).max(200),
  }),
  settings: z.object({
    minimum_seconds: z.coerce.number().int().min(300).max(7200),
    threshold: z.coerce.number().int().min(1).max(100),
  }),
};
export async function authenticate(form: FormData) {
  const client = await db();
  const email = z.email().safeParse(form.get("email"));
  const password = z.string().min(8).safeParse(form.get("password"));
  if (!email.success || !password.success)
    redirect(
      "/?error=" +
        encodeURIComponent(
          "Geçerli e-posta ve en az 8 karakter parola gerekli.",
        ),
    );
  const signup = form.get("mode") === "signup";
  const result = signup
    ? await client.auth.signUp({ email: email.data, password: password.data })
    : await client.auth.signInWithPassword({
        email: email.data,
        password: password.data,
      });
  if (result.error)
    redirect(
      "/?error=" +
        encodeURIComponent(
          "Giriş/kayıt başarısız. Bilgilerini veya e-posta onayını kontrol et.",
        ),
    );
  if (signup && result.data.session) {
    const { error } = await client.rpc("register_account", {
      display_name: String(form.get("name") || "Kullanıcı"),
      invite_code: String(form.get("invite") || "") || null,
    });
    if (error)
      redirect(
        "/?error=" +
          encodeURIComponent("Profil oluşturulamadı. Davet kodunu kontrol et."),
      );
  }
  redirect("/");
}
export async function registerProfile(form: FormData) {
  const client = await db();
  const { error } = await client.rpc("register_account", {
    display_name: String(form.get("name") || "Kullanıcı"),
    invite_code: String(form.get("invite") || "") || null,
  });
  if (error)
    redirect(
      "/?error=" +
        encodeURIComponent("Profil oluşturulamadı. Davet kodunu kontrol et."),
    );
  revalidatePath("/");
}
export async function logout() {
  const client = await db();
  await client.auth.signOut();
  redirect("/");
}
export async function act(form: FormData) {
  const ref = (await headers()).get("referer");
  let tab = "today";
  try {
    const value = new URL(ref || "http://localhost").searchParams.get("tab");
    if (
      value &&
      [
        "today",
        "tasks",
        "homework",
        "plan",
        "calendar",
        "rewards",
        "profile",
        "parent",
      ].includes(value)
    )
      tab = value;
  } catch {}
  const suffix = "&tab=" + tab;
  const action = String(form.get("action"));
  const student = String(form.get("student"));
  const raw = Object.fromEntries(form.entries());
  const schema = schemas[action];
  let payload: unknown = raw;
  if (schema) {
    const parsed = schema.safeParse(raw);
    if (!parsed.success)
      redirect(
        "/?error=" +
          encodeURIComponent(
            "Alanları kontrol et. Başlık, tarih ve sayısal değerler geçerli olmalı.",
          ),
      );
    payload = parsed.data;
    if (action === "create_task" || action === "create_event") {
      const data = payload as Record<string, unknown>;
      const field = action === "create_task" ? "due_at" : "starts_at";
      if (typeof data[field] === "string" && data[field])
        data[field] = new Date(data[field] + "+03:00").toISOString();
    }
  }
  if (action === "finish") {
    const parsed = z
      .object({
        id: z.uuid(),
        questions: z.coerce.number().int().min(0).max(10000),
      })
      .safeParse(raw);
    if (!parsed.success)
      redirect("/?error=" + encodeURIComponent("Soru sayısı geçersiz."));
    payload = parsed.data;
  }
  const client = await db();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/");
  const { data, error } = await client.rpc("perform_action", {
    action,
    student: student || null,
    payload,
  });
  if (error) {
    const expected =
      /Coin|Ebeveyn|Öğrenci|En az|Hafif|hafif|haftalık|Haftalık|geri alınamaz|Görev|açıklaması|Davet|Oturum|Blok/.test(
        error.message,
      );
    redirect(
      "/?student=" +
        student +
        suffix +
        "&error=" +
        encodeURIComponent(
          expected
            ? error.message
            : "İşlem tamamlanamadı. Alanları ve erişim yetkini kontrol et.",
        ),
    );
  }
  revalidatePath("/");
  let message = "İşlem tamamlandı.";
  if (action === "finish" && data?.seconds)
    message = `Çalışma tamamlandı! ${Math.floor(data.seconds / 60)} dk · +${data.xp} XP / +${data.coin} Coin`;
  if (data?.duplicate)
    message = "Bu işlem daha önce işlendi; puanlar tekrar değişmedi.";
  redirect(
    "/?student=" + student + suffix + "&ok=" + encodeURIComponent(message),
  );
}
