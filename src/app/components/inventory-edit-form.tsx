"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { assignInventoryCodes } from "@/lib/inventory-code";

type InventoryEditItem = {
  id: number;
  code: string;
  name: string;
  category: string;
  specGrams: number;
  stockUnits: number;
  suggestionLimitGrams: number | null;
  status: string;
  updatedAt: string;
  storageMethod: string | null;
  expiresAt: string | null;
  notes: string | null;
};

type SaveResponse = {
  ok: boolean;
  message?: string;
  updatedAt?: string;
  count?: number;
  items?: string[];
};

type InventoryEditFormProps = {
  inventory: InventoryEditItem[];
};

type InventoryRequiredField = "name" | "category";

export function InventoryEditForm({ inventory }: InventoryEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState(inventory);
  const [nextRowId, setNextRowId] = useState(-1);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<SaveResponse | null>(null);
  const canUsePortal = typeof document !== "undefined";

  function getCurrentTimestamp() {
    return new Date().toISOString();
  }

  function formatTaipeiDateTime(value: string) {
    return new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(value));
  }

  useEffect(() => {
    if (!result) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setResult(null);
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [result]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(rows.map((item) => item.category).filter(Boolean))).sort((left, right) => left.localeCompare(right, "zh-Hant")),
    [rows],
  );

  const rowsWithAutoCode = useMemo(() => assignInventoryCodes(rows), [rows]);

  const filteredRows = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return rowsWithAutoCode.filter((item) => {
      const matchesKeyword =
        !keyword ||
        item.code.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword) ||
        (item.expiresAt || "").toLowerCase().includes(keyword);

      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

      return matchesKeyword && matchesCategory;
    });
  }, [categoryFilter, rowsWithAutoCode, searchTerm]);

  const validationErrors = useMemo(() => {
    return rows.reduce<Record<number, Partial<Record<InventoryRequiredField, string>>>>((errors, item) => {
      const itemErrors: Partial<Record<InventoryRequiredField, string>> = {};

      if (!item.name.trim()) {
        itemErrors.name = "食材名稱不可空白";
      }

      if (!item.category.trim()) {
        itemErrors.category = "類型不可空白";
      }

      if (Object.keys(itemErrors).length) {
        errors[item.id] = itemErrors;
      }

      return errors;
    }, {});
  }, [rows]);

  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  function createEmptyRow(id: number): InventoryEditItem {
    const timestamp = getCurrentTimestamp();

    return {
      id,
      code: "",
      name: "",
      category: "",
      specGrams: 0,
      stockUnits: 0,
      suggestionLimitGrams: null,
      status: "可用",
      updatedAt: timestamp,
      storageMethod: null,
      expiresAt: null,
      notes: null,
    };
  }

  function addRow() {
    setRows((current) => [createEmptyRow(nextRowId), ...current]);
    setNextRowId((current) => current - 1);
  }

  function deleteRow(id: number) {
    setRows((current) => {
      const target = current.find((item) => item.id === id);

      if (!target) {
        return current;
      }

      const shouldDelete = window.confirm(`確定要刪除食材「${target.name || target.code || "未命名食材"}」嗎？`);

      if (!shouldDelete) {
        return current;
      }

      return current.filter((item) => item.id !== id);
    });
  }

  function updateRow(id: number, field: keyof InventoryEditItem, value: string) {
    setRows((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }

        if (field === "specGrams" || field === "stockUnits") {
          const nextValue = value === "" ? 0 : Math.max(0, Number(value));
          return { ...item, [field]: Number.isFinite(nextValue) ? nextValue : 0, updatedAt: getCurrentTimestamp() };
        }

        if (field === "suggestionLimitGrams") {
          return { ...item, suggestionLimitGrams: value === "" ? null : Number(value) };
        }

        if (field === "storageMethod" || field === "expiresAt" || field === "notes") {
          return { ...item, [field]: value === "" ? null : value };
        }

        return { ...item, [field]: value };
      }),
    );
  }

  function adjustRowNumber(id: number, field: "specGrams" | "stockUnits", delta: number) {
    setRows((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }

        return {
          ...item,
          [field]: Math.max(0, item[field] + delta),
          updatedAt: getCurrentTimestamp(),
        };
      }),
    );
  }

  function getFieldError(id: number, field: InventoryRequiredField) {
    return validationErrors[id]?.[field] || null;
  }

  async function handleSave() {
    if (hasValidationErrors) {
      setResult({
        ok: false,
        message: "請先修正必填欄位錯誤後再送出。",
      });
      return;
    }

    setIsSaving(true);
    setResult(null);

    try {
      const response = await fetch("/api/inventory-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: rowsWithAutoCode.map((item) => {
            const { id: omittedId, ...rest } = item;
            void omittedId;
            return rest;
          }),
        }),
      });

      const json = (await response.json()) as SaveResponse;
      setResult(json);

      if (response.ok && json.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (error) {
      setResult({
        ok: false,
        message: error instanceof Error ? error.message : "儲存失敗。",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel edit-page-panel">
      <div className="panel-head inventory-panel-head">
        <div>
          <p className="eyebrow">Inventory Editor</p>
          <h1 className="edit-page-title">編輯食材庫存</h1>
          <p className="hero-copy">直接修改下方庫存資料，按下儲存後會同步更新 MySQL 與 Google Sheet 的食材庫存工作表。</p>
        </div>
        <div className="inventory-pagination-summary">
          <span className="badge">共 {rows.length} 筆</span>
          <span className="badge">顯示 {filteredRows.length} 筆</span>
        </div>
      </div>

      <div className="inventory-filters edit-form-filters">
        <label className="inventory-filter-field inventory-search-field">
          <span>搜尋</span>
          <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="搜尋食材ID、食材名稱、類型或期限" />
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

      </div>

      <div className="edit-page-toolbar">
        <button type="button" className="button-secondary" onClick={addRow}>
          新增列
        </button>
      </div>

      <div className="table-wrap">
        <table className="inventory-edit-table">
          <thead>
            <tr>
              <th>食材ID</th>
              <th>食材名稱</th>
              <th>類型</th>
              <th>規格</th>
              <th>期限</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length ? (
              filteredRows.map((item) => (
                <tr key={item.id}>
                  <td className="inventory-edit-cell inventory-edit-cell-code" data-label="食材ID">
                    <div className="edit-cell-field">
                      <input value={item.category.trim() ? item.code : ""} readOnly placeholder="輸入類型後自動產生" />
                    </div>
                  </td>
                  <td className="inventory-edit-cell inventory-edit-cell-name" data-label="食材名稱">
                    <div className="edit-cell-field">
                      <input
                        value={item.name}
                        onChange={(event) => updateRow(item.id, "name", event.target.value)}
                        className={getFieldError(item.id, "name") ? "input-error" : undefined}
                      />
                      {getFieldError(item.id, "name") ? <p className="field-error-text">{getFieldError(item.id, "name")}</p> : null}
                    </div>
                  </td>
                  <td className="inventory-edit-cell inventory-edit-cell-category" data-label="類型">
                    <div className="edit-cell-field">
                      <input
                        value={item.category}
                        onChange={(event) => updateRow(item.id, "category", event.target.value)}
                        className={getFieldError(item.id, "category") ? "input-error" : undefined}
                      />
                      {getFieldError(item.id, "category") ? <p className="field-error-text">{getFieldError(item.id, "category")}</p> : null}
                    </div>
                  </td>
                  <td className="inventory-edit-cell inventory-edit-cell-stepper" data-label="規格與庫存份數">
                    <div className="inventory-stepper-stack">
                      <label className="inventory-stepper-group">
                        <span>規格(g)</span>
                        <div className="inventory-stepper-control">
                          <button type="button" className="inventory-stepper-button" onClick={() => adjustRowNumber(item.id, "specGrams", -1)}>
                            -
                          </button>
                          <input type="number" min="0" step="1" value={item.specGrams} onChange={(event) => updateRow(item.id, "specGrams", event.target.value)} />
                          <button type="button" className="inventory-stepper-button" onClick={() => adjustRowNumber(item.id, "specGrams", 1)}>
                            +
                          </button>
                        </div>
                      </label>

                      <label className="inventory-stepper-group">
                        <span>庫存(份)</span>
                        <div className="inventory-stepper-control">
                          <button type="button" className="inventory-stepper-button" onClick={() => adjustRowNumber(item.id, "stockUnits", -1)}>
                            -
                          </button>
                          <input type="number" min="0" step="1" value={item.stockUnits} onChange={(event) => updateRow(item.id, "stockUnits", event.target.value)} />
                          <button type="button" className="inventory-stepper-button" onClick={() => adjustRowNumber(item.id, "stockUnits", 1)}>
                            +
                          </button>
                        </div>
                      </label>
                    </div>
                  </td>
                  <td className="inventory-edit-cell inventory-edit-cell-expiry" data-label="期限">
                    <input type="date" value={item.expiresAt ? item.expiresAt.slice(0, 10) : ""} onChange={(event) => updateRow(item.id, "expiresAt", event.target.value)} />
                  </td>
                  <td className="inventory-edit-cell inventory-edit-cell-action" data-label="操作">
                    <button type="button" className="button-secondary edit-row-delete" onClick={() => deleteRow(item.id)}>
                      刪除
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="empty-cell">
                  目前沒有符合條件的食材庫存資料
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="edit-page-actions">
        <button type="button" className="button-primary" onClick={handleSave} disabled={isSaving || isPending}>
          {isSaving || isPending ? "儲存中..." : "儲存並送出"}
        </button>
        <p className="edit-page-hint">送出後會同步資料庫，並把食材庫存工作表完整回寫到 Google Sheet。</p>
        {hasValidationErrors ? <p className="edit-page-validation-note">必填欄位：食材名稱、類型。</p> : null}
      </div>

      {canUsePortal && result
        ? createPortal(
            <div className="app-alert-overlay" onClick={() => setResult(null)} role="presentation">
              <div
                className={`app-alert-modal ${result.ok ? "success" : "error"}`}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="inventory-save-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="app-alert-head">
                  <div>
                    <p className="eyebrow">Inventory Save</p>
                    <h3 id="inventory-save-title">{result.ok ? "儲存完成" : "儲存失敗"}</h3>
                  </div>
                  <button type="button" className="app-alert-close" onClick={() => setResult(null)}>
                    關閉
                  </button>
                </div>

                {result.message ? <p className="app-alert-message">{result.message}</p> : null}
                {result.updatedAt ? <p className="app-alert-meta">更新時間：{formatTaipeiDateTime(result.updatedAt)} (UTC+8)</p> : null}
                {result.count !== undefined ? <p className="app-alert-meta">同步筆數：{result.count} 筆</p> : null}
                {result.items?.length ? (
                  <div className="sync-summary-list">
                    <article className="sync-summary-card">
                      <strong>本次同步項目</strong>
                      <p>{result.items.join("、")}</p>
                    </article>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}