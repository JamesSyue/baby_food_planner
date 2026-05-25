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

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Next.js + MySQL</p>
          <h1>副食品庫存與菜單規劃</h1>
          <p className="hero-copy">
            這個版本把原本的 Apps Script + Google Sheets 結構改成 Next.js App Router 與 MySQL，保留庫存、規則、試敏紀錄、每日狀況與菜單規劃的核心資料模型。
          </p>
        </div>
        <div className="hero-panel">
          <span className={`status-dot ${snapshot.connected ? "ok" : "warn"}`} />
          <strong>{snapshot.connected ? "資料庫已連線" : "尚未連上資料庫"}</strong>
          <p>{snapshot.message}</p>
          <div className="hero-actions">
            <a className="button-primary" href="/api/dashboard">
              查看 JSON API
            </a>
            <a className="button-secondary" href="/api/recommendation">
              查看菜單建議 API
            </a>
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
        <InventoryTable inventory={snapshot.inventory} />
      </section>

      <section className="detail-sections-grid">
        <RulesTable rules={snapshot.rules} />
        <SensitivityTable records={snapshot.sensitivityRecords} />
      </section>
    </main>
  );
}
