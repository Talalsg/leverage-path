

## Empty States Enhancement

Each page already has basic empty state text. The plan upgrades them to meaningful, branded empty states with icons, descriptive copy, and action buttons.

### Changes

**`src/components/DealsTable.tsx`** (lines 127-132)
- Replace "No deals found" with an icon (Target), heading, description ("No deals yet. Add your first deal or share your intake form."), and an "Add Deal" action hint.

**`src/pages/Deals.tsx`** (lines 630-633, Kanban empty columns)
- Keep the per-column "No deals" text as-is (it's contextual per stage). No change needed here.

**`src/pages/Portfolio.tsx`** (lines 305-307)
- Replace the simple text card with an icon (Briefcase), heading "No positions yet", description "Close a deal to add your first equity position.", and prompt to use the Add Position button.

**`src/pages/Insights.tsx`** (lines 331-333)
- Replace with icon (Lightbulb), heading "No insights yet", description "Write your first piece. Capture ideas, draft content, and track engagement.", contextual filter message when filters active.

**`src/pages/Ecosystem.tsx`** (lines 271-273)
- Replace with icon (Users), heading "No contacts yet", description "Add your first relationship. Build your network of founders, investors, and advisors.", contextual filter message when filters active.

All empty states will:
- Use existing Card/CardContent components
- Include a relevant Lucide icon (already imported in each file)
- Show different copy when filters are active ("No results match your filters. Try adjusting your search.")
- Use muted-foreground text with the dashed border card style already in use

**5 files edited, 0 new files.**

