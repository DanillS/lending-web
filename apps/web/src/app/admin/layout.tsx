import type { Metadata, Viewport } from "next";
import { AdminShell } from "@/components/AdminShell";

export const metadata: Metadata = {
  title: "Админка",
  robots: { index: false, follow: false },
  manifest: "/admin-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Админка",
    statusBarStyle: "default",
  },
  icons: { apple: "/icons/admin-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#1e1e2a",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-wash">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
