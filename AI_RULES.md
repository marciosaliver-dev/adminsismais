# AI Rules — SISMAIS (Vite + React + Supabase)

This document defines the **tech stack** and **clear implementation rules** for working in this codebase.

## Tech stack (quick summary)
- **Vite** for dev server and build.
- **React 18 + TypeScript** for UI and app logic.
- **React Router DOM v6** for routing (routes live in `src/App.tsx`).
- **Tailwind CSS** for styling (utility-first; design tokens are HSL CSS vars in `src/index.css`).
- **shadcn/ui + Radix UI** for UI primitives (dialogs, tables, forms, etc.) located in `src/components/ui/*`.
- **TanStack React Query** for server state, caching, and mutations.
- **Supabase** (`@supabase/supabase-js`) for auth, database access, and Edge Functions (`supabase/functions/*`).
- **Zod** for form/input validation where needed.
- **Recharts** for charts and dashboards.
- **XLSX + jsPDF (+ autotable)** for exports (Excel and PDF generation).

---

## Core rules (what to use for what)

### 1) UI components (must follow)
- Use **shadcn/ui components** from `src/components/ui/*` first (Button, Card, Dialog, Table, Select, Tabs, etc.).
- Use **Radix UI behavior via shadcn wrappers** (do not add direct Radix unless a wrapper does not exist).
- Use **lucide-react** for icons.

✅ Preferred: `Button`, `Card`, `Dialog`, `Table`, `Badge`, `Select`, `Tabs`, `Tooltip`, `AlertDialog` from shadcn.  
🚫 Avoid: introducing new UI libraries (Material UI, Ant, Chakra, Bootstrap, etc.).

### 2) Styling and design system
- Use **Tailwind CSS classes** for all layout/spacing/typography/states.
- Respect the existing **SISMAIS design tokens** defined as HSL CSS variables in `src/index.css`.
- Prefer theme-driven colors: `bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`, etc.
- Keep components responsive using Tailwind breakpoints (e.g., `sm:`, `md:`, `lg:`).

🚫 Don’t add CSS frameworks or large custom CSS blocks unless absolutely necessary.

### 3) Routing
- All app routes must be declared in **`src/App.tsx`**.
- Use **React Router v6** patterns (`<Routes>`, `<Route>`, `<Navigate>`).
- Protected pages must be wrapped with **`<ProtectedRoute>`** and rendered inside **`<Layout>`** when applicable.
- Public auth route is `/auth`.

✅ Use `useNavigate`, `useParams`, `useSearchParams` for navigation and URL state.  
🚫 Don’t introduce a second router or move routing elsewhere.

### 4) Data fetching & mutations
- Use **React Query** (`useQuery`, `useMutation`) for all server reads/writes.
- Always set **good query keys** (include ids/filters) and call `invalidateQueries` after mutations.
- Keep query functions small and predictable; prefer selecting only required columns when possible.

✅ Use: `@tanstack/react-query`  
🚫 Avoid: ad-hoc global fetch state, or mixing different server-state libraries.

### 5) Backend access (Supabase)
- Use the shared client: `import { supabase } from "@/integrations/supabase/client";`
- Use Supabase for:
  - Auth (`supabase.auth.*`)
  - Database CRUD (`supabase.from(...).select/insert/update/delete`)
  - Edge Functions (`supabase.functions.invoke(...)`)
- Types: prefer `Tables`, `TablesInsert`, `TablesUpdate` from `src/integrations/supabase/types.ts`.

🚫 Don’t create additional Supabase clients or duplicate env usage.

### 6) Auth & access control
- Auth state is provided by `AuthProvider` (`src/hooks/useAuth.tsx`).
- Use `useAuth()` for user/session/profile and `isApproved`.
- Any page requiring auth must go through `ProtectedRoute`.

✅ Approved-user gating is enforced in `ProtectedRoute`.  
🚫 Don’t implement separate auth state in components.

### 7) Forms & validation
- Use **shadcn/ui inputs** (`Input`, `Label`, `Select`, `Checkbox`, etc.).
- Use **Zod** for validating user input; keep schemas near the form/page when simple.
- `react-hook-form` is available; use it for complex forms, but simple controlled inputs are OK when already used.

✅ Use: `zod` (+ optionally `react-hook-form` + `@hookform/resolvers`)  
🚫 Don’t introduce Yup or other validation libs.

### 8) Notifications / toasts
- Use the existing toast system from **`src/hooks/use-toast.ts`** and shadcn toaster components already wired in `src/App.tsx`.
- Prefer:
  - success toast on successful user actions (import/export/save)
  - destructive toast for failures/validation errors

✅ Use: `toast({ title, description, variant })`  
🚫 Avoid introducing a new toast library (Sonner is present but the app already uses the shadcn toast hook).

### 9) Dates, numbers, and formatting
- Use **date-fns** for date formatting/parsing.
- Be careful with timezone: this codebase often uses `"T12:00:00"` when creating `Date` from `YYYY-MM-DD`.
- For extrato parsing/formatting, prefer utilities in `src/lib/extratoUtils.ts` (especially `parseDateBR`, `formatDateBR`, `datePickerToString`).

✅ Use: `date-fns`, existing helpers.  
🚫 Avoid adding Moment.js or other date libraries.

### 10) Files, exports, and reports
- Use **XLSX** for Excel exports.
- Use **jsPDF + jspdf-autotable** for PDF exports.
- Keep exports deterministic and formatted for Portuguese/Brazil when applicable.

---

## Project structure rules
- Pages go in: `src/pages/*`
- Reusable components go in: `src/components/*`
- Shared utilities go in: `src/lib/*`
- Keep directory names lowercase.

---

## “Don’t do” list (consistency)
- Don’t add new component libraries, CSS frameworks, state managers, or data-fetch libraries.
- Don’t move routes out of `src/App.tsx`.
- Don’t bypass React Query for Supabase reads/writes in UI.
- Don’t create new Supabase client instances.