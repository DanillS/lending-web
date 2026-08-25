"use client";

import { apiSend } from "@/lib/api";

export function LogoutButton() {
  async function logout() {
    try {
      await apiSend("/api/v1/admin/logout", "POST");
    } catch {
      /* still leave */
    }
    window.location.href = "/admin/login";
  }
  return (
    <button className="text-muted" type="button" onClick={() => void logout()}>
      Выйти
    </button>
  );
}
