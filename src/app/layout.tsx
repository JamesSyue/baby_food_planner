import type { Metadata } from "next";
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
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
