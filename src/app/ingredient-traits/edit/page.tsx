import { IngredientTraitEditForm } from "@/app/components/ingredient-trait-edit-form";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function IngredientTraitsEditPage() {
  await requireAuth();
  const traits = await prisma.ingredientTrait.findMany({
    orderBy: [{ ingredientName: "asc" }, { id: "asc" }],
  });

  return (
    <main className="app-shell">
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