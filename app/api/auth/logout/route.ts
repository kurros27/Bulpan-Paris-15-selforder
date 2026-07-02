import { apiHandler, json } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export const POST = apiHandler(async () => {
  await clearSessionCookie();
  return json({ ok: true });
});
