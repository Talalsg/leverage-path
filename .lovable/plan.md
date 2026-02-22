

# Optimizing Deal Flow for 1,000+ Annual Deals

## The Problem

The current Deals page has three critical bottlenecks when scaling to 1,000+ deals:

1. **Data fetch limit**: The query fetches all deals at once, but the database has a default 1,000-row cap -- meaning you'd silently lose deals from view.
2. **Kanban overload**: Columns like "Review" could have 500+ cards, making the board unusable for scanning and decision-making.
3. **No list/table view**: When you need to quickly scan, sort, and triage hundreds of deals, a Kanban board is the wrong tool.

## The Solution

### 1. Add a Table View (Primary Change)

Add a new "Table" tab alongside the existing Pipeline/Kanban view. This becomes the default power-user view for high-volume deal management:

- Sortable columns: Company, Sector, Stage, AI Score, Valuation, Date, Outcome
- Compact rows showing key data at a glance
- Inline stage/outcome dropdowns (same as Kanban cards)
- Row click opens the existing Deal Details modal
- Checkbox column for multi-select comparison (reuses existing logic)

### 2. Server-Side Pagination

Replace the single `select('*')` call with paginated fetching:

- 50 deals per page (configurable)
- Page navigation controls at bottom of table
- Server-side filtering: push stage, sector, and outcome filters into the database query instead of filtering 1,000+ records client-side
- Search uses `.ilike()` on company_name, sector, founder_name

### 3. Sort Controls

- Click column headers to sort by any field (ai_score, created_at, valuation, company_name)
- Sort direction toggle (asc/desc)
- Sort is pushed to the database query for efficiency

### 4. Quick Stats Bar

A compact summary row above the table showing:
- Total deals count
- Deals by stage (Review: 342, Evaluating: 89, etc.)
- Average AI score
- This month's new deals count

### 5. Kanban Stays But Gets Smarter

The Kanban view remains for visual pipeline management but gets a cap:
- Show only the 20 most recent deals per column
- "Show all X deals" link at bottom of each column
- Or filter to a specific time range (This month / This quarter / This year)

---

## Technical Details

### Files to modify:
- **`src/pages/Deals.tsx`** -- Add table view tab, server-side pagination state, sort state, refactor `fetchDeals` to accept pagination/filter/sort params
- **`src/components/DealsTable.tsx`** (new) -- Sortable table component with inline controls
- **`src/components/DealsPagination.tsx`** (new) -- Pagination controls using existing pagination UI components
- **`src/components/DealsQuickStats.tsx`** (new) -- Summary stats bar

### Database query changes:
- Use `.range(from, to)` for pagination
- Use `.order(column, { ascending })` for sorting
- Push filters server-side: `.eq('stage', stage)`, `.ilike('company_name', '%query%')`
- Separate count query using `.select('*', { count: 'exact', head: true })` to get total without fetching all rows

### No database migrations needed
The existing schema supports all of this. No new tables or columns required.

