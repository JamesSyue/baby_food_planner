import { redirect } from "next/navigation";

import { LoginForm } from "@/app/components/login-form";
import { getLoggedInAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const account = await getLoggedInAccount();

  if (account) {
    redirect("/");
  }

  return (
    <main className="app-shell">
      <section className="panel login-panel">
        <p className="eyebrow">Login</p>
        <h1 className="edit-page-title">登入頁</h1>
        <p className="hero-copy">請先登入，登入成功後才會進入首頁並讀取目前資料。</p>
        <LoginForm />
      </section>
    </main>
  );
}