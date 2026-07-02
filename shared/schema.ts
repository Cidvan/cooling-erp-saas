import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  taxId: text("tax_id"),
  status: text("status").notNull().default("active"), // active, inactive
  dateCreated: timestamp("date_created").defaultNow(),
  lastModified: timestamp("last_modified").defaultNow(),
});

// Per-company configuration: branding, regional settings, tax, business hours,
// document numbering, and template placeholders. One row per company.
export const companySettings = pgTable("company_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().unique(),

  // Branding
  faviconUrl: text("favicon_url"),
  theme: text("theme").default("default"),
  tagline: text("tagline"),

  // Regional
  currencyCode: text("currency_code").notNull().default("PHP"), // ISO 4217
  currencySymbol: text("currency_symbol").notNull().default("₱"),
  timezone: text("timezone").notNull().default("Asia/Manila"),

  // Business hours: { mon: {open, close, closed}, tue: {...}, ... }
  businessHours: jsonb("business_hours"),
  // Holiday calendar: [{ date: "2026-01-01", name: "New Year's Day" }, ...]
  holidays: jsonb("holidays"),

  // Tax configuration
  taxEnabled: boolean("tax_enabled").notNull().default(false),
  taxLabel: text("tax_label").default("VAT"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0.00"),

  // Document templates (identifier only — not a WYSIWYG editor)
  invoiceTemplate: text("invoice_template").default("default"),
  quotationTemplate: text("quotation_template").default("default"),
  serviceReportTemplate: text("service_report_template").default("default"),

  // Placeholders for future wiring (Notification Center task)
  emailTemplates: jsonb("email_templates"),
  notificationTemplates: jsonb("notification_templates"),

  // Configurable document numbering, keyed by document type:
  // { quotation: { prefix, padding, nextNumber, format }, invoice: {...}, ... }
  documentNumbering: jsonb("document_numbering"),

  dateCreated: timestamp("date_created").defaultNow(),
  lastModified: timestamp("last_modified").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // null companyId => platform-level super_admin, not tied to any company
  companyId: varchar("company_id"),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  role: text("role").notNull().default("staff"), // super_admin, owner, admin, staff, ojt
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email").notNull(),
  phone: text("phone").array().notNull().default(sql`ARRAY[]::text[]`),
  address: text("address").notNull(),
  clientType: text("client_type").notNull(), // residential, corporate, establishment
  firstTransactionDate: timestamp("first_transaction_date"),
  lastTransactionDate: timestamp("last_transaction_date"),
  totalValue: integer("total_value").default(0),
  status: text("status").notNull().default("active"), // active, inactive, pending
  dateCreated: timestamp("date_created").defaultNow(),
});

export const serviceReports = pgTable("service_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  clientId: varchar("client_id").notNull(),
  
  // Service Report Number (unique per company, not globally)
  reportNumber: text("report_number").notNull(),
  
  // Service Summary
  serviceDate: timestamp("service_date").notNull(),
  status: text("status").notNull(), // scheduled, in_progress, completed
  // AC Details
  acBrand: text("ac_brand"),
  acModel: text("ac_model"),
  acSerialNumber: text("ac_serial_number"),
  acLocation: text("ac_location"),
  
  // Technician Assignment
  technicianName: text("technician_name"),
  timeStarted: timestamp("time_started"),
  timeEnded: timestamp("time_ended"),
  duration: text("duration"), // calculated field stored as text (e.g., "2h 30m")
  
  // Service Details (Staff Input)
  troubleReported: text("trouble_reported"),
  troubleFound: text("trouble_found"),
  workDone: text("work_done"),
  recommendations: text("recommendations"),
  
  // Metadata
  dateCreated: timestamp("date_created").defaultNow(),
  lastModified: timestamp("last_modified").defaultNow(),
}, (table) => ({
  companyReportNumberUnique: uniqueIndex("service_reports_company_report_number_unique").on(table.companyId, table.reportNumber),
}));

export const serviceLineItems = pgTable("service_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceReportId: varchar("service_report_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitDescription: text("unit_description").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // quantity * unitPrice
  orderIndex: integer("order_index").default(0), // for maintaining order
});

export const serviceTechnicians = pgTable("service_technicians", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceReportId: varchar("service_report_id").notNull(),
  technicianName: text("technician_name").notNull(),
  timeStarted: timestamp("time_started"),
  timeEnded: timestamp("time_ended"),
  duration: text("duration"), // auto-calculated from timeStarted and timeEnded (e.g., "2h 30m")
  orderIndex: integer("order_index").default(0), // for maintaining order
});

export const serviceAcUnits = pgTable("service_ac_units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceReportId: varchar("service_report_id").notNull(),
  acBrand: text("ac_brand"),
  acModel: text("ac_model"),
  acSerialNumber: text("ac_serial_number"),
  acLocation: text("ac_location"),
  serviceDone: text("service_done"),
  orderIndex: integer("order_index").default(0),
});

