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
    <main className="app-shell auth-shell">
      <section className="auth-grid">
        <div className="auth-intro">
          <p className="eyebrow">Workspace Access</p>
          <h1>登入後再進入副食品工作台。</h1>
          <p className="hero-copy">
            這裡是整個家庭副食品規劃流程的入口。登入後你可以查看庫存、同步 Google Sheet、維護食材特性，並產生更貼近日常的菜單建議。
          </p>

          <div className="workspace-kicker-grid">
            <article className="workspace-kicker-card">
              <span>Flow</span>
              <strong>Inventory to menu</strong>
              <p>從資料整理一路接到菜單決策，不需要來回切換工具。</p>
            </article>
            <article className="workspace-kicker-card">
              <span>Source</span>
              <strong>Sheets + MySQL</strong>
              <p>保留原本表格維護習慣，同時把資料沉澱進正式資料庫。</p>
            </article>
          </div>
        </div>

        <section className="panel login-panel">
          <p className="eyebrow">Login</p>
          <h2 className="edit-page-title">登入頁</h2>
          <p className="hero-copy">請先登入，登入成功後才會進入首頁並讀取目前資料。</p>
          <LoginForm />
        </section>
      </section>
    </main>
  );
}