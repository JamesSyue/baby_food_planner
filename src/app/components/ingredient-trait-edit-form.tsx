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

type IngredientTraitAiResponse = {
  ok: boolean;
  message?: string;
  trait?: Omit<IngredientTraitEditItem, "id">;
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
  const [rows, setRows] = useState(traits);
  const [nextRowId, setNextRowId] = useState(-1);
  const [searchTerm, setSearchTerm] = useState("");
  const [primaryTypeFilter, setPrimaryTypeFilter] = useState("all");
  const [aiIngredientName, setAiIngredientName] = useState("");
  const [aiPreview, setAiPreview] = useState<IngredientTraitEditItem | null>(null);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiSaving, setIsAiSaving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<SaveResponse | null>(null);
  const canUsePortal = typeof document !== "undefined";

  useEffect(() => {
    if (!result && !aiPreview) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setResult(null);
        setAiPreview(null);
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [aiPreview, result]);

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

  async function syncRows(nextRows: IngredientTraitEditItem[], successMessage?: string) {
    const response = await fetch("/api/ingredient-traits-sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: nextRows.map((item) => {
          const { id: omittedId, ...rest } = item;
          void omittedId;
          return rest;
        }),
      }),
    });

    const json = (await response.json()) as SaveResponse;

    if (!response.ok || !json.ok) {
      throw new Error(json.message || "食材特性儲存失敗");
    }

    setRows(nextRows);
    setResult({
      ...json,
      message: successMessage || json.message,
    });

    startTransition(() => {
      router.refresh();
    });
  }

  async function handleAiSubmit() {
    const ingredientName = aiIngredientName.trim();

    if (!ingredientName) {
      setAiErrorMessage("請先輸入食材名稱");
      return;
    }

    setIsAiLoading(true);
    setAiErrorMessage(null);

    try {
      const response = await fetch("/api/ingredient-trait-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredientName }),
      });

      const json = (await response.json()) as IngredientTraitAiResponse;

      if (!response.ok || !json.ok || !json.trait) {
        setAiPreview(null);
        setAiErrorMessage(json.message || "AI 食材特性查詢失敗");
        return;
      }

      const existingRow = rows.find((item) => item.ingredientName.trim().toLowerCase() === json.trait?.ingredientName.trim().toLowerCase());
      setAiPreview({
        id: existingRow?.id ?? nextRowId,
        ...json.trait,
      });
    } catch {
      setAiPreview(null);
      setAiErrorMessage("AI 食材特性查詢失敗，請稍後再試");
    } finally {
      setIsAiLoading(false);
    }
  }

  async function handleAiConfirmSave() {
    if (!aiPreview) {
      return;
    }

    setIsAiSaving(true);

    try {
      const existingIndex = rows.findIndex((item) => item.ingredientName.trim().toLowerCase() === aiPreview.ingredientName.trim().toLowerCase());
      const nextRows = [...rows];

      if (existingIndex >= 0) {
        nextRows[existingIndex] = { ...aiPreview, id: nextRows[existingIndex].id };
      } else {
        nextRows.unshift(aiPreview);
        setNextRowId((current) => current - 1);
      }

      await syncRows(nextRows, `食材特性已由 AI 建立並儲存：${aiPreview.ingredientName}`);
      setAiPreview(null);
      setAiIngredientName("");
      setAiErrorMessage(null);
    } catch (error) {
      setResult({
        ok: false,
        message: error instanceof Error ? error.message : "AI 食材特性儲存失敗。",
      });
    } finally {
      setIsAiSaving(false);
    }
  }

  async function handleSave() {
    if (hasValidationErrors) {
      setResult({ ok: false, message: "請先修正必填欄位錯誤後再送出。" });
      return;
    }

    setIsSaving(true);
    setResult(null);

    try {
      await syncRows(rows);
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

      <section className="trait-ai-panel">
        <div className="trait-ai-panel-head">
          <div>
            <p className="eyebrow">AI Trait Builder</p>
            <h2>用AI新增食材特性</h2>
          </div>
          <p className="trait-ai-panel-copy">輸入食材名稱後，系統會用 AI 依照特性欄位格式先產生預覽，再由你確認是否寫入資料庫。</p>
        </div>

        <div className="trait-ai-form">
          <label className="inventory-filter-field inventory-search-field trait-ai-input-field">
            <span>食材名稱</span>
            <input
              type="text"
              value={aiIngredientName}
              onChange={(event) => setAiIngredientName(event.target.value)}
              placeholder="例如：南瓜"
            />
          </label>

          <button type="button" className="button-primary trait-ai-submit" onClick={handleAiSubmit} disabled={isAiLoading || !aiIngredientName.trim()}>
            {isAiLoading ? "查詢中..." : "送出查詢"}
          </button>
        </div>

        {aiErrorMessage ? <p className="ai-menu-error trait-ai-error">{aiErrorMessage}</p> : null}
      </section>

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
              <th>類型</th>
              <th>纖維</th>
              <th>容易脹氣</th>
              <th>適合山羊便/硬便</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length ? (
              filteredRows.map((item) => (
                <tr key={item.id}>
                  <td className="trait-edit-cell trait-edit-cell-name" data-label="食材名稱">
                    <div className="edit-cell-field">
                      <input
                        value={item.ingredientName}
                        onChange={(event) => updateRow(item.id, "ingredientName", event.target.value)}
                        className={getFieldError(item.id, "ingredientName") ? "input-error" : undefined}
                      />
                      {getFieldError(item.id, "ingredientName") ? <p className="field-error-text">{getFieldError(item.id, "ingredientName")}</p> : null}
                    </div>
                  </td>
                  <td className="trait-edit-cell trait-edit-cell-type" data-label="類型">
                    <div className="edit-cell-field">
                      <input
                        value={item.primaryType}
                        onChange={(event) => updateRow(item.id, "primaryType", event.target.value)}
                        className={getFieldError(item.id, "primaryType") ? "input-error" : undefined}
                      />
                      {getFieldError(item.id, "primaryType") ? <p className="field-error-text">{getFieldError(item.id, "primaryType")}</p> : null}
                    </div>
                  </td>
                  <td className="trait-edit-cell trait-edit-cell-fiber" data-label="纖維">
                    <input value={item.fiberLevel ?? ""} onChange={(event) => updateRow(item.id, "fiberLevel", event.target.value)} />
                  </td>
                  <td className="trait-edit-cell trait-edit-cell-gas" data-label="容易脹氣">
                    <input value={item.easyGas ?? ""} onChange={(event) => updateRow(item.id, "easyGas", event.target.value)} />
                  </td>
                  <td className="trait-edit-cell trait-edit-cell-constipation" data-label="適合山羊便">
                    <input value={item.forConstipation ?? ""} onChange={(event) => updateRow(item.id, "forConstipation", event.target.value)} />
                  </td>
                  <td className="trait-edit-cell trait-edit-cell-action" data-label="操作">
                    <button type="button" className="button-secondary edit-row-delete" onClick={() => deleteRow(item.id)}>
                      刪除
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="empty-cell">
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

      {canUsePortal && result
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

      {canUsePortal && aiPreview
        ? createPortal(
            <div className="app-alert-overlay" onClick={() => setAiPreview(null)} role="presentation">
              <div className="app-alert-modal" role="dialog" aria-modal="true" aria-labelledby="ingredient-trait-ai-preview-title" onClick={(event) => event.stopPropagation()}>
                <div className="app-alert-head">
                  <div>
                    <p className="eyebrow">AI Trait Preview</p>
                    <h3 id="ingredient-trait-ai-preview-title">查詢到的食材特性</h3>
                  </div>
                  <button type="button" className="app-alert-close" onClick={() => setAiPreview(null)}>
                    關閉
                  </button>
                </div>

                <div className="trait-preview-grid">
                  <article className="sync-summary-card">
                    <strong>食材名稱</strong>
                    <p>{aiPreview.ingredientName}</p>
                  </article>
                  <article className="sync-summary-card">
                    <strong>主要類型</strong>
                    <p>{aiPreview.primaryType}</p>
                  </article>
                  <article className="sync-summary-card">
                    <strong>水溶性纖維</strong>
                    <p>{aiPreview.solubleFiber || "未填寫"}</p>
                  </article>
                  <article className="sync-summary-card">
                    <strong>非水溶性纖維</strong>
                    <p>{aiPreview.insolubleFiber || "未填寫"}</p>
                  </article>
                  <article className="sync-summary-card">
                    <strong>纖維</strong>
                    <p>{aiPreview.fiberLevel || "未填寫"}</p>
                  </article>
                  <article className="sync-summary-card">
                    <strong>容易脹氣</strong>
                    <p>{aiPreview.easyGas || "未填寫"}</p>
                  </article>
                  <article className="sync-summary-card">
                    <strong>適合山羊便/硬便</strong>
                    <p>{aiPreview.forConstipation || "未填寫"}</p>
                  </article>
                  <article className="sync-summary-card">
                    <strong>腹瀉時建議</strong>
                    <p>{aiPreview.forDiarrhea || "未填寫"}</p>
                  </article>
                  <article className="sync-summary-card">
                    <strong>適合感冒有痰</strong>
                    <p>{aiPreview.forPhlegm || "未填寫"}</p>
                  </article>
                  <article className="sync-summary-card">
                    <strong>試敏狀態</strong>
                    <p>{aiPreview.sensitivity || "未填寫"}</p>
                  </article>
                  <article className="sync-summary-card">
                    <strong>過敏/不適紀錄</strong>
                    <p>{aiPreview.adverseNotes || "未填寫"}</p>
                  </article>
                  <article className="sync-summary-card">
                    <strong>營養備註</strong>
                    <p>{aiPreview.nutritionNotes || "未填寫"}</p>
                  </article>
                </div>

                <div className="trait-preview-actions">
                  <button type="button" className="button-secondary trait-preview-button" onClick={() => setAiPreview(null)} disabled={isAiSaving}>
                    取消
                  </button>
                  <button type="button" className="button-primary trait-preview-button" onClick={handleAiConfirmSave} disabled={isAiSaving}>
                    {isAiSaving ? "儲存中..." : "確認並儲存"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}