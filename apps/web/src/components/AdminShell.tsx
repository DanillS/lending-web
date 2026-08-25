"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") {
    return <div className="flex min-h-screen items-center justify-center px-6 py-8">{children}</div>;
  }

  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link href="/admin" className="font-bold">
            Админка
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link href="/admin">Товары</Link>
            <Link href="/admin/products/new">Новый товар</Link>
            <Link href="/admin/orders">Заявки</Link>
            <Link href="/">На сайт</Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </>
  );
}
