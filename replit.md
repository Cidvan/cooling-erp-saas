# CoolDesk

## Overview

CoolDesk is a multi-tenant SaaS ERP platform (originally built for JCAJ Cooling Solutions, now generalized) that lets multiple independent companies manage clients, service reports, quotations, and financial data under strict data isolation. It provides a complete business management solution with real-time analytics, client relationship management, and financial tracking through a professional web interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Multi-Tenancy
- **Companies Table**: Top-level `companies` table (name, slug, logo, contact info, status) represents each tenant business.
- **Data Isolation**: Every business table (clients, service reports, quotations, purchase orders, accounts receivable/payable, sales, expenses, etc.) has a required `companyId` foreign key. All storage-layer queries are scoped by `companyId`, and all API routes enforce tenant scoping via `requireCompany` middleware (reads `companyId` from the session).
- **Roles**: `super_admin` (platform-level, `companyId` is `null`), `owner`, `admin`, `staff`, `ojt` (all scoped to a single company).
- **Super Admin Console**: Accessible at `/admin/companies` (gated by `requireSuperAdmin` server-side and a `SuperAdminRoute` guard client-side). Lets platform admins create companies (optionally with an initial owner user) and view all tenants. Super admins are redirected here instead of the regular dashboard after login.
- **Bootstrapping**: Since no demo/test users are seeded, the very first `super_admin` account must be created via `npx tsx scripts/bootstrap-super-admin.ts <username> <password> [email]`.
- **Branding**: Authenticated views display the current company's name (fetched from `/api/company/me`), falling back to "CoolDesk" if unset. PDFs (service reports, quotations) also use the company name dynamically, falling back to "CoolDesk".

### Frontend Architecture
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter.
- **UI Components**: Radix UI primitives with shadcn/ui.
- **Styling**: Tailwind CSS, following Fluent Design principles.
- **State Management**: TanStack Query (React Query).
- **Build Tool**: Vite.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript.
- **API Design**: RESTful API structure with `/api` prefix.
- **Session Management**: Session-based authentication with `connect-pg-simple` for PostgreSQL. Session stores `userId` and `companyId` (null for super admins).

### Data Storage Solutions
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM.
- **Connection**: Neon Database serverless PostgreSQL with connection pooling.
- **Schema**: Centralized schema definitions.
- **Migrations**: Drizzle Kit.

### Design System
- **Design Philosophy**: Fluent Design principles.
- **Color Palette**: Professional blue primary colors with semantic status colors.
- **Typography**: Inter font family.
- **Component Architecture**: Modular component system.
- **Responsive Design**: Mobile-first approach with collapsible sidebar navigation.

### Authentication and Authorization
- **Authentication System**: Complete session-based authentication with landing page, login flow, and protected routes.
- **Session Management**: Express sessions with PostgreSQL storage using `connect-pg-simple`.
- **Password Security**: bcrypt password hashing for secure credential storage.
- **Auth Context**: React context (AuthProvider) manages authentication state across the application with automatic session checking on mount.
- **Automatic Routing**: AppRouter component handles authentication-based redirects - unauthenticated users accessing protected routes are redirected to landing page, authenticated users on public pages are redirected to dashboard.
- **User Interface**: Landing page at "/" serves as entry point, login page at "/login" for authentication, user dropdown menu in top navigation provides access to Profile, Settings, and Logout.
- **Theme Persistence**: User theme preference (light/dark) persists in localStorage across sessions.
- **Client-Side Navigation**: wouter-based routing with wouter Links in sidebar prevents full page reloads.
- **Initial User Setup**: In production, create the first admin user via database insert or a setup script. No demo/test users are seeded automatically.

### Production Deployment
- **Storage**: All data operations use PostgreSQL database via Drizzle ORM exclusively (no in-memory storage).
- **Activity Logging**: Uses session user data when available; falls back to "System" for automated processes.
- **Database-First Design**: Empty tables return empty arrays; no sample data is auto-seeded.
- **VPS Ready**: Application is ready for deployment to Hetzner or other VPS providers with PostgreSQL.

