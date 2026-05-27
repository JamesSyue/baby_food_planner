"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";

type SyncSummary = {
  key: string;
  label: string;
  count: number;
  items: string[];
};

type SyncResponse = {
  ok: boolean;
  message?: string;
  updatedAt?: string;
  summaries?: SyncSummary[];
};

export function GoogleSheetSyncButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SyncResponse | null>(null);
  const canUsePortal = typeof document !== "undefined";

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

  async function handleSync() {
    setResult(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/google-sheet-sync", {
        method: "POST",
      });
      const json = (await response.json()) as SyncResponse;

      if (!response.ok || !json.ok) {
        setResult({ ok: false, message: json.message || "Google Sheet 同步失敗。" });
        return;
      }

      setResult(json);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setResult({
        ok: false,
        message: error instanceof Error ? error.message : "Google Sheet 同步失敗。",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {isLoading ? (
        <div className="sync-loading-overlay" role="alert" aria-live="assertive" aria-busy="true">
          <div className="sync-loading-alert">
            <span className="sync-spinner" aria-hidden="true" />
            <strong>正在從 Google Sheet 更新資料</strong>
            <p>請稍候，系統正在讀取唯一的 spreadsheet 並寫入資料庫，完成後會自動刷新頁面。</p>
          </div>
        </div>
      ) : null}

      <div className="sync-panel">
        <button
          className="button-primary sync-button"
          type="button"
          onClick={handleSync}
          disabled={isLoading || isPending}
        >
          {isLoading || isPending ? "同步中..." : "從 Google Sheet 更新資料庫"}
        </button>

        {isLoading || isPending ? <p className="sync-hint">同步進行中，請稍候。</p> : null}
      </div>

      {canUsePortal && result
        ? createPortal(
            <div className="app-alert-overlay" onClick={() => setResult(null)} role="presentation">
              <div
                className={`app-alert-modal ${result.ok ? "success" : "error"}`}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="sync-result-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="app-alert-head">
                  <div>
                    <p className="eyebrow">Google Sheet Sync</p>
                    <h3 id="sync-result-title">{result.ok ? "同步完成" : "同步失敗"}</h3>
                  </div>
                  <button type="button" className="app-alert-close" onClick={() => setResult(null)}>
                    關閉
                  </button>
                </div>

                {result.message ? <p className="app-alert-message">{result.message}</p> : null}
                {result.updatedAt ? <p className="app-alert-meta">更新時間：{new Date(result.updatedAt).toLocaleString("zh-TW")}</p> : null}

                {result.summaries?.length ? (
                  <div className="sync-summary-list">
                    {result.summaries.map((summary) => (
                      <article key={summary.key} className="sync-summary-card">
                        <strong>
                          {summary.label}：{summary.count} 筆
                        </strong>
                        <p>{summary.items.length ? summary.items.join("、") : "本次沒有可寫入的有效資料。"}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}