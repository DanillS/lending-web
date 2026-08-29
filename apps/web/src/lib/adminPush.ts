import { apiGet, apiSend } from "@/lib/api";
import { urlBase64ToUint8Array } from "@/lib/pushEncoding";

const SW_PATH = "/sw.js";

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(nav.standalone);
}

export async function registerAdminWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  return navigator.serviceWorker.register(SW_PATH, { scope: "/admin/" });
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  const registration =
    (await navigator.serviceWorker.getRegistration("/admin/")) || (await navigator.serviceWorker.getRegistration());
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function enablePush(): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Разрешите уведомления в браузере");
  }
  const { public_key: publicKey } = await apiGet<{ public_key: string }>("/api/v1/admin/push/vapid");
  const registration = await registerAdminWorker();
  if (!registration) {
    throw new Error("Этот браузер не поддерживает уведомления");
  }
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await existing.unsubscribe();
  }
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Браузер не отдал ключи подписки");
  }
  await apiSend("/api/v1/admin/push/subscribe", "POST", {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });
}

export async function disablePush(): Promise<void> {
  const subscription = await currentPushSubscription();
  if (subscription) {
    try {
      await apiSend("/api/v1/admin/push/unsubscribe", "POST", { endpoint: subscription.endpoint });
    } catch {
      /* still drop local subscription */
    }
    await subscription.unsubscribe();
  }
}

export async function sendTestPush(): Promise<void> {
  await apiSend("/api/v1/admin/push/test", "POST");
}
