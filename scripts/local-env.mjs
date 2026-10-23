import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const status = JSON.parse(
  execFileSync("npx", ["supabase", "status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }),
);
if (!status.API_URL || !status.ANON_KEY || !status.SERVICE_ROLE_KEY)
  throw new Error("Yerel Supabase hazır değil.");
writeFileSync(
  ".env.local",
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.ANON_KEY}\nSUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}\n`,
  { mode: 0o600 },
);
console.log(
  "Yerel bağlantı .env.local içine yazıldı; anahtarlar gösterilmedi.",
);
