import { getDashboardSnapshot } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default async function Home() {
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

      <section className="content-grid">
        <article className="panel recommendation-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Recommendation</p>
              <h2>{snapshot.recommendation.title}</h2>
            </div>
            <div className="badge-row">
              <span className="badge">目標 {snapshot.recommendation.targetGrams}g</span>
              <span className="badge">目前 {snapshot.recommendation.totalGrams}g</span>
              <span className="badge">狀況 {snapshot.recommendation.condition}</span>
            </div>
          </div>

          <div className="recommendation-list">
            {snapshot.recommendation.items.length ? (
              snapshot.recommendation.items.map((item) => (
                <div key={item.name} className="recommendation-item">
                  <div>
                    <strong>{item.name}</strong>
                    <p>
                      {item.type} · 規格 {item.specGrams}g · 庫存 {item.stockUnits} 份
                    </p>
                  </div>
                  <span>{item.grams}g</span>
                </div>
              ))
            ) : (
              <p className="empty-state">目前尚無可用資料，先執行 npm run db:push 與 npm run db:seed。</p>
            )}
          </div>

          {snapshot.recommendation.warnings.length > 0 ? (
            <div className="notice-box">
              {snapshot.recommendation.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
        </article>

        <article className="panel compact-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Recent Plans</p>
              <h2>最近菜單規劃</h2>
            </div>
          </div>
          <div className="plan-list">
            {snapshot.menuPlans.length ? (
              snapshot.menuPlans.map((plan) => (
                <div key={plan.id} className="plan-card">
                  <div className="plan-card-head">
                    <strong>
                      {dateFormatter.format(new Date(plan.planDate))} · {plan.mealType}
                    </strong>
                    <span>{plan.totalGrams}g</span>
                  </div>
                  <p>{plan.notes || plan.conditionText || "已排定菜單。"}</p>
                  <div className="mini-tags">
                    {plan.items.map((item) => (
                      <span key={`${plan.id}-${item.id}`} className="mini-tag">
                        {item.ingredientName} {item.grams}g
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">尚未有菜單規劃資料。</p>
            )}
          </div>
        </article>
      </section>

      <section className="content-grid tables-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Inventory</p>
              <h2>庫存總覽</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>食材</th>
                  <th>類型</th>
                  <th>規格</th>
                  <th>庫存</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.inventory.length ? (
                  snapshot.inventory.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <span>{item.code}</span>
                      </td>
                      <td>{item.category}</td>
                      <td>{item.specGrams}g</td>
                      <td>{item.stockUnits} 份</td>
                      <td>{item.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      尚無庫存資料
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Signals</p>
              <h2>試敏與每日狀況</h2>
            </div>
          </div>
          <div className="signal-columns">
            <div>
              <h3>試敏紀錄</h3>
              {snapshot.sensitivityRecords.length ? (
                snapshot.sensitivityRecords.map((record) => (
                  <div key={record.id} className="signal-card">
                    <strong>{record.ingredientName}</strong>
                    <p>
                      第 {record.daySequence} 天 · {record.grams}g · {record.result || "待觀察"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="empty-state">尚無試敏資料。</p>
              )}
            </div>
            <div>
              <h3>每日狀況</h3>
              {snapshot.dailyConditions.length ? (
                snapshot.dailyConditions.map((condition) => (
                  <div key={condition.id} className="signal-card">
                    <strong>{dateFormatter.format(new Date(condition.recordedOn))}</strong>
                    <p>
                      {condition.stoolCondition || "未記錄"} · {condition.coughPhlegm || "無痰況"} · {condition.appetite || "食慾未記錄"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="empty-state">尚無每日狀況資料。</p>
              )}
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
