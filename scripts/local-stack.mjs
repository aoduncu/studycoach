// Minimal local-only Supabase-compatible Auth + PostgREST stack. Never for production.
import { execFileSync } from "node:child_process";
import { randomBytes, createHmac } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const run = (args, opts = {}) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    ...opts,
  });
const existingEnv = existsSync(".env.local")
  ? readFileSync(".env.local", "utf8")
  : "";
const existingUrl = existingEnv.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1];
if (
  existingUrl &&
  !["http://127.0.0.1:54321", "http://localhost:54321"].includes(existingUrl)
)
  throw new Error(
    "Mevcut uzak Supabase yapılandırması korunuyor. Yerel stack için ayrı checkout/ortam kullanın.",
  );
const state = existsSync(".local-stack.json")
  ? JSON.parse(readFileSync(".local-stack.json", "utf8"))
  : {
      password: randomBytes(20).toString("hex"),
      jwt: randomBytes(40).toString("hex"),
    };
writeFileSync(".local-stack.json", JSON.stringify(state), { mode: 0o600 });
function jwt(role) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const body =
    enc({ alg: "HS256", typ: "JWT" }) +
    "." +
    enc({
      role,
      iss: "supabase",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 31536000,
    });
  return (
    body +
    "." +
    createHmac("sha256", state.jwt).update(body).digest("base64url")
  );
}
try {
  run(["network", "inspect", "studycoach-local"]);
} catch {
  run(["network", "create", "studycoach-local"]);
}
function container(name, args) {
  try {
    run(["inspect", name]);
    run(["start", name]);
  } catch {
    run([
      "run",
      "-d",
      "--name",
      name,
      "--label",
      "app=studycoach-local",
      "--network",
      "studycoach-local",
      ...args,
    ]);
  }
}
container("studycoach-db", [
  "-e",
  "POSTGRES_PASSWORD=" + state.password,
  "-e",
  "POSTGRES_DB=studycoach",
  "-v",
  "studycoach-pg:/var/lib/postgresql/data",
  "postgres:17-alpine",
]);
for (let i = 0; i < 60; i++) {
  try {
    run([
      "exec",
      "studycoach-db",
      "pg_isready",
      "-U",
      "postgres",
      "-d",
      "studycoach",
    ]);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 500));
  }
}
const sql = (text) =>
  run(
    [
      "exec",
      "-i",
      "studycoach-db",
      "psql",
      "-U",
      "postgres",
      "-d",
      "studycoach",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: text },
  );
sql(
  `create schema if not exists auth; do $$ begin if not exists(select from pg_roles where rolname='anon') then create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; end if; end $$; grant anon,authenticated,service_role to postgres; create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`,
);
const authEnv = {
  GOTRUE_API_HOST: "0.0.0.0",
  GOTRUE_API_PORT: "9999",
  API_EXTERNAL_URL: "http://127.0.0.1:54321",
  GOTRUE_SITE_URL: "http://127.0.0.1:3000",
  GOTRUE_DB_DRIVER: "postgres",
  GOTRUE_DB_DATABASE_URL: `postgres://postgres:${state.password}@studycoach-db:5432/studycoach?search_path=auth`,
  GOTRUE_JWT_SECRET: state.jwt,
  GOTRUE_JWT_EXP: "3600",
  GOTRUE_JWT_AUD: "authenticated",
  GOTRUE_JWT_DEFAULT_GROUP_NAME: "authenticated",
  GOTRUE_JWT_ADMIN_ROLES: "service_role",
  GOTRUE_DISABLE_SIGNUP: "false",
  GOTRUE_MAILER_AUTOCONFIRM: "true",
  GOTRUE_EXTERNAL_EMAIL_ENABLED: "true",
  GOTRUE_RATE_LIMIT_EMAIL_SENT: "1000",
};
writeFileSync(
  ".local-stack.env",
  Object.entries(authEnv)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n"),
  { mode: 0o600 },
);
container("studycoach-auth", [
  "--env-file",
  ".local-stack.env",
  "-p",
  "127.0.0.1:54325:9999",
  "ghcr.io/supabase/gotrue:v2.197.0",
]);
let authReady = false;
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch("http://127.0.0.1:54325/health");
    if (r.ok) {
      authReady = true;
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
if (!authReady) throw new Error("Auth başlamadı: docker logs studycoach-auth");
sql(
  `create table if not exists public._local_migrations(name text primary key);`,
);
const migration = "202610230001_foundation.sql";
if (
  !sql(
    `select name from public._local_migrations where name='${migration}'`,
  ).includes(migration)
) {
  sql(
    "begin;\n" +
      readFileSync("supabase/migrations/" + migration, "utf8") +
      `\ninsert into public._local_migrations values('${migration}'); commit;`,
  );
}
container("studycoach-rest", [
  "-e",
  `PGRST_DB_URI=postgres://postgres:${state.password}@studycoach-db:5432/studycoach`,
  "-e",
  "PGRST_DB_SCHEMAS=public",
  "-e",
  "PGRST_DB_ANON_ROLE=anon",
  "-e",
  "PGRST_JWT_SECRET=" + state.jwt,
  "-p",
  "127.0.0.1:54326:3000",
  "ghcr.io/supabase/postgrest:v16.5",
]);
const otherLines = existingEnv
  .split("\n")
  .filter(
    (line) =>
      line &&
      !/^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SERVICE_ROLE_KEY)=/.test(
        line,
      ),
  )
  .join("\n");
writeFileSync(
  ".env.local",
  otherLines +
    (otherLines ? "\n" : "") +
    `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${jwt("anon")}\nSUPABASE_SERVICE_ROLE_KEY=${jwt("service_role")}\n`,
  { mode: 0o600 },
);
console.log(
  "Yerel DB, Auth ve REST hazır. Ayrı süreçte npm run local:gateway çalıştırın.",
);
