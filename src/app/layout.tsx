import type { Metadata } from "next";

import { TopNav } from "@/app/components/top-nav";
import { getLoggedInAccount } from "@/lib/auth";

import "./globals.css";

export const metadata: Metadata = {
  title: "Baby Food Planner",
  description: "Next.js + MySQL dashboard migrated from the original Apps Script baby food planner.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const accountPromise = getLoggedInAccount();

  return <RootLayoutContent accountPromise={accountPromise}>{children}</RootLayoutContent>;
}

async function RootLayoutContent({
  children,
  accountPromise,
}: Readonly<{
  children: React.ReactNode;
  accountPromise: Promise<string | null>;
}>) {
  const account = await accountPromise;

  return (
    <html lang="zh-Hant">
      <body>
        <TopNav loggedIn={Boolean(account)} />
        {children}
      </body>
    </html>
  );
}
