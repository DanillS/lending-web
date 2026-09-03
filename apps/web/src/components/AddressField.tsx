"use client";

import { apiSend } from "@/lib/api";
import { useEffect, useRef, useState } from "react";

type Item = { value: string; unrestricted_value: string };

export function AddressField({
  value,
  onChange,
  enabled,
}: {
  value: string;
  onChange: (value: string) => void;
  enabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const q = value.trim();
    if (q.length < 3) {
      setItems([]);
      setOpen(false);
      return;
    }
    const handle = window.setTimeout(() => {
      void apiSend<{ items: Item[] }>("/api/v1/suggest/address", "POST", { query: q })
        .then((data) => {
          setItems(data.items);
          setActive(0);
          setOpen(data.items.length > 0);
        })
        .catch(() => {
          setItems([]);
          setOpen(false);
        });
    }, 280);
    return () => window.clearTimeout(handle);
  }, [value, enabled]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(item: Item) {
    onChange(item.unrestricted_value || item.value);
    setOpen(false);
  }

  return (
    <div ref={box} className="relative">
      <input
        placeholder={enabled ? "Адрес доставки, Казань" : "Адрес доставки"}
        className="w-full rounded-xl border border-line px-4 py-3"
        value={value}
        autoComplete="street-address"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => items.length && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || !items.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i - 1 + items.length) % items.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-lg">
          {items.map((item, index) => (
            <li key={item.unrestricted_value || item.value}>
              <button
                type="button"
                className={`block w-full px-4 py-2 text-left text-sm ${index === active ? "bg-wash" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(item)}
              >
                {item.value}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
