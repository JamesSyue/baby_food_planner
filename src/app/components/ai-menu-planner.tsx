"use client";

import { useState } from "react";

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

export function AiMenuPlanner() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [result, setResult] = useState<MenuRecommendationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setIsLoading(true);
    setErrorMessage(null);

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

              <div className="ai-menu-cards">
                {result.menus.map((menu, index) => (
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
                          <div key={`${ingredient.name}-${ingredientIndex}`} className="ai-menu-ingredient-item">
                            <strong>{ingredient.name}</strong>
                            <span>
                              {ingredient.category} / {ingredient.grams}g
                            </span>
                            <p>{ingredient.note || "無額外說明"}</p>
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
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}