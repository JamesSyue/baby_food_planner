"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const menuItems = [
  { href: "/", label: "首頁" },
  { href: "/inventory/edit", label: "編輯食材庫存" },
];

type TopNavProps = {
  loggedIn: boolean;
};

export function TopNav({ loggedIn }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/login", { method: "DELETE" });
    setOpen(false);
    router.replace("/login");
    router.refresh();
  }

  if (!loggedIn) {
    return null;
  }

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
          <button type="button" className="menu-link menu-logout-button" onClick={handleLogout}>
            登出
          </button>
        </nav>
      ) : null}
    </div>
  );
}