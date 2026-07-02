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
- `drizzle-kit push` is interactive and not scriptable in this environment; for one-off new tables or constraint changes, apply the DDL manually via psql instead of trying to force a non-interactive push.
- Any per-tenant "unique" business identifier (document numbers, codes, etc.) must use a composite unique index on `(companyId, value)`, never a single-column `.unique()` — a bare column-level unique constraint is global across all tenants and silently blocks two different companies from ever using the same number/code.
- Two separate tables hold company-level data: `companies` (name/slug/logoUrl/address/phone/email/taxId/status, saved via PATCH /api/company/me) vs `companySettings` (faviconUrl/theme/tagline/currency/timezone/tax/businessHours/holidays/documentNumbering, saved via PATCH /api/company/settings). Don't assume a branding/config field lives on `companies` just because logoUrl does — check `shared/schema.ts` for which table actually declares it before wiring a new Settings field.
