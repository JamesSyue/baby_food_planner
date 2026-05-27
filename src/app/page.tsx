import { AiMenuPlanner } from "@/app/components/ai-menu-planner";
import { GoogleSheetSyncButton } from "@/app/components/google-sheet-sync-button";
import { InventoryTable } from "@/app/components/inventory-table";
import { RulesTable } from "@/app/components/rules-table";
import { SensitivityTable } from "@/app/components/sensitivity-table";
import { requireAuth } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireAuth();
  const snapshot = await getDashboardSnapshot();
  const leadStats = snapshot.stats.slice(0, 3);

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy-wrap">
          <p className="eyebrow">Feeding Workspace</p>
          <h1>把副食品庫存、規則與每日菜單放進同一個工作台。</h1>
          <p className="hero-copy">
            這個版本把原本分散在 Apps Script 與 Google Sheets 的流程整合進 Next.js App Router 與 MySQL，讓你可以用同一個畫面掌握庫存、試敏紀錄、規則限制與 AI 菜單建議。
          </p>
          <div className="hero-highlights" aria-label="重點摘要">
            {leadStats.map((stat) => (
              <article key={stat.label} className="hero-highlight-card">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <p>{stat.caption}</p>
              </article>
            ))}
          </div>
          <p className="hero-note">Reading this as: a calm family meal-planning workspace, leaning toward an editorial dashboard with soft contrast and clear section rhythm.</p>
        </div>
        <div className="hero-panel">
          <div className="hero-panel-status">
            <span className={`status-dot ${snapshot.connected ? "ok" : "warn"}`} />
            <span className="hero-panel-kicker">System status</span>
          </div>
          <strong>{snapshot.connected ? "資料庫已連線，可直接操作工作台" : "目前尚未連上資料庫"}</strong>
          <p>{snapshot.message}</p>
          <div className="hero-panel-metadata">
            <div>
              <span>資料來源</span>
              <strong>MySQL / Prisma</strong>
            </div>
            <div>
              <span>同步入口</span>
              <strong>Google Sheets</strong>
            </div>
          </div>
          <GoogleSheetSyncButton />
        </div>
      </section>

      <section className="stats-grid">
        {snapshot.stats.map((stat) => (
          <article key={stat.label} className="stat-card">
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
            <span>{stat.caption}</span>
          </article>
        ))}
      </section>

      <section className="inventory-section">
        <div className="section-intro">
          <p className="eyebrow">Planning</p>
          <div>
            <h2>先整理需求，再產生可執行的餐次建議。</h2>
            <p>AI 會把目前可用庫存、食材特性與規則一起考慮，輸出更接近日常操作的兩天份菜單。</p>
          </div>
        </div>
        <AiMenuPlanner />
      </section>

      <section className="inventory-section">
        <div className="section-intro section-intro-compact">
          <p className="eyebrow">Inventory</p>
          <div>
            <h2>快速看清目前有哪些食材、庫存與狀態。</h2>
          </div>
        </div>
        <InventoryTable inventory={snapshot.inventory} />
      </section>

      <section className="detail-sections-grid">
        <div className="section-intro section-intro-wide">
          <p className="eyebrow">Reference</p>
          <div>
            <h2>規則與試敏紀錄集中在同一層，避免決策時來回切頁。</h2>
          </div>
        </div>
        <RulesTable rules={snapshot.rules} />
        <SensitivityTable records={snapshot.sensitivityRecords} />
      </section>
    </main>
  );
}
