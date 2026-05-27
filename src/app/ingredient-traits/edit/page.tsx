import { IngredientTraitEditForm } from "@/app/components/ingredient-trait-edit-form";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function IngredientTraitsEditPage() {
  await requireAuth();
  const traits = await prisma.ingredientTrait.findMany({
    orderBy: [{ ingredientName: "asc" }, { id: "asc" }],
  });
  const primaryTypes = new Set(traits.map((item) => item.primaryType).filter(Boolean));

  return (
    <main className="app-shell workspace-page-shell">
      <section className="workspace-page-intro">
        <div>
          <p className="eyebrow">Reference Editor</p>
          <h1>整理食材特性，讓每次搭配更接近真實照護情境。</h1>
          <p className="hero-copy">這裡維護的是規則判斷背後的參考層。纖維、脹氣、試敏與症狀相關欄位越清楚，首頁的 AI 與人工判讀就越穩定。</p>
        </div>
        <div className="workspace-page-summary">
          <article className="workspace-summary-card">
            <span>Traits</span>
            <strong>{traits.length}</strong>
            <p>目前可查詢的食材特性筆數</p>
          </article>
          <article className="workspace-summary-card">
            <span>Types</span>
            <strong>{primaryTypes.size}</strong>
            <p>已建立的主要類型數量</p>
          </article>
        </div>
      </section>
      <IngredientTraitEditForm
        traits={traits.map((item) => ({
          id: item.id,
          ingredientName: item.ingredientName,
          primaryType: item.primaryType,
          solubleFiber: item.solubleFiber,
          insolubleFiber: item.insolubleFiber,
          fiberLevel: item.fiberLevel,
          easyGas: item.easyGas,
          forConstipation: item.forConstipation,
          forDiarrhea: item.forDiarrhea,
          forPhlegm: item.forPhlegm,
          sensitivity: item.sensitivity,
          adverseNotes: item.adverseNotes,
          nutritionNotes: item.nutritionNotes,
        }))}
      />
    </main>
  );
}