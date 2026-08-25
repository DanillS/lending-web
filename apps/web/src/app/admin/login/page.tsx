"use client";

import { apiSend } from "@/lib/api";
import { useState } from "react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin@localhost");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await apiSend("/api/v1/admin/login", "POST", { email, password });
      window.location.assign("/admin");
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : "Ошибка входа");
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-4 rounded-card bg-white p-8">
      <h1 className="text-2xl font-bold">Вход</h1>
      <label className="block text-sm font-medium">
        Email
        <input
          type="text"
          name="email"
          autoComplete="username"
          inputMode="email"
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm font-medium">
        Пароль
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" className="btn btn-dark w-full" disabled={pending}>
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
