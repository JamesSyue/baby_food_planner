"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import type { MenuRecommendationResult } from "@/lib/ai-menu";

const DEFAULT_PROMPT = [
  "請依照以下規則幫我搭配副食品菜單：",
  "1. 總量 200 g。",
  "2. 每餐蛋白質只能 15g，請輪流搭配，不要好幾餐都相同蛋白質。",
  "3. 早餐澱粉 60g，晚餐澱粉 30g。",
  "4. 晚餐水果 20g。",
  "5. 健康狀態：正常。",
  "6. 不要使用庫存份數為 0、已用完、暫停使用、或有過敏/不適紀錄的食材。",
  "7. 請給我 2 天份的菜單。",
].join("\n");

type RecommendationResponse = {
  ok: boolean;
  message?: string;
  result?: MenuRecommendationResult;
};

type ConfirmInventoryResponse = {
  ok: boolean;
  message?: string;
};

type ActionFeedback = {
  ok: boolean;
  message: string;
};

type RecommendedMenu = MenuRecommendationResult["menus"][number];

const MEAL_TYPE_ORDER = ["早餐", "午餐", "下午點心", "晚餐", "宵夜"];

function getMealTypeOrder(mealType: string) {
  const index = MEAL_TYPE_ORDER.findIndex((item) => mealType.includes(item));
  return index === -1 ? MEAL_TYPE_ORDER.length : index;
}

