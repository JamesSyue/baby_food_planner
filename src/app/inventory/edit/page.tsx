import { InventoryEditForm } from "@/app/components/inventory-edit-form";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InventoryEditPage() {
  await requireAuth();
  const inventory = await prisma.inventoryItem.findMany({
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });
  const categories = new Set(inventory.map((item) => item.category).filter(Boolean));

  return (
    <main className="app-shell workspace-page-shell">
      <section className="workspace-page-intro">
        <div>
          <p className="eyebrow">Editor</p>
          <h1>維護庫存資料，讓菜單建議有可靠的底稿。</h1>
          <p className="hero-copy">這個頁面是工作台的資料維護區。調整食材規格、狀態與保存資訊後，首頁的規劃與同步流程都會跟著更新。</p>
        </div>
        <div className="workspace-page-summary">
          <article className="workspace-summary-card">
            <span>Items</span>
            <strong>{inventory.length}</strong>
            <p>目前資料庫中的食材筆數</p>
          </article>
          <article className="workspace-summary-card">
            <span>Categories</span>
            <strong>{categories.size}</strong>
            <p>可用於篩選與分類的食材類型</p>
          </article>
        </div>
      </section>
      <InventoryEditForm
        inventory={inventory.map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          category: item.category,
          specGrams: item.specGrams,
          stockUnits: item.stockUnits,
          suggestionLimitGrams: item.suggestionLimitGrams,
          status: item.status,
          updatedAt: item.updatedAt.toISOString(),
          storageMethod: item.storageMethod,
          expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
          notes: item.notes,
        }))}
      />
    </main>
  );
}