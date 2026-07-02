import Link from "next/link";
import { QrCode } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2 text-xl font-bold">
        <QrCode className="h-6 w-6 text-brand" aria-hidden />
        QRServe
      </Link>
      <div className="w-full max-w-sm rounded-xl border border-hairline bg-surface p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
