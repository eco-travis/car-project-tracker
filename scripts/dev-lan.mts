// Dev server reachable from your phone on the same Wi-Fi.
// - Points the app (server and browser) at local Supabase via this Mac's LAN IP, so uploads and
//   photos work from the phone (127.0.0.1 on a phone is the phone).
// - Allows that IP as a Next.js dev origin and binds the server to it (the Mac uses the same URL).
// Run: npm run dev:lan  (stop any `npm run dev` first; both use port 3000)
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const lanIp = Object.values(networkInterfaces())
  .flat()
  .find(
    (a) =>
      a &&
      a.family === "IPv4" &&
      !a.internal &&
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address),
  )?.address;
if (!lanIp)
  throw new Error("No private LAN IPv4 address found. Are you on Wi-Fi?");

const port = process.env.PORT ?? "3000";
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: `http://${lanIp}:54321`,
  LAN_HOST: lanIp,
};
console.log(
  `\n  Open on your phone and this Mac (same Wi-Fi):  http://${lanIp}:${port}\n  Supabase for this session:        ${env.NEXT_PUBLIC_SUPABASE_URL}\n`,
);
// Bind to the LAN IP (not 0.0.0.0) so redirects and generated URLs use an address the phone
// can reach. On the Mac, use the same URL.
const child = spawn("npx", ["next", "dev", "-H", lanIp, "-p", port], {
  env,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
