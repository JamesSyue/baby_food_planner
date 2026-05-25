"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type IngredientTraitEditItem = {
  id: number;
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

type SaveResponse = {
  ok: boolean;
  message?: string;
  updatedAt?: string;
  count?: number;
  items?: string[];
};

type IngredientTraitEditFormProps = {
  traits: IngredientTraitEditItem[];
};

type TraitRequiredField = "ingredientName" | "primaryType";

export function IngredientTraitEditForm({ traits }: IngredientTraitEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState(traits);
  const [nextRowId, setNextRowId] = useState(-1);
  const [searchTerm, setSearchTerm] = useState("");
  const [primaryTypeFilter, setPrimaryTypeFilter] = useState("all");
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<SaveResponse | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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

  const primaryTypeOptions = useMemo(
    () => Array.from(new Set(rows.map((item) => item.primaryType).filter(Boolean))).sort((left, right) => left.localeCompare(right, "zh-Hant")),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return rows.filter((item) => {
      const matchesKeyword =
        !keyword ||
        item.ingredientName.toLowerCase().includes(keyword) ||
        item.primaryType.toLowerCase().includes(keyword) ||
        (item.solubleFiber || "").toLowerCase().includes(keyword) ||
        (item.insolubleFiber || "").toLowerCase().includes(keyword) ||
        (item.fiberLevel || "").toLowerCase().includes(keyword) ||
        (item.easyGas || "").toLowerCase().includes(keyword) ||
        (item.forConstipation || "").toLowerCase().includes(keyword) ||
        (item.forDiarrhea || "").toLowerCase().includes(keyword) ||
        (item.forPhlegm || "").toLowerCase().includes(keyword) ||
        (item.sensitivity || "").toLowerCase().includes(keyword) ||
        (item.adverseNotes || "").toLowerCase().includes(keyword) ||
        (item.nutritionNotes || "").toLowerCase().includes(keyword);

      const matchesPrimaryType = primaryTypeFilter === "all" || item.primaryType === primaryTypeFilter;

      return matchesKeyword && matchesPrimaryType;
    });
  }, [primaryTypeFilter, rows, searchTerm]);

  const validationErrors = useMemo(() => {
    return rows.reduce<Record<number, Partial<Record<TraitRequiredField, string>>>>((errors, item) => {
      const itemErrors: Partial<Record<TraitRequiredField, string>> = {};

      if (!item.ingredientName.trim()) {
        itemErrors.ingredientName = "食材名稱不可空白";
      }

      if (!item.primaryType.trim()) {
        itemErrors.primaryType = "主要類型不可空白";
      }

      if (Object.keys(itemErrors).length) {
        errors[item.id] = itemErrors;
      }

      return errors;
    }, {});
  }, [rows]);

  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  function createEmptyRow(id: number): IngredientTraitEditItem {
    return {
      id,
      ingredientName: "",
      primaryType: "",
      solubleFiber: null,
      insolubleFiber: null,
      fiberLevel: null,
      easyGas: null,
      forConstipation: null,
      forDiarrhea: null,
      forPhlegm: null,
      sensitivity: null,
      adverseNotes: null,
      nutritionNotes: null,
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

      const shouldDelete = window.confirm(`確定要刪除食材特性「${target.ingredientName || "未命名食材"}」嗎？`);
      if (!shouldDelete) {
        return current;
      }

      return current.filter((item) => item.id !== id);
    });
  }

  function updateRow(id: number, field: keyof IngredientTraitEditItem, value: string) {
    setRows((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }

        return {
          ...item,
          [field]: field === "ingredientName" || field === "primaryType" ? value : value === "" ? null : value,
        };
      }),
    );
  }

  function getFieldError(id: number, field: TraitRequiredField) {
    return validationErrors[id]?.[field] || null;
  }

  async function handleSave() {
    if (hasValidationErrors) {
      setResult({ ok: false, message: "請先修正必填欄位錯誤後再送出。" });
      return;
    }

    setIsSaving(true);
    setResult(null);

    try {
      const response = await fetch("/api/ingredient-traits-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: rows.map(({ id, ...item }) => item),
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
          <p className="eyebrow">Ingredient Traits Editor</p>
          <h1 className="edit-page-title">編輯食材特性</h1>
          <p className="hero-copy">直接修改下方食材特性資料，按下儲存後會同步更新 MySQL 與 Google Sheet 的食材特性工作表。</p>
        </div>
        <div className="inventory-pagination-summary">
          <span className="badge">共 {rows.length} 筆</span>
          <span className="badge">顯示 {filteredRows.length} 筆</span>
        </div>
      </div>

      <div className="inventory-filters edit-form-filters">
        <label className="inventory-filter-field inventory-search-field">
          <span>搜尋</span>
          <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="搜尋食材名稱、主要類型或特性欄位" />
        </label>

        <label className="inventory-filter-field">
          <span>主要類型篩選</span>
          <select value={primaryTypeFilter} onChange={(event) => setPrimaryTypeFilter(event.target.value)}>
            <option value="all">全部主要類型</option>
            {primaryTypeOptions.map((option) => (
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
              <th>食材名稱</th>
              <th>主要類型</th>
              <th>水溶性纖維</th>
              <th>非水溶性纖維</th>
              <th>纖維</th>
              <th>容易脹氣</th>
              <th>適合山羊便/硬便</th>
              <th>腹瀉時建議</th>
              <th>適合感冒有痰</th>
              <th>試敏狀態</th>
              <th>過敏/不適紀錄</th>
              <th>營養備註</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length ? (
              filteredRows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="edit-cell-field">
                      <input
                        value={item.ingredientName}
                        onChange={(event) => updateRow(item.id, "ingredientName", event.target.value)}
                        className={getFieldError(item.id, "ingredientName") ? "input-error" : undefined}
                      />
                      {getFieldError(item.id, "ingredientName") ? <p className="field-error-text">{getFieldError(item.id, "ingredientName")}</p> : null}
                    </div>
                  </td>
                  <td>
                    <div className="edit-cell-field">
                      <input
                        value={item.primaryType}
                        onChange={(event) => updateRow(item.id, "primaryType", event.target.value)}
                        className={getFieldError(item.id, "primaryType") ? "input-error" : undefined}
                      />
                      {getFieldError(item.id, "primaryType") ? <p className="field-error-text">{getFieldError(item.id, "primaryType")}</p> : null}
                    </div>
                  </td>
                  <td><input value={item.solubleFiber ?? ""} onChange={(event) => updateRow(item.id, "solubleFiber", event.target.value)} /></td>
                  <td><input value={item.insolubleFiber ?? ""} onChange={(event) => updateRow(item.id, "insolubleFiber", event.target.value)} /></td>
                  <td><input value={item.fiberLevel ?? ""} onChange={(event) => updateRow(item.id, "fiberLevel", event.target.value)} /></td>
                  <td><input value={item.easyGas ?? ""} onChange={(event) => updateRow(item.id, "easyGas", event.target.value)} /></td>
                  <td><input value={item.forConstipation ?? ""} onChange={(event) => updateRow(item.id, "forConstipation", event.target.value)} /></td>
                  <td><input value={item.forDiarrhea ?? ""} onChange={(event) => updateRow(item.id, "forDiarrhea", event.target.value)} /></td>
                  <td><input value={item.forPhlegm ?? ""} onChange={(event) => updateRow(item.id, "forPhlegm", event.target.value)} /></td>
                  <td><input value={item.sensitivity ?? ""} onChange={(event) => updateRow(item.id, "sensitivity", event.target.value)} /></td>
                  <td><input value={item.adverseNotes ?? ""} onChange={(event) => updateRow(item.id, "adverseNotes", event.target.value)} /></td>
                  <td><input value={item.nutritionNotes ?? ""} onChange={(event) => updateRow(item.id, "nutritionNotes", event.target.value)} /></td>
                  <td>
                    <button type="button" className="button-secondary edit-row-delete" onClick={() => deleteRow(item.id)}>
                      刪除
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={13} className="empty-cell">
                  目前沒有符合條件的食材特性資料
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
        <p className="edit-page-hint">送出後會同步資料庫，並把食材特性工作表完整回寫到 Google Sheet。</p>
        {hasValidationErrors ? <p className="edit-page-validation-note">必填欄位：食材名稱、主要類型。</p> : null}
      </div>

      {mounted && result
        ? createPortal(
            <div className="app-alert-overlay" onClick={() => setResult(null)} role="presentation">
              <div
                className={`app-alert-modal ${result.ok ? "success" : "error"}`}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="ingredient-traits-save-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="app-alert-head">
                  <div>
                    <p className="eyebrow">Ingredient Traits Save</p>
                    <h3 id="ingredient-traits-save-title">{result.ok ? "儲存完成" : "儲存失敗"}</h3>
                  </div>
                  <button type="button" className="app-alert-close" onClick={() => setResult(null)}>
                    關閉
                  </button>
                </div>

                {result.message ? <p className="app-alert-message">{result.message}</p> : null}
                {result.updatedAt ? <p className="app-alert-meta">更新時間：{new Date(result.updatedAt).toLocaleString("zh-TW")}</p> : null}
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