"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const menuItems = [
  { href: "/", label: "首頁" },
  { href: "/inventory/edit", label: "編輯庫存頁" },
];

export function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="top-nav-wrap">
      <button type="button" className="menu-toggle-button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        Menu
      </button>
      {open ? (
        <nav className="menu-panel">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`menu-link ${pathname === item.href ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}