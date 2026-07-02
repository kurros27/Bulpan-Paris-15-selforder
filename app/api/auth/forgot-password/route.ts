import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { apiHandler, json, parseBody } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validators";

export const POST = apiHandler(async (request: Request) => {
  const { email } = await parseBody(request, forgotPasswordSchema);

  const user = await prisma.user.findUnique({ where: { email } });
  // Réponse identique que l'utilisateur existe ou non (anti-énumération)
  if (!user) return json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpires: new Date(Date.now() + 1000 * 60 * 60) },
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reinitialiser?token=${token}`;
  // Sans SMTP configuré, le lien est journalisé côté serveur (dev).
  // Brancher ici un fournisseur d'e-mail (Resend, SES, SMTP…) en production.
  console.info(`[auth] Lien de réinitialisation pour ${email} : ${resetUrl}`);

  return json({ ok: true });
});
