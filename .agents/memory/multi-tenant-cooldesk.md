---
name: Multi-tenant CoolDesk architecture
description: Tenant isolation model, super_admin bootstrapping, and role list for the CoolDesk ERP SaaS conversion.
---

CoolDesk (formerly JCAJ Cooling Solutions ERP) is multi-tenant: a top-level `companies` table, with every business table requiring a `companyId` and every storage/route call scoped by it.

**Why:** converting a single-tenant ERP to SaaS requires strict data isolation between tenants; `companyId` scoping was retrofitted onto every existing entity and query rather than introducing a separate schema-per-tenant approach, to keep migration low-risk on an empty DB.

**How to apply:**
- `users.companyId` is nullable — `null` means platform-level `super_admin`, not tied to any company. Roles in use: `super_admin`, `owner`, `admin`, `staff`, `ojt`.
- Any new business table/feature must include a required `companyId` and its storage methods/routes must filter by it (`requireCompany` middleware reads it from session).
- No demo/test users are seeded in this app (by design, stated in replit.md). The first `super_admin` must be created via `scripts/bootstrap-super-admin.ts <username> <password> [email]` — check this script exists before assuming any users exist in a fresh environment.
- Company display name is fetched client-side from `/api/company/me` with a "CoolDesk" fallback (used in TopNavigation and PDF documents) rather than hardcoding a single business's branding.
- `@react-pdf/renderer` documents render outside the app's `QueryClientProvider` tree, so PDF components cannot call `useQuery`/`useCurrency` internally — fetch settings (e.g. currency) in the calling page and pass them down as props to the PDF document component instead.
- `drizzle-kit push` is interactive and not scriptable in this environment; for one-off new tables, apply the DDL manually via psql instead of trying to force a non-interactive push.
