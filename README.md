# SampleSurf

SampleSurf is a local, single-user web app for tracking Amazon Influencer inventory items (samples vs purchased), dispositions, and tax-year summaries.

The app intentionally **does not** include scraping, storefront syncing, browser extensions, or automatic data pulling.

## SampleSurf V3 Highlights

- SampleSurf branding + logo favicon
- Lucide icon polish across navigation, forms, KPIs, and primary actions
- Amazon URL autofill on Add Item
  - local ASIN extraction (`/dp`, `/gp/product`, slug `/dp`, `a.co`)
  - server-side redirect resolution for short links
  - best-effort title/price fill with manual fallback if blocked
- Amazon title summarization for cleaner default item titles
- Reusable large calendar date picker (react-day-picker based)
- Route-match-safe sidebar active highlighting (no overlapping highlights)
- Light/Dark mode toggle (system-default with localStorage persistence)

## SampleSurf V4.0 Highlights

- Mobile-friendly "Scan Slip / Box" capture flow on Add Item
  - iPhone camera capture via `input[type=file]` with `capture="environment"`
  - photo preview with confirm/retake/cancel before upload
  - server OCR pipeline (`sharp` preprocess + `tesseract.js`)
  - ASIN extraction from OCR text (`B0` + 8 alphanumeric)
  - single ASIN auto-fills Add Item ASIN and triggers existing Amazon lookup flow
  - multi-ASIN result picker to choose which ASIN to use
- No image persistence in V4.0 (image processed in-memory only)

## SampleSurf V4.2 Highlights

- Video Tracker workflow (`/video-tracker`)
  - binary video status (`videoDone`)
  - quick Mark Done / Mark Not Done actions
  - oldest-first Needs Video queue with SLA days and days-open highlights
  - completed queue sorted by most recent completion
  - per-item video notes + SLA settings
- Mobile Dashboard Quick Add floating button (`+`) to jump to Add Item
- Icon split:
  - install/home-screen icon uses full-bleed square asset (`/public/app-icon-1024.png`)
  - in-app header/sidebar logo uses rounded asset (`/public/samplesurf-logo-rounded.png`)

## Stack

- Next.js (App Router) + TypeScript
- SQLite (local)
- Prisma ORM
- TailwindCSS
- Zod validation
- Recharts (dashboard analytics)
- react-day-picker (calendar date picker UI)
- @floating-ui/react (portal + collision-aware popovers)
- sharp (OCR image preprocessing)
- tesseract.js (OCR)
- Playwright E2E tests

## Core Accounting Rules

Each item has two separate tax events:

1. Receipt event
- `SAMPLE`: income recognized in tax year of `receivedDate` at `receiptValue` (FMV)
- `PURCHASED`: no income recognized at receipt (`receiptValue` is basis only)

2. Disposition event
- Disposition types: `KEPT`, `SOLD`, `GAVE_AWAY`
- Tax-year disposition lines include items where:
  - `dispositionType` is `SOLD` or `GAVE_AWAY`
  - `soldDate` falls in selected year
  - `SOLD` has proceeds present
  - `GAVE_AWAY` uses proceeds `0`
- `gainLoss = proceeds - basis`
- `basis = receiptValue`

Cross-year behavior is preserved:
- sample income recognized by `receivedDate` year
- gain/loss recognized by `soldDate` year

## Year Selector Behavior

A global Tax Year selector is available in the top bar.

- persisted in URL query: `?year=YYYY`
- persisted in localStorage key: `sample-ledger.taxYear`
- used across Dashboard, Tax Year view, and analytics charts

## Setup

1. Install Node.js 20+ and npm
2. Install dependencies

```bash
npm install
```

3. Configure environment

```bash
cp .env.example .env
```

4. Generate Prisma client and apply migration

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Run app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- Wave-inspired UI shell with top bar + sidebar
- SampleSurf logo in top bar and sidebar
- Global Tax Year context (URL + localStorage)
- Dashboard KPIs + Tax Summary (`Gross Income`, `Loss`, `Net Total`)
- Dashboard charts
  - Monthly Sample Income
  - Monthly Disposition Gain/Loss
  - Disposition Mix (for items received in selected year)
  - Top 10 Items by Receipt Value
- Add Item fast flow with disposition workflow (`KEPT` / `SOLD` / `GAVE_AWAY`)
- Add Item Amazon URL field with ASIN autofill + metadata lookup fallback
- Add Item camera scan flow (Scan Slip / Box) for OCR ASIN detection
- Inventory list with filters + inline disposition editor
- Item Details full editor + mark sold + duplicate + delete
- Item Details video settings (`videoDone`, `videoSlaDays`, `videoNotes`)
- Needs Attention queue + quick-fix actions
- Video Tracker queue for filming workflow
- Tax Year view with independent Section A and Section B
- CSV export
  - sample income lines
  - disposition lines
  - summary totals
- CSV import with mapping, preview, validation warnings, rejected-row report
- Backup/Restore via CSV dump

## CSV Import

Template file: `sample-import-template.csv`

Supported normalization:
- dates: `YYYY-MM-DD`, `MM/DD/YYYY`
- currency: `12.34`, `$12.34`
- acquisition types: `sample`, `purchased`, `bought`, etc.
- disposition types: `kept`, `sold`, `gave away`, `donated`, etc.

Rows with critical validation failures are rejected with reasons.
Rows with warnings are imported and appear in Needs Attention.

## Backup & Restore

- Backup: **Backup** page -> **Download Backup CSV**
- Restore: upload backup CSV on **Backup** page and confirm replacement
- Restore replaces all current items

## Testing

Run unit tests:

```bash
npm run test:unit
```

Run end-to-end tests:

```bash
npm run test:e2e
```

Included tests:
- ASIN URL extraction formats (`/dp`, `/gp/product`, slug, `a.co`)
- Amazon title summarization behavior
- Nav route matching behavior for exact/prefix rules
- OCR ASIN extraction and scan API payload behavior
- sample item in 2025 contributes to gross sample income in 2025
- same item set to `GAVE_AWAY` in 2026 contributes `-basis` loss in 2026 and affects net
- global year selector persists via URL and localStorage