### Technical Implementations
- **Landing Page & Authentication Flow**: Public landing page at "/" with company branding, feature highlights, and call-to-action buttons. Login page at "/login" with username/password authentication. Successful login redirects to "/dashboard", logout redirects to landing page. User dropdown menu in top navigation (replacing sidebar Profile/Settings) provides access to Profile, Settings, and Logout options with toast notifications for login/logout actions.
- **Documents Page**: Centralized management at `/documents` with a tabbed interface for service reports, quotations, clients, accounts payable/receivable, sales, purchase orders, completed jobs, and cash flow. Includes conditional data fetching, client name mapping, consistent UI, Philippine Peso formatting, and status badges.
- **Client History Feature**: Detailed client view from the Clients page showing client information, service report history, and quotation history. Integrates with existing APIs and features status visualization, empty/loading states, and responsive design.
- **Purchase Orders Module**: Comprehensive PO management at `/purchase-orders` with auto-generated PO numbers, supplier management, dynamic item tables, automatic calculations (including discounts), payment status tracking (paid/pending), and recent POs display.
- **Accounts Payables Module**: Integrated accounts payable system with automatic AP creation when POs are created with "pending" payment status. Features auto-generated AP numbers, automatic synchronization with PO changes (status, amounts, dates, supplier), smart balance management (0 for paid, amount for pending), and complete handling of all status transitions (paid↔pending). Only pending POs create AP entries to avoid double-counting settled expenses.
- **Cash Flow Page**: Redesigned to a daily transaction table format at `/sales-financial/pl-cash-flow`. Includes operational expenses, sales entries, and accounts payables (from pending POs) with dedicated PO column and remarks. Features daily aggregation, net cash flow calculation (cash + bank + cheque - expenses - pending payables), monthly summary, and month filter. Data persists to PostgreSQL database. Purchase order remarks include an expandable button (three dots) that opens a detailed dialog showing all purchase orders for that date with complete item breakdowns (quantity, description, unit price, amount), supplier information, totals, and payment status. Table footer displays column name indicators at the bottom for easy reference without scrolling to the top.
- **Accounts Receivables Module**: Manages AR records with auto-generated AR numbers, auto-calculated balance, smart status management, edit functionality, integration with service reports for AR creation, and filtering options. Features payment terms support (COD, Net 7/15/30/45/60/90, Custom) with due date tracking. Due dates and payment terms display in AR tables for clear deadline visibility.
- **Sales-to-AR Conversion**: P&L Cash Flow page includes "Create as Account Receivable (On Credit)" checkbox in Add Sales dialog. When enabled, requires client selection and creates corresponding AR entry with selected payment terms and due date. Validation ensures client must be selected when AR creation is enabled. Supports automatic due date calculation based on payment terms.
- **Sales & Financial Dashboard**: Dashboard at `/sales-financial` with functional month range filter, real-time metrics (Total Sales, Receivables Due, Payables Due from pending APs), live charts (Sales Summary, P&L Graph showing actual revenue vs expenses), and tab-based navigation to sub-pages. Metrics and charts update automatically when POs/APs change. P&L Graph displays real financial data by month: revenue from sales entries and accepted quotations, expenses from operational expenses (including automatically created expenses from paid POs and APs), and calculated profit/loss.
- **Automatic Expense Tracking**: System automatically creates operational expense entries when Purchase Orders or Accounts Payable are marked as paid. When PO status changes from "Pending" to "Paid", an expense entry is created with the PO amount, supplier, and reference number. When AP balance is reduced or status changes to "Paid", an expense entry is created for the payment amount. All expense creations are logged in activity tracking. This ensures complete financial tracking where all payments (both income from AR and expenses from PO/AP) are automatically reflected in dashboard metrics and trend graphs.
- **Service Report Numbers**: Manual input for service report numbers with comprehensive validation. Frontend validates for required field and trims whitespace; backend enforces uniqueness with clear error messages. Users can enter custom report numbers (e.g., SR-001, SR-2024-001). Duplicate attempts return 409 Conflict with specific error message showing which number already exists.
- **Service Report Edit Capability**: Full edit flow accessible via the Edit button in the Documents page Service Reports tab. Navigates to `/service-reports/edit/:id` and pre-populates all fields: client, report details, AC units, technicians (with time tracking), line items, and recommendations. Report number is locked (read-only) in edit mode to prevent uniqueness conflicts. Service date uses local timezone (not UTC) to avoid off-by-one date display. Client section shows selected client with a "Change" button instead of an empty search box. "Clear All" button is hidden in edit mode. Save submits a PUT request that replaces line items, technicians, and AC units atomically. On success, redirects back to Documents. Cancel button returns to Documents without saving.
- **User Profile Management**: Profile page at `/profile` for editing user information (username, email, password). Features separate forms for profile information and password changes, secure password verification (requires current password), bcrypt password hashing, client and server-side validation, and user-friendly error messages.
- **Activity Logging System**: Comprehensive activity tracking across all major operations with database persistence to activityLogs table. Tracks userId, userName, activityType (created/updated/deleted), entityType, entityId, entityName, description, and timestamp. Activity logs are automatically created for all CRUD operations on clients, service reports, quotations, purchase orders, accounts receivable, sales entries, and operational expenses. Recent Activity component on Sales & Financial Dashboard displays last 15 activities with color-coded badges (green for created, blue for updated, red for deleted), entity-specific icons, user names, and relative timestamps in a scrollable container. Provides complete audit trail for compliance and operational visibility.
- **Multi-Technician Assignment for Service Reports**: Enables assigning multiple technicians to a single service report with individual time tracking and automatic duration calculation. Features dynamic technician cards with + button for adding new technicians, individual remove buttons for each technician, and automatic duration calculation (formatted as "Xh Ym") when timeStarted and timeEnded are set. Data persists to serviceTechnicians database table with proper foreign key relationships to serviceReports. Includes Zod validation with date coercion for datetime fields, database CRUD operations via Drizzle ORM, and maintains backward compatibility with original single-technician fields in serviceReports table. Duration calculation handles edge cases (invalid dates, zero duration, negative ranges) and formats results appropriately (hours only, minutes only, or combined).
- **PDF Generation for Service Reports**: Professional PDF preview and download functionality for service reports using @react-pdf/renderer. Accessible via `/service-reports/pdf-preview/:reportNumber` route with "Preview PDF" button in Documents page Service Reports table. Uses blob-based iframe rendering (not PDFViewer component) to avoid Chrome security blocks. Features comprehensive PDF layout with company branding (JCAJ Cooling Solutions), service report details, client information, AC unit details, multi-technician assignments with time tracking, service details (trouble reported/found, work done, recommendations), and line items table. PDF preview generates blob from PDF document, creates object URL, displays in iframe with proper memory cleanup. Download functionality saves as `Service_Report_{reportNumber}.pdf`. Backend API endpoints at `/api/service-reports/:reportId/line-items` and `/api/service-reports/:reportId/technicians` support data fetching. Layout includes professional styling with header/footer, color-coded sections, bordered technician cards, and properly formatted tables. Generated PDFs are print-ready and suitable for client distribution. Preview page includes loading states, error handling with retry button, and proper cleanup of object URLs to prevent memory leaks.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting.

### UI and Styling Libraries
- **Radix UI**: Accessible component primitives.
- **Recharts**: Chart library.
- **Lucide React**: Icon library.
- **Class Variance Authority**: Type-safe component variant management.
- **Tailwind CSS**: Utility-first CSS framework.
- **@react-pdf/renderer**: PDF document generation and rendering for service reports.

### Development Tools
- **TypeScript**: Static type checking.
- **ESBuild**: Fast JavaScript bundler.
- **PostCSS**: CSS processing.
- **Date-fns**: Date manipulation and formatting.

### Third-party Integrations
- **Google Fonts**: Inter font family.
- **Replit Development Banner**: Development environment integration.
- **WebSocket Support**: For real-time database connections.