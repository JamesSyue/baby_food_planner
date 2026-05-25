import { InventoryEditForm } from "@/app/components/inventory-edit-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InventoryEditPage() {
  const inventory = await prisma.inventoryItem.findMany({
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });

  return (
    <main className="app-shell">
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