export const quotations = pgTable("quotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  clientId: varchar("client_id").notNull(),
  
  // Quotation Basic Info (unique per company, not globally)
  quotationNumber: text("quotation_number").notNull(),
  quotationDate: timestamp("quotation_date").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  status: text("status").notNull().default("draft"), // draft, sent, accepted, rejected, expired
  
  // Business Details
  title: text("title").notNull(),
  description: text("description"),
  terms: text("terms"),
  notes: text("notes"),
  
  // Financial
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0.00"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default("0.00"),
  taxEnabled: boolean("tax_enabled").notNull().default(true),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0.00"),
  
  // Metadata
  dateCreated: timestamp("date_created").defaultNow(),
  lastModified: timestamp("last_modified").defaultNow(),
}, (table) => ({
  companyQuotationNumberUnique: uniqueIndex("quotations_company_quotation_number_unique").on(table.companyId, table.quotationNumber),
}));

export const quotationLineItems = pgTable("quotation_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationId: varchar("quotation_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitDescription: text("unit_description").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // quantity * unitPrice
  orderIndex: integer("order_index").default(0), // for maintaining order
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  clientId: varchar("client_id").notNull(),
  quotationId: varchar("quotation_id"), // reference to original quotation (optional)
  
  // Invoice Basic Info (unique per company, not globally)
  invoiceNumber: text("invoice_number").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").notNull().default("unpaid"), // unpaid, paid, overdue, cancelled
  
  // Business Details
  title: text("title").notNull(),
  description: text("description"),
  terms: text("terms"),
  notes: text("notes"),
  
  // Financial
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0.00"),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0.00"),
  
  // Metadata
  dateCreated: timestamp("date_created").defaultNow(),
  lastModified: timestamp("last_modified").defaultNow(),
}, (table) => ({
  companyInvoiceNumberUnique: uniqueIndex("invoices_company_invoice_number_unique").on(table.companyId, table.invoiceNumber),
}));

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitDescription: text("unit_description").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // quantity * unitPrice
  orderIndex: integer("order_index").default(0), // for maintaining order
});

export const accountsReceivables = pgTable("accounts_receivables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  
  // AR Number (auto-generated, unique per company)
  arNumber: text("ar_number").notNull(),
  
  // Basic Information
  date: timestamp("date").notNull(),
  clientId: varchar("client_id").notNull(),
  
  // Transaction Details
  srNumber: text("sr_number"), // Service Report Number
  ciNumber: text("ci_number"), // CI Number (Collection Invoice or similar)
  
  // Financial Details
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  firstPaymentAmount: decimal("first_payment_amount", { precision: 10, scale: 2 }).default("0.00"),
  firstPaymentDate: timestamp("first_payment_date"),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  
  // Payment Information
  orNumber: text("or_number"), // Official Receipt Number
  chequeNumber: text("cheque_number"),
  
  // Status
  status: text("status").notNull().default("unsettled"), // paid, waived, unsettled
  
  // Payment Terms
  dueDate: timestamp("due_date"), // When payment is due
  paymentTerms: text("payment_terms"), // e.g., "Net 30", "Net 60", "COD"
  
  // Metadata
  dateCreated: timestamp("date_created").defaultNow(),
  lastModified: timestamp("last_modified").defaultNow(),
}, (table) => ({
  companyArNumberUnique: uniqueIndex("accounts_receivables_company_ar_number_unique").on(table.companyId, table.arNumber),
}));

export const arPayments = pgTable("ar_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  arId: varchar("ar_id").notNull(),
  
  // Payment Details
  paymentNumber: integer("payment_number").notNull(), // 1 for 1st payment, 2 for 2nd, etc.
  paymentMode: text("payment_mode").notNull(), // cheque, cash, gcash_bank
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  
  // Mode-specific fields
  chequeNumber: text("cheque_number"), // For cheque mode
  referenceNumber: text("reference_number"), // For gcash/bank mode
  
  // Metadata
  dateCreated: timestamp("date_created").defaultNow(),
});

export const operationalExpenses = pgTable("operational_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  
  // Basic Information
  date: timestamp("date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  
  // Expense Details
  category: text("category").notNull(), // e.g., utilities, salaries, supplies, transportation
  paymentMethod: text("payment_method").notNull(), // cash, bank_gcash, cheque
  vendor: text("vendor"), // who was paid
  referenceNo: text("reference_no"), // receipt or reference number
  remarks: text("remarks"),
  
  // Metadata
  dateCreated: timestamp("date_created").defaultNow(),
});

