"use client";

import {
  disablePush,
  enablePush,
  isIos,
  isStandalone,
  pushSupported,
  registerAdminWorker,
  currentPushSubscription,
} from "@/lib/adminPush";
import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void> };

export function AdminPushToggle() {
  const [status, setStatus] = useState<"loading" | "unsupported" | "ios" | "denied" | "off" | "on">("loading");
  const [install, setInstall] = useState<PromptEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onPrompt(event: Event) {
      event.preventDefault();
      setInstall(event as PromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    void (async () => {
      if (isIos() && !isStandalone()) {
        setStatus("ios");
        return;
      }
      if (!pushSupported()) {
        setStatus("unsupported");
        return;
      }
      await registerAdminWorker();
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const sub = await currentPushSubscription();
      setStatus(sub ? "on" : "off");
    })();
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      if (status === "on") {
        await disablePush();
        setStatus("off");
      } else {
        await enablePush();
        setStatus("on");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {install ? (
        <button
          type="button"
          className="text-muted"
          onClick={() => {
            void install.prompt();
            setInstall(null);
          }}
        >
          На экран
        </button>
      ) : null}
      {status === "ios" ? (
        <span className="text-muted">iPhone: Поделиться → На экран «Домой», затем откройте админку оттуда</span>
      ) : null}
      {status === "unsupported" ? <span className="text-muted">Уведомления недоступны в этом браузере</span> : null}
      {status === "denied" ? <span className="text-muted">Уведомления запрещены в настройках браузера</span> : null}
      {status === "off" || status === "on" ? (
        <>
          <button type="button" className="text-muted" disabled={busy} onClick={() => void toggle()}>
            {status === "on" ? "Уведомления вкл" : "Включить уведомления"}
          </button>
        </>
      ) : null}
      {error ? <span className="text-red-700">{error}</span> : null}
    </div>
  );
}
