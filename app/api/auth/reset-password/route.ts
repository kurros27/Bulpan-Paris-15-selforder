import { prisma } from "@/lib/prisma";
import { apiHandler, errorJson, json, parseBody } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validators";

export const POST = apiHandler(async (request: Request) => {
  const { token, password } = await parseBody(request, resetPasswordSchema);

  const user = await prisma.user.findUnique({ where: { resetToken: token } });
  if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return errorJson("Lien invalide ou expiré", 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      resetToken: null,
      resetTokenExpires: null,
    },
  });

  return json({ ok: true });
});