export const salesEntries = pgTable("sales_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  
  // Basic Information
  date: timestamp("date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  
  // Payment Details
  paymentMethod: text("payment_method").notNull(), // cash, bank_gcash, cheque
  
  // Source Information
  sourceType: text("source_type"), // invoice, service_report, other
  sourceId: varchar("source_id"), // reference to invoice or service report ID
  remarks: text("remarks"),
  
  // Metadata
  dateCreated: timestamp("date_created").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  
  // User this notification is for
  userId: varchar("user_id").notNull(),
  
  // Notification Type
  type: text("type").notNull(), // birthday, receivable_aging, payment_due, etc.
  
  // Content
  title: text("title").notNull(),
  message: text("message").notNull(),
  
  // Related Entity
  relatedId: varchar("related_id"), // ID of client, receivable, etc.
  relatedType: text("related_type"), // client, receivable, invoice, etc.
  
  // Metadata (JSON for extra data like aging days, days until birthday, etc.)
  metadata: text("metadata"), // JSON string
  
  // Category for filtering in the Notification Center (system, sales, inventory, projects, finance, service)
  category: text("category").notNull().default("system"),
  
  // Status
  isRead: boolean("is_read").notNull().default(false),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  
  // User who performed the activity
  userId: varchar("user_id").notNull(),
  userName: text("user_name").notNull(),
  
  // Activity Details
  activityType: text("activity_type").notNull(), // created, updated, deleted
  entityType: text("entity_type").notNull(), // client, service_report, quotation, purchase_order, etc.
  entityId: varchar("entity_id"),
  entityName: text("entity_name"), // human-readable identifier (e.g., client name, PO number)
  description: text("description").notNull(),
  
  // Additional data (JSON string)
  metadata: text("metadata"),
  
  // Request context captured for the Audit Trail (from request headers)
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Before/after snapshot of changed fields for update operations (JSON string)
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  
  // Timestamp
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  role: true,
  companyId: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  dateCreated: true,
  lastModified: true,
});

export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  companyId: true,
  dateCreated: true,
  lastModified: true,
});

export const updateUserProfileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  companyId: true,
  dateCreated: true,
}).extend({
  firstTransactionDate: z.coerce.date().optional(),
  lastTransactionDate: z.coerce.date().optional(),
  phone: z.array(z.string().min(1)).min(1, "At least one phone number is required"),
});

export const insertServiceReportSchema = createInsertSchema(serviceReports).omit({
  id: true,
  companyId: true,
  dateCreated: true,
  lastModified: true,
}).extend({
  // Handle date strings from JSON by coercing them to Date objects.
  // Report number is optional here; when blank, the server auto-generates one
  // using the company's configured document numbering (defaults to manual entry).
  reportNumber: z.string().optional(),
  serviceDate: z.coerce.date(),
  timeStarted: z.coerce.date().optional(),
  timeEnded: z.coerce.date().optional(),
});

export const insertServiceLineItemSchema = createInsertSchema(serviceLineItems).omit({
  id: true,
});

export const insertServiceTechnicianSchema = createInsertSchema(serviceTechnicians).omit({
  id: true,
}).extend({
  // Handle date strings from JSON by coercing them to Date objects
  timeStarted: z.coerce.date().optional(),
  timeEnded: z.coerce.date().optional(),
});

export const insertServiceAcUnitSchema = createInsertSchema(serviceAcUnits).omit({
  id: true,
});

export const insertQuotationSchema = createInsertSchema(quotations).omit({
  id: true,
  companyId: true,
  dateCreated: true,
  lastModified: true,
}).extend({
  // Handle date strings from JSON by coercing them to Date objects
  quotationNumber: z.string().optional(),
  quotationDate: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  title: z.string().optional(),
});

export const insertQuotationLineItemSchema = createInsertSchema(quotationLineItems).omit({
  id: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  companyId: true,
  dateCreated: true,
  lastModified: true,
}).extend({
  // Handle date strings from JSON by coercing them to Date objects
  invoiceNumber: z.string().optional(),
  invoiceDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  title: z.string().optional(),
});

export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).omit({
  id: true,
});

export const insertAccountsReceivableSchema = createInsertSchema(accountsReceivables).omit({
  id: true,
  companyId: true,
  arNumber: true,
  dateCreated: true,
  lastModified: true,
}).extend({
  // Handle date strings from JSON by coercing them to Date objects
  date: z.coerce.date(),
  firstPaymentDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
});

export const insertArPaymentSchema = createInsertSchema(arPayments).omit({
  id: true,
  dateCreated: true,
}).extend({
  // Handle date strings from JSON by coercing them to Date objects
  paymentDate: z.coerce.date(),
});

export const insertOperationalExpenseSchema = createInsertSchema(operationalExpenses).omit({
  id: true,
  companyId: true,
  dateCreated: true,
}).extend({
  date: z.coerce.date(),
  amount: z.string(),
});

