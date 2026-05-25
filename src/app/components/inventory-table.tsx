"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type InventoryItem = {
  id: number;
  code: string;
  name: string;
  category: string;
  specGrams: number;
  stockUnits: number;
  status: string;
};

const PAGE_SIZE = 10;

type InventoryTableProps = {
  inventory: InventoryItem[];
};

type IngredientTrait = {
  ingredientName: string;
  primaryType: string;
  solubleFiber: string | null;
  insolubleFiber: string | null;
  fiberLevel: string | null;
  easyGas: string | null;
  forConstipation: string | null;
  forDiarrhea: string | null;
  forPhlegm: string | null;
  sensitivity: string | null;
  adverseNotes: string | null;
  nutritionNotes: string | null;
};

export function InventoryTable({ inventory }: InventoryTableProps) {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingName, setLoadingName] = useState<string | null>(null);
  const [selectedTrait, setSelectedTrait] = useState<IngredientTrait | null>(null);
  const [traitErrorMessage, setTraitErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const categoryOptions = useMemo(
    () => Array.from(new Set(inventory.map((item) => item.category).filter(Boolean))).sort((left, right) => left.localeCompare(right, "zh-Hant")),
    [inventory],
  );

  const statusOptions = useMemo(
    () => Array.from(new Set(inventory.map((item) => item.status).filter(Boolean))).sort((left, right) => left.localeCompare(right, "zh-Hant")),
    [inventory],
  );

  const filteredInventory = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return inventory.filter((item) => {
      const matchesKeyword =
        !keyword ||
        item.name.toLowerCase().includes(keyword) ||
        item.code.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword) ||
        item.status.toLowerCase().includes(keyword);

      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;

      return matchesKeyword && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, inventory, searchTerm, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!selectedTrait && !traitErrorMessage) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedTrait(null);
        setTraitErrorMessage(null);
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedTrait, traitErrorMessage]);

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedInventory = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredInventory.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredInventory]);

  async function handleNameClick(name: string) {
    setLoadingName(name);

    try {
      const response = await fetch(`/api/ingredient-traits?name=${encodeURIComponent(name)}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        ok: boolean;
        message?: string;
        trait?: IngredientTrait;
      };

      if (!response.ok || !json.ok || !json.trait) {
        setTraitErrorMessage(json.message || `找不到「${name}」的食材特性資料`);
        setSelectedTrait(null);
        return;
      }

      setSelectedTrait(json.trait);
      setTraitErrorMessage(null);
    } catch {
      setTraitErrorMessage(`讀取「${name}」的食材特性時發生錯誤`);
      setSelectedTrait(null);
    } finally {
      setLoadingName(null);
    }
  }

  function closeTraitModal() {
    setSelectedTrait(null);
    setTraitErrorMessage(null);
  }

  function renderValue(value: string | null) {
    return value || "未填寫";
  }

  return (
    <article className="panel inventory-panel">
      <div className="panel-head inventory-panel-head">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>庫存總覽</h2>
        </div>
        <div className="inventory-pagination-summary">
          <span className="badge">共 {inventory.length} 筆</span>
          <span className="badge">篩選後 {filteredInventory.length} 筆</span>
          <span className="badge">
            第 {currentPage} / {totalPages} 頁
          </span>
        </div>
      </div>

      <div className="inventory-filters">
        <label className="inventory-filter-field inventory-search-field">
          <span>搜尋</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="搜尋食材、代碼、類型或狀態"
          />
        </label>

        <label className="inventory-filter-field">
          <span>類型篩選</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">全部類型</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="inventory-filter-field">
          <span>狀態篩選</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">全部狀態</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>食材ID</th>
              <th>食材名稱</th>
              <th>類型</th>
              <th>規格</th>
              <th>庫存</th>
              <th>狀態</th>
            </tr>
          </thead>
          <tbody>
            {pagedInventory.length ? (
              pagedInventory.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>
                    <button
                      type="button"
                      className="inventory-name-button"
                      onClick={() => handleNameClick(item.name)}
                      disabled={loadingName === item.name}
                    >
                      {loadingName === item.name ? `讀取中：${item.name}` : item.name}
                    </button>
                  </td>
                  <td>{item.category}</td>
                  <td>{item.specGrams}g</td>
                  <td>{item.stockUnits} 份</td>
                  <td>{item.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="empty-cell">
                  目前沒有符合條件的庫存資料
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="inventory-pagination-actions">
        <button type="button" className="button-secondary page-button" onClick={() => setPage(1)} disabled={currentPage === 1}>
          第一頁
        </button>
        <button
          type="button"
          className="button-secondary page-button"
          onClick={() => setPage((value) => Math.max(1, value - 1))}
          disabled={currentPage === 1}
        >
          上一頁
        </button>
        <button
          type="button"
          className="button-secondary page-button"
          onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          disabled={currentPage === totalPages}
        >
          下一頁
        </button>
        <button
          type="button"
          className="button-secondary page-button"
          onClick={() => setPage(totalPages)}
          disabled={currentPage === totalPages}
        >
          最後一頁
        </button>
      </div>

      {mounted && (selectedTrait || traitErrorMessage)
        ? createPortal(
            <div className="trait-modal-overlay" onClick={closeTraitModal} role="presentation">
              <div
                className="trait-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="trait-modal-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="trait-modal-head">
                  <div>
                    <p className="eyebrow">Ingredient Trait</p>
                    <h3 id="trait-modal-title">{selectedTrait ? `${selectedTrait.ingredientName} 的食材特性` : "食材特性"}</h3>
                  </div>
                  <button type="button" className="trait-modal-close" onClick={closeTraitModal}>
                    關閉
                  </button>
                </div>

                {traitErrorMessage ? (
                  <div className="trait-modal-error">{traitErrorMessage}</div>
                ) : selectedTrait ? (
                  <div className="trait-modal-body">
                    <section className="trait-group">
                      <h4>基本資料</h4>
                      <dl className="trait-grid">
                        <div>
                          <dt>食材名稱</dt>
                          <dd>{selectedTrait.ingredientName}</dd>
                        </div>
                        <div>
                          <dt>主要類型</dt>
                          <dd>{selectedTrait.primaryType}</dd>
                        </div>
                        <div>
                          <dt>容易脹氣</dt>
                          <dd>{renderValue(selectedTrait.easyGas)}</dd>
                        </div>
                      </dl>
                    </section>

                    <section className="trait-group">
                      <h4>纖維</h4>
                      <dl className="trait-grid">
                        <div>
                          <dt>水溶性纖維</dt>
                          <dd>{renderValue(selectedTrait.solubleFiber)}</dd>
                        </div>
                        <div>
                          <dt>非水溶性纖維</dt>
                          <dd>{renderValue(selectedTrait.insolubleFiber)}</dd>
                        </div>
                        <div>
                          <dt>纖維</dt>
                          <dd>{renderValue(selectedTrait.fiberLevel)}</dd>
                        </div>
                      </dl>
                    </section>

                    <section className="trait-group">
                      <h4>試敏與適用情境</h4>
                      <dl className="trait-grid">
                        <div>
                          <dt>試敏狀態</dt>
                          <dd>{renderValue(selectedTrait.sensitivity)}</dd>
                        </div>
                        <div>
                          <dt>適合山羊便/硬便</dt>
                          <dd>{renderValue(selectedTrait.forConstipation)}</dd>
                        </div>
                        <div>
                          <dt>腹瀉時建議</dt>
                          <dd>{renderValue(selectedTrait.forDiarrhea)}</dd>
                        </div>
                        <div>
                          <dt>適合感冒有痰</dt>
                          <dd>{renderValue(selectedTrait.forPhlegm)}</dd>
                        </div>
                      </dl>
                    </section>

                    <section className="trait-group">
                      <h4>備註</h4>
                      <dl className="trait-stack">
                        <div>
                          <dt>過敏/不適紀錄</dt>
                          <dd>{renderValue(selectedTrait.adverseNotes)}</dd>
                        </div>
                        <div>
                          <dt>營養備註</dt>
                          <dd>{renderValue(selectedTrait.nutritionNotes)}</dd>
                        </div>
                      </dl>
                    </section>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </article>
  );
}