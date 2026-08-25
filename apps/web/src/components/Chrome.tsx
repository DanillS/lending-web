"use client";

import { useCart } from "@/lib/cart";
import { debugLog } from "@/lib/debug";
import { SiteInfo } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Header({ site }: { site: SiteInfo }) {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // #region agent log
    const labels = Array.from(document.querySelectorAll("a, button")).map((el) => el.textContent?.replace(/\s+/g, " ").trim() || "");
    debugLog(
      "Chrome.tsx:home",
      "order now CTA",
      {
        path: window.location.pathname,
        inServices: Array.from(document.querySelectorAll("#services a, #services button")).some(
          (el) => el.textContent?.trim() === "Заказать сейчас",
        ),
        anywhere: labels.includes("Заказать сейчас"),
      },
      "A",
      "remove-cta",
    );
    // #endregion
  }, []);

  function toggleMenu() {
    setOpen((value) => {
      const next = !value;
      debugLog("Chrome.tsx:menu", "mobile menu", { open: next, cartCount: count }, "B");
      return next;
    });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/96 backdrop-blur">
      <div className="container-site flex items-center justify-between gap-3 py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3 no-underline" onClick={() => setOpen(false)}>
          <img src="/icons/icon.webp" alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
          <span className="truncate text-lg font-bold text-dark sm:text-xl">{site.name}</span>
        </Link>
        <nav className="hidden items-center gap-8 font-medium md:flex">
          <Link href="/#services">Услуги</Link>
          <Link href="/catalog">Каталог</Link>
          <Link href="/delivery">Доставка</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/checkout">Заявка</Link>
        </nav>
        <div className="flex items-center gap-2">
          <a href={`tel:${site.phone.replace(/[^\d+]/g, "")}`} className="hidden text-sm font-semibold lg:block">
            {site.phone}
          </a>
          <Link href="/cart" className="btn btn-outline !px-4 !py-2 text-sm whitespace-nowrap sm:!px-5 sm:!py-2.5">
            Корзина{count ? ` · ${count}` : ""}
          </Link>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-wash text-xl md:hidden"
            aria-expanded={open}
            aria-label="Меню"
            onClick={toggleMenu}
          >
            {open ? "×" : "☰"}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="border-t border-line bg-white px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4 text-lg font-medium">
            <Link href="/#services" onClick={() => setOpen(false)}>
              Услуги
            </Link>
            <Link href="/catalog" onClick={() => setOpen(false)}>
              Каталог
            </Link>
            <Link href="/delivery" onClick={() => setOpen(false)}>
              Доставка
            </Link>
            <Link href="/#faq" onClick={() => setOpen(false)}>
              FAQ
            </Link>
            <Link href="/checkout" onClick={() => setOpen(false)}>
              Заявка
            </Link>
            <a href={site.whatsapp} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <a href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}>{site.phone}</a>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

export function Footer({ site }: { site: SiteInfo }) {
  return (
    <footer className="site-footer">
      <div className="container-site space-y-3">
        <p>
          © {site.name} | {site.city} | {site.phone} | {site.email}
        </p>
        <p className="text-sm">
          <Link href="/legal">Политика персональных данных</Link>
          {" · "}
          <Link href="/delivery">Доставка и установка</Link>
        </p>
      </div>
    </footer>
  );
}
