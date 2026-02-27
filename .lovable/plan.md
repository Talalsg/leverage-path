

## Batch Implementation: 4 Features

### 1. Error Boundary Component
**New file: `src/components/ErrorBoundary.tsx`**
- React class component wrapping the entire app in `App.tsx`
- Catches render errors, displays clean error screen with app branding, error message, and "Reload" button (`window.location.reload()`)
- Uses existing Card, Button components and design system

**Edit: `src/App.tsx`**
- Wrap everything inside `<ErrorBoundary>` at the outermost level

### 2. User Profile Page
**New file: `src/pages/Profile.tsx`**
- Shows user email (read-only from `useAuth`)
- Editable display name field, fetched/updated via `profiles` table
- Sign Out button (calls `signOut` from `useAuth`)
- Uses existing Card, Input, Button, Label components

**Edit: `src/App.tsx`**
- Add `/profile` route inside the protected layout

**Edit: `src/components/AppSidebar.tsx`**
- Replace the footer Sign Out button + email text with a clickable user avatar/icon linking to `/profile`
- Remove standalone Sign Out button (moved to Profile page)
- Keep AlertsPanel and ThemeToggle in footer

### 3. CSV Export (Deals + Portfolio)
**New file: `src/lib/csvExport.ts`**
- `downloadCSV(rows, columnDefs, filename)` utility: builds CSV string, creates Blob, triggers download
- Generic, reusable for any table

**Edit: `src/pages/Deals.tsx`**
- Add "Export CSV" button in header next to "Add Deal"
- On click: fetch ALL deals for user (no pagination), map to CSV columns (Company, Founder, Sector, Stage, AI Score, Valuation, Outcome, Date), call `downloadCSV`

**Edit: `src/pages/Portfolio.tsx`**
- Add "Export CSV" button in header next to "Add Position"
- Exports: Company, Sector, Equity %, Entry Valuation, Current Valuation, Status, Health, Runway

### 4. Skeleton Loading States
**Edit: `src/pages/Dashboard.tsx`**
- When `loading === true`, render Skeleton placeholders for stat cards (4 skeleton cards), charts area, quarterly focus, and activity feed

**Edit: `src/pages/Deals.tsx`**
- Add skeleton for QuickStats row while `tableLoading` or `kanbanLoading`

**Edit: `src/pages/Portfolio.tsx`**
- When `loading === true`, render skeleton for the 3 stat cards and the position grid

**Edit: `src/pages/Insights.tsx`**
- When `loading === true`, render skeleton for the 3 stat cards and the insight cards grid

All skeletons use the existing `<Skeleton />` component from `src/components/ui/skeleton.tsx`.

### Files Summary
- **New (3):** `ErrorBoundary.tsx`, `Profile.tsx`, `csvExport.ts`
- **Edit (6):** `App.tsx`, `AppSidebar.tsx`, `Deals.tsx`, `Portfolio.tsx`, `Dashboard.tsx`, `Insights.tsx`
- **No database changes.** Profiles table already has `display_name` column.

