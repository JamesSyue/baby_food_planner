"use client";

import { useMemo, useState } from "react";

type SensitivityRecord = {
  id: number;
  recordedOn: Date | string;
  ingredientName: string;
  grams: number;
  daySequence: number;
  result: string | null;
  symptomNotes: string | null;
  isCompleted: boolean;
};

type SensitivityTableProps = {
  records: SensitivityRecord[];
};

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function SensitivityTable({ records }: SensitivityTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const [completionFilter, setCompletionFilter] = useState("all");

  const resultOptions = useMemo(
    () => Array.from(new Set(records.map((record) => record.result).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right, "zh-Hant")),
    [records],
  );

  const filteredRecords = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return records.filter((record) => {
      const matchesKeyword =
        !keyword ||
        record.ingredientName.toLowerCase().includes(keyword) ||
        record.result?.toLowerCase().includes(keyword) ||
        record.symptomNotes?.toLowerCase().includes(keyword) ||
        String(record.daySequence).includes(keyword);

      const matchesResult = resultFilter === "all" || (resultFilter === "empty" ? !record.result : record.result === resultFilter);
      const matchesCompletion =
        completionFilter === "all" ||
        (completionFilter === "completed" ? record.isCompleted : !record.isCompleted);

      return matchesKeyword && matchesResult && matchesCompletion;
    });
  }, [completionFilter, records, resultFilter, searchTerm]);

  return (
    <article className="panel detail-panel">
      <div className="panel-head detail-panel-head">
        <div>
          <p className="eyebrow">Sensitivity</p>
          <h2>試敏紀錄</h2>
        </div>
        <div className="inventory-pagination-summary">
          <span className="badge">共 {records.length} 筆</span>
          <span className="badge">篩選後 {filteredRecords.length} 筆</span>
        </div>
      </div>

      <div className="inventory-filters">
        <label className="inventory-filter-field inventory-search-field">
          <span>搜尋</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="搜尋食材、結果、備註或天數"
          />
        </label>

        <label className="inventory-filter-field">
          <span>結果篩選</span>
          <select value={resultFilter} onChange={(event) => setResultFilter(event.target.value)}>
            <option value="all">全部結果</option>
            <option value="empty">未填寫</option>
            {resultOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="inventory-filter-field">
          <span>完成狀態</span>
          <select value={completionFilter} onChange={(event) => setCompletionFilter(event.target.value)}>
            <option value="all">全部狀態</option>
            <option value="completed">已完成</option>
            <option value="pending">進行中</option>
          </select>
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>食材</th>
              <th>克數</th>
              <th>天數</th>
              <th>結果</th>
              <th>完成狀態</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length ? (
              filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td>{dateFormatter.format(new Date(record.recordedOn))}</td>
                  <td>
                    <strong>{record.ingredientName}</strong>
                    {record.symptomNotes ? <span>{record.symptomNotes}</span> : null}
                  </td>
                  <td>{record.grams}g</td>
                  <td>第 {record.daySequence} 天</td>
                  <td>{record.result || "未填寫"}</td>
                  <td>{record.isCompleted ? "已完成" : "進行中"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="empty-cell">
                  目前沒有符合條件的試敏紀錄
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}