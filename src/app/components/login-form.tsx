"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type LoginResponse = {
  ok: boolean;
  message?: string;
};

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!account.trim() || !password.trim()) {
      setErrorMessage("請輸入帳號與密碼。");
      return;
    }

    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ account, password }),
    });

    const json = (await response.json()) as LoginResponse;

    if (!response.ok || !json.ok) {
      setErrorMessage(json.message || "登入失敗。");
      return;
    }

    startTransition(() => {
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label className="inventory-filter-field">
        <span>帳號</span>
        <input value={account} onChange={(event) => setAccount(event.target.value)} placeholder="請輸入帳號" autoComplete="username" />
      </label>

      <label className="inventory-filter-field">
        <span>密碼</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="請輸入密碼"
          autoComplete="current-password"
        />
      </label>

      {errorMessage ? <p className="login-error">{errorMessage}</p> : null}

      <button type="submit" className="button-primary login-submit-button" disabled={isPending}>
        {isPending ? "登入中..." : "登入"}
      </button>
    </form>
  );
}