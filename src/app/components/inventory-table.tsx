"use client";

import { useEffect, useMemo, useState } from "react";

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

export function InventoryTable({ inventory }: InventoryTableProps) {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedInventory = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredInventory.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredInventory]);

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
              <th>食材</th>
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
                  <td>
                    <strong>{item.name}</strong>
                    <span>{item.code}</span>
                  </td>
                  <td>{item.category}</td>
                  <td>{item.specGrams}g</td>
                  <td>{item.stockUnits} 份</td>
                  <td>{item.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="empty-cell">
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
    </article>
  );
}