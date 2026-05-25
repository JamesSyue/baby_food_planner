"use client";

import { useMemo, useState } from "react";

type FeedingRule = {
  id: number;
  code: string;
  item: string;
  mealType: string;
  category: string;
  limitGrams: number;
  checkType: string;
  notes: string | null;
};

type RulesTableProps = {
  rules: FeedingRule[];
};

export function RulesTable({ rules }: RulesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [mealTypeFilter, setMealTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const mealTypeOptions = useMemo(
    () => Array.from(new Set(rules.map((rule) => rule.mealType).filter(Boolean))).sort((left, right) => left.localeCompare(right, "zh-Hant")),
    [rules],
  );

  const categoryOptions = useMemo(
    () => Array.from(new Set(rules.map((rule) => rule.category).filter(Boolean))).sort((left, right) => left.localeCompare(right, "zh-Hant")),
    [rules],
  );

  const filteredRules = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return rules.filter((rule) => {
      const matchesKeyword =
        !keyword ||
        rule.code.toLowerCase().includes(keyword) ||
        rule.item.toLowerCase().includes(keyword) ||
        rule.mealType.toLowerCase().includes(keyword) ||
        rule.category.toLowerCase().includes(keyword) ||
        rule.checkType.toLowerCase().includes(keyword) ||
        rule.notes?.toLowerCase().includes(keyword);

      const matchesMealType = mealTypeFilter === "all" || rule.mealType === mealTypeFilter;
      const matchesCategory = categoryFilter === "all" || rule.category === categoryFilter;

      return matchesKeyword && matchesMealType && matchesCategory;
    });
  }, [categoryFilter, mealTypeFilter, rules, searchTerm]);

  return (
    <article className="panel detail-panel">
      <div className="panel-head detail-panel-head">
        <div>
          <p className="eyebrow">Rules</p>
          <h2>規則內容</h2>
        </div>
        <div className="inventory-pagination-summary">
          <span className="badge">共 {rules.length} 筆</span>
          <span className="badge">篩選後 {filteredRules.length} 筆</span>
        </div>
      </div>

      <div className="inventory-filters">
        <label className="inventory-filter-field inventory-search-field">
          <span>搜尋</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="搜尋代碼、項目、餐別、分類或檢查方式"
          />
        </label>

        <label className="inventory-filter-field">
          <span>餐別篩選</span>
          <select value={mealTypeFilter} onChange={(event) => setMealTypeFilter(event.target.value)}>
            <option value="all">全部餐別</option>
            {mealTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="inventory-filter-field">
          <span>分類篩選</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">全部分類</option>
            {categoryOptions.map((option) => (
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
              <th>代碼</th>
              <th>項目</th>
              <th>餐別</th>
              <th>分類</th>
              <th>限制克數</th>
              <th>檢查方式</th>
            </tr>
          </thead>
          <tbody>
            {filteredRules.length ? (
              filteredRules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.code}</td>
                  <td>
                    <strong>{rule.item}</strong>
                    {rule.notes ? <span>{rule.notes}</span> : null}
                  </td>
                  <td>{rule.mealType}</td>
                  <td>{rule.category}</td>
                  <td>{rule.limitGrams}g</td>
                  <td>{rule.checkType}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="empty-cell">
                  目前沒有符合條件的規則資料
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}