# Baby Food Planner Next.js

這個專案把 [original_project](../original_project) 的 Apps Script + Google Sheets 結構，改造成 Next.js App Router + MySQL + Prisma 的網站版本，保留以下核心模組：

- 食材庫存
- 食材特性
- 副食品規則
- 試敏紀錄
- 每日狀況
- 菜單規劃
- 庫存異動

首頁會顯示資料統計、庫存概覽、最近菜單規劃，以及一個依規則自動算出的菜單建議卡片。

## 技術選型

- Next.js 16 App Router
- Prisma ORM
- MySQL
- React Server Components
- Route Handlers for JSON API

## MySQL Schema

正式 schema 來源：

- [prisma/schema.prisma](./prisma/schema.prisma)
- [prisma/mysql-schema.sql](./prisma/mysql-schema.sql)

資料表包含：

- `InventoryItem`
- `IngredientTrait`
- `FeedingRule`
- `SensitivityRecord`
- `DailyCondition`
- `MenuPlan`
- `MenuPlanItem`
- `InventoryMovement`

## 本地開發

### 1. 準備 MySQL

先建立一個本地資料庫，例如：

```sql
CREATE DATABASE baby_food_planner CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 設定環境變數

修改 [.env](./.env) 的 `DATABASE_URL`，例如：

```bash
DATABASE_URL="mysql://root:password@127.0.0.1:3306/baby_food_planner"
```

### 3. 安裝與建表

```bash
npm install
npm run db:push
npm run db:seed
```

`db:seed` 會依照原本 Apps Script 的資料型態，隨機建立每個主要模組各 5 筆示範資料。

### 4. 啟動 Next.js

```bash
npm run dev
```

啟動後可測試：

- 網站首頁: `http://localhost:3000`
- JSON API: `http://localhost:3000/api/dashboard`
- 菜單建議 API: `http://localhost:3000/api/recommendation`

### 5. 建議的本地驗證

```bash
npm run lint
npm run build
```

如果想直接驗證 API：

```bash
curl http://localhost:3000/api/dashboard
curl http://localhost:3000/api/recommendation
```

## Zeabur 部署流程

### 1. 將程式碼推到 GitHub

把 `nextjs_app` 當成獨立專案推到 GitHub repository。

### 2. 在 Zeabur 建立專案

在 Zeabur 後台：

1. 建立新 Project
2. 匯入 GitHub repository
3. 新增一個 MySQL Service
4. 新增一個 Node.js / Next.js Service 指向本專案

### 3. 設定環境變數

在 Next.js Service 中設定：

```bash
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE
```

建議直接使用 Zeabur MySQL Service 提供的連線字串。

### 4. Build / Start 設定

通常 Zeabur 會自動辨識 Node 專案；若需要手動指定，可使用：

- Install Command: `npm ci`
- Build Command: `npm run build`
- Start Command: `npm run start`

如果 Zeabur 在 `npm install` 階段失敗，請不要把 `prisma generate` 放在 install hook。這個專案已改成只在 `npm run build` 時執行 Prisma generate，避免安裝階段因環境變數或資料庫服務尚未就緒而中斷。

另外建議在 `package.json` 指定 `node` engine，而不只指定 `npm`，讓 Zeabur 更容易選到符合 Next.js 16 與 Prisma 7 的執行環境。

### 5. 初始化資料庫

第一次部署後，進入 Zeabur 的 Shell 或 One-off Command 執行：

```bash
npm run db:push
npm run db:seed
```

如果你之後要改 schema，建議流程是：

1. 本地修改 [prisma/schema.prisma](./prisma/schema.prisma)
2. 本地驗證 `npm run db:push`
3. 重新部署到 Zeabur
4. 在 Zeabur 執行 `npm run db:push`

## 目前實作範圍

這一版重點是先完成「從 Apps Script 遷移到可部署的 Next.js + MySQL 架構」：

- 完整 Prisma schema
- 可直接用的 seed script
- 首頁 dashboard
- JSON API
- Zeabur 部署說明

如果下一步要接近原專案完整功能，建議優先做：

1. 補上 CRUD 表單與編輯頁
2. 把菜單規劃改成可儲存/刪除
3. 接回 OpenAI 菜單建議 API