export const insertSalesEntrySchema = createInsertSchema(salesEntries).omit({
  id: true,
  companyId: true,
  dateCreated: true,
}).extend({
  date: z.coerce.date(),
  amount: z.string(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  
  // PO Number (auto-generated, unique per company)
  poNumber: text("po_number").notNull(),
  
  // Basic Information
  date: timestamp("date").notNull(),
  supplierName: text("supplier_name").notNull(),
  supplierAddress: text("supplier_address").notNull(),
  attention: text("attention"),
  
  // Summary Calculations
  totalUnits: integer("total_units").notNull().default(0),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0.00"),
  grandTotal: decimal("grand_total", { precision: 10, scale: 2 }).notNull().default("0.00"),
  
  // Status
  status: text("status").notNull().default("draft"), // draft, sent, converted
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid
  
  // Metadata
  dateCreated: timestamp("date_created").defaultNow(),
  lastModified: timestamp("last_modified").defaultNow(),
}, (table) => ({
  companyPoNumberUnique: uniqueIndex("purchase_orders_company_po_number_unique").on(table.companyId, table.poNumber),
}));

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseOrderId: varchar("purchase_order_id").notNull(),
  qty: integer("qty").notNull().default(1),
  particulars: text("particulars").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // qty * unitPrice
  orderIndex: integer("order_index").default(0), // for maintaining order
});

export const accountsPayables = pgTable("accounts_payables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  
  // AP Number (auto-generated, unique per company)
  apNumber: text("ap_number").notNull(),
  
  // Basic Information
  date: timestamp("date").notNull(),
  supplierName: text("supplier_name").notNull(),
  
  // Reference to Purchase Order
  purchaseOrderId: varchar("purchase_order_id"),
  poNumber: text("po_number"), // Denormalized for easier display
  
  // Financial Details
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  
  // Payment Information
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }).default("0.00"),
  paymentDate: timestamp("payment_date"),
  paymentMethod: text("payment_method"), // cash, bank_gcash, cheque
  referenceNo: text("reference_no"),
  
  // Additional Details
  remarks: text("remarks"),
  bankDetails: text("bank_details"), // Supplier's bank account details
  
  // Status
  status: text("status").notNull().default("pending"), // pending, paid, partial
  
  // Metadata
  dateCreated: timestamp("date_created").defaultNow(),
  lastModified: timestamp("last_modified").defaultNow(),
}, (table) => ({
  companyApNumberUnique: uniqueIndex("accounts_payables_company_ap_number_unique").on(table.companyId, table.apNumber),
}));

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  companyId: true,
  poNumber: true,
  dateCreated: true,
  lastModified: true,
}).extend({
  // Handle date strings from JSON by coercing them to Date objects
  date: z.coerce.date(),
});

export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({
  id: true,
});

export const insertAccountsPayableSchema = createInsertSchema(accountsPayables).omit({
  id: true,
  companyId: true,
  apNumber: true,
  dateCreated: true,
  lastModified: true,
}).extend({
  // Handle date strings from JSON by coercing them to Date objects
  date: z.coerce.date(),
  paymentDate: z.coerce.date().optional(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  companyId: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  companyId: true,
  timestamp: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type UpdatePassword = z.infer<typeof updatePasswordSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type ServiceReport = typeof serviceReports.$inferSelect;
export type InsertServiceReport = z.infer<typeof insertServiceReportSchema>;
export type ServiceLineItem = typeof serviceLineItems.$inferSelect;
export type InsertServiceLineItem = z.infer<typeof insertServiceLineItemSchema>;
export type ServiceTechnician = typeof serviceTechnicians.$inferSelect;
export type InsertServiceTechnician = z.infer<typeof insertServiceTechnicianSchema>;
export type ServiceAcUnit = typeof serviceAcUnits.$inferSelect;
export type InsertServiceAcUnit = z.infer<typeof insertServiceAcUnitSchema>;
export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type QuotationLineItem = typeof quotationLineItems.$inferSelect;
export type InsertQuotationLineItem = z.infer<typeof insertQuotationLineItemSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;
export type AccountsReceivable = typeof accountsReceivables.$inferSelect;
export type InsertAccountsReceivable = z.infer<typeof insertAccountsReceivableSchema>;
export type ArPayment = typeof arPayments.$inferSelect;
export type InsertArPayment = z.infer<typeof insertArPaymentSchema>;
export type OperationalExpense = typeof operationalExpenses.$inferSelect;
export type InsertOperationalExpense = z.infer<typeof insertOperationalExpenseSchema>;
export type SalesEntry = typeof salesEntries.$inferSelect;
export type InsertSalesEntry = z.infer<typeof insertSalesEntrySchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type AccountsPayable = typeof accountsPayables.$inferSelect;
export type InsertAccountsPayable = z.infer<typeof insertAccountsPayableSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