export function AiMenuPlanner() {
  const router = useRouter();
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [result, setResult] = useState<MenuRecommendationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [confirmationFeedback, setConfirmationFeedback] = useState<ActionFeedback | null>(null);
  const [hasConfirmedInventory, setHasConfirmedInventory] = useState(false);
  const canUsePortal = typeof document !== "undefined";

  const daySlides = useMemo(() => {
    if (!result) {
      return [] as Array<{ day: string; meals: RecommendedMenu[] }>;
    }

    const grouped = new Map<string, RecommendedMenu[]>();

    for (const menu of result.menus) {
      const existing = grouped.get(menu.day) || [];
      existing.push(menu);
      grouped.set(menu.day, existing);
    }

    return Array.from(grouped.entries()).map(([day, meals]) => ({
      day,
      meals: [...meals].sort((left, right) => getMealTypeOrder(left.mealType) - getMealTypeOrder(right.mealType)),
    }));
  }, [result]);

  const activeDay = daySlides[currentDayIndex] || null;
  const isBusy = isLoading || isConfirming;

  useEffect(() => {
    if (!isBusy) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isBusy]);

  function moveDay(nextIndex: number) {
    setCurrentDayIndex(Math.max(0, Math.min(nextIndex, daySlides.length - 1)));
  }

  function handleTouchEnd(clientX: number) {
    if (touchStartX === null) {
      return;
    }

    const distance = clientX - touchStartX;
    const threshold = 48;

    if (distance <= -threshold) {
      moveDay(currentDayIndex + 1);
    }

    if (distance >= threshold) {
      moveDay(currentDayIndex - 1);
    }

    setTouchStartX(null);
  }

  async function handleSubmit() {
    setIsLoading(true);
    setErrorMessage(null);
    setConfirmationFeedback(null);
    setHasConfirmedInventory(false);
    setCurrentDayIndex(0);

    try {
      const response = await fetch("/api/recommendation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const json = (await response.json()) as RecommendationResponse;

      if (!response.ok || !json.ok || !json.result) {
        setResult(null);
        setErrorMessage(json.message || "AI 菜單建議產生失敗");
        return;
      }

      setResult(json.result);
    } catch {
      setResult(null);
      setErrorMessage("AI 菜單建議產生失敗，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmInventory() {
    if (!result || result.inventoryCheck.hasShortage || hasConfirmedInventory) {
      return;
    }

    setIsConfirming(true);
    setConfirmationFeedback(null);

    try {
      const response = await fetch("/api/recommendation/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ menus: result.menus }),
      });

      const json = (await response.json()) as ConfirmInventoryResponse;

      if (!response.ok || !json.ok) {
        setConfirmationFeedback({
          ok: false,
          message: json.message || "扣除庫存失敗，請稍後再試。",
        });
        return;
      }

      setHasConfirmedInventory(true);
      setConfirmationFeedback({
        ok: true,
        message: json.message || "已依照菜單扣除庫存。",
      });
      router.refresh();
    } catch {
      setConfirmationFeedback({
        ok: false,
        message: "扣除庫存失敗，請稍後再試。",
      });
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <section className="panel ai-menu-panel">
      <div className="panel-head ai-menu-panel-head">
        <div>
          <p className="eyebrow">AI Menu Planner</p>
          <h2>AI 副食品菜單建議</h2>
        </div>
        <p className="ai-menu-panel-copy">系統會自動把目前庫存、食材特性、規則與試敏紀錄一起帶入 Gemini。</p>
      </div>

      <div className="ai-menu-layout">
        <label className="ai-menu-prompt-field">
          <span>需求設定</span>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={12} />
        </label>

        <div className="ai-menu-action-wrap">
          <button type="button" className="button-primary ai-menu-submit" onClick={handleSubmit} disabled={isLoading || !prompt.trim()}>
            {isLoading ? "詢問中..." : "詢問AI"}
          </button>
        </div>

        <div className="ai-menu-result-panel">
          <div className="ai-menu-result-head">
            <span>AI 結果</span>
          </div>

          {errorMessage ? <p className="ai-menu-error">{errorMessage}</p> : null}

          {!errorMessage && !result ? (
            <div className="ai-menu-empty-state">
              <p>按下「詢問AI」後，右側會顯示 Gemini 依照目前庫存、食材特性、規則與試敏紀錄整理出的結構化菜單結果。</p>
            </div>
          ) : null}

          {result ? (
            <div className="ai-menu-result-body">
              <section className="ai-menu-overview-card">
                <h3>建議摘要</h3>
                <p>{result.overview}</p>
              </section>

              <section className="ai-menu-overview-card">
                <div className="ai-menu-card-head">
                  <div>
                    <h3>庫存核對</h3>
                    <p className="ai-menu-helper-copy">先以總需求克數比對現有庫存；確認扣庫存時會依規格換算成整份扣除。</p>
                  </div>
                  <span className={`badge ${result.inventoryCheck.hasShortage ? "badge-warn" : "badge-ok"}`}>
                    {result.inventoryCheck.hasShortage ? "有缺量" : "庫存足夠"}
                  </span>
                </div>

                {result.inventoryCheck.items.length ? (
                  <div className="ai-menu-inventory-audit">
                    {result.inventoryCheck.items.map((item) => (
                      <article
                        key={`${item.code || item.name}-${item.requiredGrams}`}
                        className={`ai-menu-audit-item ${item.isInsufficient ? "ai-menu-audit-item-warn" : "ai-menu-audit-item-ok"}`}
                      >
                        <div className="ai-menu-audit-item-head">
                          <strong>{item.name}</strong>
                          <span>{item.category}</span>
                        </div>
                        <p>
                          需求 {item.requiredGrams}g / 庫存 {item.availableGrams}g / 預計扣除 {item.deductStockUnits} 份
                        </p>
                        {item.isInsufficient ? (
                          <p>缺少 {item.shortageGrams}g，請先補庫存或調整菜單。</p>
                        ) : (
                          <p>扣除後預估剩餘 {item.remainingGrams}g。</p>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>目前沒有可核對的食材資料。</p>
                )}
              </section>

              {daySlides.length ? (
                <section className="ai-menu-day-slider">
                  <div className="ai-menu-day-slider-head">
                    <div>
                      <p className="ai-menu-card-kicker">Day Slide</p>
                      <h3>{activeDay?.day || "菜單"}</h3>
                    </div>
                    <div className="ai-menu-day-slider-actions">
                      <button type="button" className="button-secondary page-button" onClick={() => moveDay(currentDayIndex - 1)} disabled={currentDayIndex === 0}>
                        上一日
                      </button>
                      <button
                        type="button"
                        className="button-secondary page-button"
                        onClick={() => moveDay(currentDayIndex + 1)}
                        disabled={currentDayIndex >= daySlides.length - 1}
                      >
                        下一日
                      </button>
                    </div>
                  </div>

                  <div className="ai-menu-day-pagination" aria-label="日別切換">
                    {daySlides.map((slide, index) => (
                      <button
                        key={slide.day}
                        type="button"
                        className={`ai-menu-day-dot ${index === currentDayIndex ? "active" : ""}`}
                        onClick={() => moveDay(index)}
                        aria-label={`切換到 ${slide.day}`}
                        aria-pressed={index === currentDayIndex}
                      >
                        <span>{slide.day}</span>
                      </button>
                    ))}
                  </div>

                  <div
                    className="ai-menu-day-viewport"
                    onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
                    onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
                  >
                    <div className="ai-menu-day-track" style={{ transform: `translateX(-${currentDayIndex * 100}%)` }}>
                      {daySlides.map((slide) => (
                        <section key={slide.day} className="ai-menu-day-slide" aria-label={slide.day}>
                          <div className="ai-menu-cards">
                            {slide.meals.map((menu, index) => (
                              <article key={`${menu.day}-${menu.mealType}-${index}`} className="ai-menu-card">
                                <div className="ai-menu-card-head">
                                  <div>
                                    <p className="ai-menu-card-kicker">
                                      {menu.day} / {menu.mealType}
                                    </p>
                                    <h3>{menu.menuName}</h3>
                                  </div>
                                  <span className="badge">總克數 {menu.totalGrams}g</span>
                                </div>

                                <section className="ai-menu-card-section">
                                  <h4>食材清單</h4>
                                  <div className="ai-menu-ingredient-list">
                                    {menu.ingredients.map((ingredient, ingredientIndex) => (
                                      <div
                                        key={`${ingredient.name}-${ingredientIndex}`}
                                        className={`ai-menu-ingredient-item ${
                                          ingredient.inventoryStatus.isInsufficient ? "ai-menu-ingredient-item-warn" : "ai-menu-ingredient-item-ok"
                                        }`}
                                      >
                                        <strong>{ingredient.name}</strong>
                                        <span>
                                          {ingredient.category} / {ingredient.grams}g
                                        </span>
                                        <p>{ingredient.note || "無額外說明"}</p>
                                        <p className="ai-menu-ingredient-meta">
                                          {ingredient.inventoryStatus.isMatched
                                            ? `本餐 ${ingredient.inventoryStatus.requestedGrams}g / 全菜單 ${ingredient.inventoryStatus.totalPlannedGrams}g / 現有 ${ingredient.inventoryStatus.availableGrams}g`
                                            : "找不到對應庫存資料"}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </section>

                                <section className="ai-menu-card-section">
                                  <h4>搭配理由</h4>
                                  <p>{menu.reason}</p>
                                </section>

                                <section className="ai-menu-card-section">
                                  <h4>注意事項</h4>
                                  {menu.cautions.length ? (
                                    <ul className="ai-menu-note-list">
                                      {menu.cautions.map((item, cautionIndex) => (
                                        <li key={`${item}-${cautionIndex}`}>{item}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p>無</p>
                                  )}
                                </section>
                              </article>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="ai-menu-overview-card">
                <h3>整體注意事項</h3>
                {result.notes.length ? (
                  <ul className="ai-menu-note-list">
                    {result.notes.map((note, index) => (
                      <li key={`${note}-${index}`}>{note}</li>
                    ))}
                  </ul>
                ) : (
                  <p>無</p>
                )}
              </section>

              <section className="ai-menu-overview-card ai-menu-confirm-panel">
                <div className="ai-menu-card-head">
                  <div>
                    <h3>確認扣除庫存</h3>
                    <p className="ai-menu-helper-copy">確認後會依照本次菜單總需求，換算並同步扣除對應食材庫存份數。</p>
                  </div>
                  <button
                    type="button"
                    className="button-primary ai-menu-submit"
                    onClick={handleConfirmInventory}
                    disabled={isBusy || !result || result.inventoryCheck.hasShortage || hasConfirmedInventory}
                  >
                    {isConfirming ? "扣除中..." : hasConfirmedInventory ? "已扣除庫存" : "確認並扣除庫存"}
                  </button>
                </div>

                {result.inventoryCheck.hasShortage ? <p className="ai-menu-helper-copy">目前有缺量項目，請先補庫存或調整菜單後再扣除。</p> : null}
                {confirmationFeedback ? (
                  <p className={`ai-menu-confirm-feedback ${confirmationFeedback.ok ? "ai-menu-confirm-feedback-ok" : "ai-menu-confirm-feedback-error"}`}>
                    {confirmationFeedback.message}
                  </p>
                ) : null}
              </section>
            </div>
          ) : null}
        </div>
      </div>

      {canUsePortal && isBusy
        ? createPortal(
            <div className="ai-menu-loading-overlay" role="alertdialog" aria-modal="true" aria-live="assertive">
              <div className="ai-menu-loading-card">
                <div className="ai-menu-loading-spinner" aria-hidden="true" />
                <strong>{isLoading ? "AI 正在產生菜單" : "正在同步扣除庫存"}</strong>
                <p>{isLoading ? "請稍候，系統正在整合庫存、規則與試敏資料。" : "請稍候，系統正在更新資料庫與 Google Sheet。"}</p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}