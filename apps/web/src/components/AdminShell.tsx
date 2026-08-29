"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AdminPushToggle } from "@/components/AdminPushToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { apiGet } from "@/lib/api";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [newCount, setNewCount] = useState(0);
  const [flash, setFlash] = useState("");
  const prevCount = useRef<number | null>(null);

  useEffect(() => {
    if (pathname === "/admin/login") return;
    let cancelled = false;

    async function tick() {
      try {
        const data = await apiGet<{ new_count: number }>("/api/v1/admin/orders/stats");
        if (cancelled) return;
        const next = data.new_count;
        if (prevCount.current !== null && next > prevCount.current) {
          setFlash(`Новая заявка · ${next} новых`);
        }
        prevCount.current = next;
        setNewCount(next);
      } catch {
        /* stay on last known count */
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), 15000);
    const onVis = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pathname]);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(""), 8000);
    return () => window.clearTimeout(id);
  }, [flash]);

  if (pathname === "/admin/login") {
    return <div className="flex min-h-screen items-center justify-center px-6 py-8">{children}</div>;
  }

  return (
    <>
      <header className="border-b border-line bg-white">
        <div
          className={`mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-4 ${
            pathname === "/admin/orders" ? "max-w-[90rem]" : "max-w-6xl"
          }`}
        >
          <Link href="/admin" className="font-bold">
            Админка
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/admin">Товары</Link>
            <Link href="/admin/products/new">Новый товар</Link>
            <Link href="/admin/orders" className="inline-flex items-center gap-1.5">
              Заявки
              {newCount > 0 ? (
                <span className="rounded-full bg-red-700 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
                  {newCount}
                </span>
              ) : null}
            </Link>
            <Link href="/">На сайт</Link>
            <AdminPushToggle />
            <LogoutButton />
          </nav>
        </div>
        {flash ? <p className="border-t border-amber-200 bg-amber-50 px-6 py-2 text-center text-sm">{flash}</p> : null}
      </header>
      <div className={`mx-auto px-6 py-8 ${pathname === "/admin/orders" ? "max-w-[90rem]" : "max-w-6xl"}`}>
        {children}
      </div>
    </>
  );
}
