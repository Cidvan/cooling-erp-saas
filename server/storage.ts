import { 
  type User, type InsertUser, 
  type Company, type InsertCompany,
  type CompanySettings, type InsertCompanySettings,
  type Client, type InsertClient, 
  type ServiceReport, type InsertServiceReport, 
  type ServiceLineItem, type InsertServiceLineItem, 
  type ServiceTechnician, type InsertServiceTechnician,
  type ServiceAcUnit, type InsertServiceAcUnit, 
  type Quotation, type InsertQuotation, 
  type QuotationLineItem, type InsertQuotationLineItem, 
  type Invoice, type InsertInvoice, 
  type InvoiceLineItem, type InsertInvoiceLineItem, 
  type AccountsReceivable, type InsertAccountsReceivable, 
  type ArPayment, type InsertArPayment, 
  type OperationalExpense, type InsertOperationalExpense, 
  type SalesEntry, type InsertSalesEntry, 
  type PurchaseOrder, type InsertPurchaseOrder, 
  type PurchaseOrderItem, type InsertPurchaseOrderItem, 
  type AccountsPayable, type InsertAccountsPayable, 
  type Notification, type InsertNotification, 
  type ActivityLog, type InsertActivityLog,
  type Attachment, type InsertAttachment,
  users,
  companies,
  companySettings,
  clients, 
  serviceReports,
  serviceLineItems,
  serviceTechnicians,
  serviceAcUnits,
  quotations,
  quotationLineItems,
  invoices,
  invoiceLineItems,
  accountsReceivables, 
  arPayments,
  operationalExpenses,
  salesEntries,
  purchaseOrders, 
  purchaseOrderItems,
  accountsPayables, 
  notifications, 
  activityLogs,
  attachments,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, inArray, gte, lte, isNull, isNotNull } from "drizzle-orm";

export type DocumentType = "quotation" | "invoice" | "purchaseOrder" | "serviceReport" | "accountsReceivable" | "accountsPayable";

interface DocNumberingConfig {
  prefix: string;
  padding: number;
  nextNumber: number;
  format: string; // supports {PREFIX}, {YEAR}, {SEQ}
}

const DEFAULT_NUMBERING: Record<DocumentType, Omit<DocNumberingConfig, "nextNumber">> = {
  quotation: { prefix: "QT", padding: 6, format: "{PREFIX}-{YEAR}-{SEQ}" },
  invoice: { prefix: "INV", padding: 6, format: "{PREFIX}-{YEAR}-{SEQ}" },
  purchaseOrder: { prefix: "PO", padding: 3, format: "{PREFIX}-{SEQ}" },
  serviceReport: { prefix: "SR", padding: 6, format: "{PREFIX}-{YEAR}-{SEQ}" },
  accountsReceivable: { prefix: "AR", padding: 3, format: "{PREFIX}-{SEQ}" },
  accountsPayable: { prefix: "AP", padding: 3, format: "{PREFIX}-{SEQ}" },
};

function formatDocumentNumber(config: DocNumberingConfig, seq: number, date: Date = new Date()): string {
  const seqStr = String(seq).padStart(config.padding, "0");
  return config.format
    .replace("{PREFIX}", config.prefix)
    .replace("{YEAR}", String(date.getFullYear()))
    .replace("{SEQ}", seqStr);
}

function nextSeqFromExisting(numbers: string[], prefix: string): number {
  const nums = numbers
    .filter((n) => typeof n === "string" && n.startsWith(`${prefix}-`))
    .map((n) => parseInt(n.split("-")[1], 10))
    .filter((n) => !isNaN(n));
  return nums.length > 0 ? Math.max(...nums) + 1 : 1;
}

export interface IStorage {
  // Company methods
  getCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  getCompanyBySlug(slug: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: string): Promise<boolean>;

  // Company Settings methods
  getCompanySettings(companyId: string): Promise<CompanySettings>;
  updateCompanySettings(companyId: string, settings: Partial<InsertCompanySettings>): Promise<CompanySettings>;
  generateDocumentNumber(companyId: string, docType: DocumentType): Promise<string>;

  // User methods
  getUsers(): Promise<User[]>;
  getUsersByCompany(companyId: string): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: string, data: { username?: string; email?: string | null }): Promise<User | undefined>;
  updateUserPassword(id: string, newPassword: string): Promise<boolean>;
  
  // Client methods
  getClients(companyId: string): Promise<Client[]>;
  getClient(id: string, companyId: string): Promise<Client | undefined>;
  createClient(companyId: string, client: InsertClient): Promise<Client>;
  updateClient(id: string, companyId: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string, companyId: string): Promise<boolean>;
  softDeleteClient(id: string, companyId: string): Promise<boolean>;
  restoreClient(id: string, companyId: string): Promise<boolean>;
  getDeletedClients(companyId: string): Promise<Client[]>;
  
  // Service Report methods
  getServiceReports(companyId: string): Promise<ServiceReport[]>;
  getServiceReport(id: string, companyId: string): Promise<ServiceReport | undefined>;
  getServiceReportsByClientId(clientId: string, companyId: string): Promise<ServiceReport[]>;
  createServiceReport(companyId: string, report: InsertServiceReport): Promise<ServiceReport>;
  updateServiceReport(id: string, companyId: string, report: Partial<InsertServiceReport>): Promise<ServiceReport | undefined>;
  deleteServiceReport(id: string, companyId: string): Promise<boolean>;
  softDeleteServiceReport(id: string, companyId: string): Promise<boolean>;
  restoreServiceReport(id: string, companyId: string): Promise<boolean>;
  getDeletedServiceReports(companyId: string): Promise<ServiceReport[]>;
  
  // Service Line Item methods
  getServiceLineItems(serviceReportId: string): Promise<ServiceLineItem[]>;
  createServiceLineItem(item: InsertServiceLineItem): Promise<ServiceLineItem>;
  updateServiceLineItem(id: string, item: Partial<InsertServiceLineItem>): Promise<ServiceLineItem | undefined>;
  deleteServiceLineItem(id: string): Promise<boolean>;
  deleteServiceLineItemsByReportId(serviceReportId: string): Promise<boolean>;
  
  // Service Technician methods
  getServiceTechnicians(serviceReportId: string): Promise<ServiceTechnician[]>;
  createServiceTechnician(technician: InsertServiceTechnician): Promise<ServiceTechnician>;
  updateServiceTechnician(id: string, technician: Partial<InsertServiceTechnician>): Promise<ServiceTechnician | undefined>;
  deleteServiceTechnician(id: string): Promise<boolean>;
  deleteServiceTechniciansByReportId(serviceReportId: string): Promise<boolean>;

  // Service AC Unit methods
  getServiceAcUnits(serviceReportId: string): Promise<ServiceAcUnit[]>;
  getServiceDoneByReportIds(reportIds: string[]): Promise<Record<string, { acBrand: string; acModel: string; acLocation: string; serviceDone: string }[]>>;
  createServiceAcUnit(unit: InsertServiceAcUnit): Promise<ServiceAcUnit>;
  deleteServiceAcUnitsByReportId(serviceReportId: string): Promise<boolean>;
  
  // Quotation methods
  getQuotations(companyId: string): Promise<Quotation[]>;
  getQuotation(id: string, companyId: string): Promise<Quotation | undefined>;
  getQuotationsByClientId(clientId: string, companyId: string): Promise<Quotation[]>;
  createQuotation(companyId: string, quotation: InsertQuotation): Promise<Quotation>;
  updateQuotation(id: string, companyId: string, quotation: Partial<InsertQuotation>): Promise<Quotation | undefined>;
  deleteQuotation(id: string, companyId: string): Promise<boolean>;
  softDeleteQuotation(id: string, companyId: string): Promise<boolean>;
  restoreQuotation(id: string, companyId: string): Promise<boolean>;
  getDeletedQuotations(companyId: string): Promise<Quotation[]>;
  
  // Quotation Line Item methods
  getQuotationLineItems(quotationId: string): Promise<QuotationLineItem[]>;
  createQuotationLineItem(item: InsertQuotationLineItem): Promise<QuotationLineItem>;
  updateQuotationLineItem(id: string, item: Partial<InsertQuotationLineItem>): Promise<QuotationLineItem | undefined>;
  deleteQuotationLineItem(id: string): Promise<boolean>;
  deleteQuotationLineItemsByQuotationId(quotationId: string): Promise<boolean>;
  
  // Invoice methods
  getInvoices(companyId: string): Promise<Invoice[]>;
  getInvoice(id: string, companyId: string): Promise<Invoice | undefined>;
  getInvoicesByClientId(clientId: string, companyId: string): Promise<Invoice[]>;
  createInvoice(companyId: string, invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, companyId: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string, companyId: string): Promise<boolean>;
  softDeleteInvoice(id: string, companyId: string): Promise<boolean>;
  restoreInvoice(id: string, companyId: string): Promise<boolean>;
  getDeletedInvoices(companyId: string): Promise<Invoice[]>;
  
  // Invoice Line Item methods
  getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]>;
  createInvoiceLineItem(item: InsertInvoiceLineItem): Promise<InvoiceLineItem>;
  updateInvoiceLineItem(id: string, item: Partial<InsertInvoiceLineItem>): Promise<InvoiceLineItem | undefined>;
  deleteInvoiceLineItem(id: string): Promise<boolean>;
  deleteInvoiceLineItemsByInvoiceId(invoiceId: string): Promise<boolean>;
  
  // Accounts Receivable methods
  getAccountsReceivables(companyId: string): Promise<AccountsReceivable[]>;
  getAccountsReceivable(id: string, companyId: string): Promise<AccountsReceivable | undefined>;
  getAccountsReceivablesByClientId(clientId: string, companyId: string): Promise<AccountsReceivable[]>;
  createAccountsReceivable(companyId: string, ar: InsertAccountsReceivable): Promise<AccountsReceivable>;
  updateAccountsReceivable(id: string, companyId: string, ar: Partial<InsertAccountsReceivable>): Promise<AccountsReceivable | undefined>;
  deleteAccountsReceivable(id: string, companyId: string): Promise<boolean>;
  softDeleteAccountsReceivable(id: string, companyId: string): Promise<boolean>;
  restoreAccountsReceivable(id: string, companyId: string): Promise<boolean>;
  getDeletedAccountsReceivables(companyId: string): Promise<AccountsReceivable[]>;
  
  // AR Payment methods
  getArPayments(arId: string): Promise<ArPayment[]>;
  createArPayment(payment: InsertArPayment): Promise<ArPayment>;
  updateArPayment(id: string, payment: Partial<InsertArPayment>): Promise<ArPayment | undefined>;
  deleteArPayment(id: string): Promise<boolean>;
  deleteArPaymentsByArId(arId: string): Promise<boolean>;
  
  // Operational Expense methods
  getOperationalExpenses(companyId: string): Promise<OperationalExpense[]>;
  getOperationalExpense(id: string, companyId: string): Promise<OperationalExpense | undefined>;
  createOperationalExpense(companyId: string, expense: InsertOperationalExpense): Promise<OperationalExpense>;
  updateOperationalExpense(id: string, companyId: string, expense: Partial<InsertOperationalExpense>): Promise<OperationalExpense | undefined>;
  deleteOperationalExpense(id: string, companyId: string): Promise<boolean>;
  softDeleteOperationalExpense(id: string, companyId: string): Promise<boolean>;
  restoreOperationalExpense(id: string, companyId: string): Promise<boolean>;
  getDeletedOperationalExpenses(companyId: string): Promise<OperationalExpense[]>;
  
  // Sales Entry methods
  getSalesEntries(companyId: string): Promise<SalesEntry[]>;
  getSalesEntriesBySource(sourceType: string, sourceId: string, companyId: string): Promise<SalesEntry[]>;
  getSalesEntry(id: string, companyId: string): Promise<SalesEntry | undefined>;
  createSalesEntry(companyId: string, entry: InsertSalesEntry): Promise<SalesEntry>;
  updateSalesEntry(id: string, companyId: string, entry: Partial<InsertSalesEntry>): Promise<SalesEntry | undefined>;
  deleteSalesEntry(id: string, companyId: string): Promise<boolean>;
  softDeleteSalesEntry(id: string, companyId: string): Promise<boolean>;
  restoreSalesEntry(id: string, companyId: string): Promise<boolean>;
  getDeletedSalesEntries(companyId: string): Promise<SalesEntry[]>;
  
  // Purchase Order methods
  getPurchaseOrders(companyId: string): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: string, companyId: string): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(companyId: string, po: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: string, companyId: string, po: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined>;
  deletePurchaseOrder(id: string, companyId: string): Promise<boolean>;
  softDeletePurchaseOrder(id: string, companyId: string): Promise<boolean>;
  restorePurchaseOrder(id: string, companyId: string): Promise<boolean>;
  getDeletedPurchaseOrders(companyId: string): Promise<PurchaseOrder[]>;
  
  // Purchase Order Item methods
  getAllPurchaseOrderItems(companyId: string): Promise<PurchaseOrderItem[]>;
  getPurchaseOrderItems(purchaseOrderId: string): Promise<PurchaseOrderItem[]>;
  createPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem>;
  updatePurchaseOrderItem(id: string, item: Partial<InsertPurchaseOrderItem>): Promise<PurchaseOrderItem | undefined>;
  deletePurchaseOrderItem(id: string): Promise<boolean>;
  deletePurchaseOrderItemsByPurchaseOrderId(purchaseOrderId: string): Promise<boolean>;
  
  // Accounts Payable methods
  getAccountsPayables(companyId: string): Promise<AccountsPayable[]>;
  getAccountsPayable(id: string, companyId: string): Promise<AccountsPayable | undefined>;
  getAccountsPayablesByPurchaseOrderId(purchaseOrderId: string, companyId: string): Promise<AccountsPayable[]>;
  createAccountsPayable(companyId: string, ap: InsertAccountsPayable): Promise<AccountsPayable>;
  updateAccountsPayable(id: string, companyId: string, ap: Partial<InsertAccountsPayable>): Promise<AccountsPayable | undefined>;
  deleteAccountsPayable(id: string, companyId: string): Promise<boolean>;
  softDeleteAccountsPayable(id: string, companyId: string): Promise<boolean>;
  restoreAccountsPayable(id: string, companyId: string): Promise<boolean>;
  getDeletedAccountsPayables(companyId: string): Promise<AccountsPayable[]>;
  
  // Notification methods
  getNotifications(userId: string, companyId: string): Promise<Notification[]>;
  getUnreadNotifications(userId: string, companyId: string): Promise<Notification[]>;
  createNotification(companyId: string, notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string, companyId: string): Promise<boolean>;
  deleteNotification(id: string): Promise<boolean>;
  generateNotifications(userId: string, companyId: string): Promise<Notification[]>;
  notifyCompanyUsers(companyId: string, notification: Omit<InsertNotification, "userId">, roles?: string[]): Promise<Notification[]>;
  
  // Activity Log methods
  getActivityLogs(companyId: string, limit?: number): Promise<ActivityLog[]>;
  getActivityLogsFiltered(companyId: string, filters: ActivityLogFilters): Promise<{ logs: ActivityLog[]; total: number }>;
  createActivityLog(companyId: string, log: InsertActivityLog): Promise<ActivityLog>;

  // Attachment methods
  getAttachments(companyId: string, filters?: AttachmentFilters): Promise<Attachment[]>;
  getAttachmentsByEntity(companyId: string, entityType: string, entityId: string): Promise<Attachment[]>;
  getAttachment(companyId: string, id: string): Promise<Attachment | undefined>;
  findDuplicateAttachment(companyId: string, entityType: string, entityId: string, fileName: string, sizeBytes: number, fileHash?: string): Promise<Attachment | undefined>;
  createAttachment(companyId: string, attachment: InsertAttachment): Promise<Attachment>;
  deleteAttachment(companyId: string, id: string): Promise<boolean>;
}

export interface AttachmentFilters {
  entityType?: string;
  entityId?: string;
}

export interface ActivityLogFilters {
  userId?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class DbStorage implements IStorage {
  // Company methods
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(desc(companies.dateCreated));
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.id, id));
    return result[0];
  }

  async getCompanyBySlug(slug: string): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.slug, slug));
    return result[0];
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values({
      ...insertCompany,
      logoUrl: insertCompany.logoUrl ?? null,
      address: insertCompany.address ?? null,
      phone: insertCompany.phone ?? null,
      email: insertCompany.email ?? null,
      taxId: insertCompany.taxId ?? null,
      status: insertCompany.status ?? "active",
    }).returning();
    return company;
  }

  async updateCompany(id: string, updateData: Partial<InsertCompany>): Promise<Company | undefined> {
    const [updated] = await db
      .update(companies)
      .set({ ...updateData, lastModified: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return updated;
  }

  async deleteCompany(id: string): Promise<boolean> {
    const result = await db.delete(companies).where(eq(companies.id, id)).returning();
    return result.length > 0;
  }

  // Company Settings methods
  private async computeInitialSeq(companyId: string, docType: DocumentType, prefix: string): Promise<number> {
    switch (docType) {
      case "accountsReceivable": {
        const rows = await db.select().from(accountsReceivables).where(eq(accountsReceivables.companyId, companyId));
        return nextSeqFromExisting(rows.map((r) => r.arNumber), prefix);
      }
      case "purchaseOrder": {
        const rows = await db.select().from(purchaseOrders).where(eq(purchaseOrders.companyId, companyId));
        return nextSeqFromExisting(rows.map((r) => r.poNumber), prefix);
      }
      case "accountsPayable": {
        const rows = await db.select().from(accountsPayables).where(eq(accountsPayables.companyId, companyId));
        return nextSeqFromExisting(rows.map((r) => r.apNumber), prefix);
      }
      default:
        // Quotation/Invoice/Service Report legacy numbers use different prefixes
        // (QUO-, INV-<timestamp>, manual), so a fresh sequence under the new
        // configurable prefix cannot collide with them.
        return 1;
    }
  }

  async getCompanySettings(companyId: string): Promise<CompanySettings> {
    const existing = await db.select().from(companySettings).where(eq(companySettings.companyId, companyId));
    if (existing[0]) return existing[0];

    const numbering: Record<string, DocNumberingConfig> = {};
    for (const docType of Object.keys(DEFAULT_NUMBERING) as DocumentType[]) {
      const base = DEFAULT_NUMBERING[docType];
      const nextNumber = await this.computeInitialSeq(companyId, docType, base.prefix);
      numbering[docType] = { ...base, nextNumber };
    }

    const [created] = await db.insert(companySettings).values({
      companyId,
      documentNumbering: numbering,
    }).returning();
    return created;
  }

  async updateCompanySettings(companyId: string, updateData: Partial<InsertCompanySettings>): Promise<CompanySettings> {
    await this.getCompanySettings(companyId); // ensure a row exists
    const [updated] = await db
      .update(companySettings)
      .set({ ...updateData, lastModified: new Date() })
      .where(eq(companySettings.companyId, companyId))
      .returning();
    return updated;
  }

  async generateDocumentNumber(companyId: string, docType: DocumentType): Promise<string> {
    const settings = await this.getCompanySettings(companyId);
    const numbering = (settings.documentNumbering as Record<string, DocNumberingConfig>) || {};
    const config = numbering[docType] || { ...DEFAULT_NUMBERING[docType], nextNumber: 1 };
    const formatted = formatDocumentNumber(config, config.nextNumber);

    const updatedNumbering = { ...numbering, [docType]: { ...config, nextNumber: config.nextNumber + 1 } };
    await db
      .update(companySettings)
      .set({ documentNumbering: updatedNumbering, lastModified: new Date() })
      .where(eq(companySettings.companyId, companyId));

    return formatted;
  }

  // User methods
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUsersByCompany(companyId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.companyId, companyId));
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserProfile(id: string, data: { username?: string; email?: string | null }): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async updateUserPassword(id: string, newPassword: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ password: newPassword })
      .where(eq(users.id, id))
      .returning();
    return result.length > 0;
  }

  // Client methods
  async getClients(companyId: string): Promise<Client[]> {
    const result = await db.select().from(clients)
      .where(and(eq(clients.companyId, companyId), isNull(clients.deletedAt)))
      .orderBy(desc(clients.dateCreated));
    return result;
  }

  async getClient(id: string, companyId: string): Promise<Client | undefined> {
    const result = await db.select().from(clients)
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId), isNull(clients.deletedAt)));
    return result[0];
  }

  async createClient(companyId: string, insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values({
      ...insertClient,
      companyId,
      company: insertClient.company ?? null,
      firstTransactionDate: insertClient.firstTransactionDate ?? null,
      lastTransactionDate: insertClient.lastTransactionDate ?? null,
      totalValue: insertClient.totalValue ?? 0,
      status: insertClient.status ?? "active",
    }).returning();
    return client;
  }

  async updateClient(id: string, companyId: string, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    const [updated] = await db
      .update(clients)
      .set(updateData)
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteClient(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(clients)
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async softDeleteClient(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(clients)
      .set({ deletedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId), isNull(clients.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async restoreClient(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(clients)
      .set({ deletedAt: null })
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async getDeletedClients(companyId: string): Promise<Client[]> {
    return await db.select().from(clients)
      .where(and(eq(clients.companyId, companyId), isNotNull(clients.deletedAt)))
      .orderBy(desc(clients.deletedAt));
  }

  // Service Report methods
  async getServiceReports(companyId: string): Promise<ServiceReport[]> {
    const result = await db.select().from(serviceReports)
      .where(and(eq(serviceReports.companyId, companyId), isNull(serviceReports.deletedAt)))
      .orderBy(desc(serviceReports.dateCreated));
    return result;
  }

  async getServiceReport(id: string, companyId: string): Promise<ServiceReport | undefined> {
    const result = await db.select().from(serviceReports)
      .where(and(eq(serviceReports.id, id), eq(serviceReports.companyId, companyId), isNull(serviceReports.deletedAt)));
    return result[0];
  }

  async getServiceReportsByClientId(clientId: string, companyId: string): Promise<ServiceReport[]> {
    const result = await db
      .select()
      .from(serviceReports)
      .where(and(eq(serviceReports.clientId, clientId), eq(serviceReports.companyId, companyId), isNull(serviceReports.deletedAt)))
      .orderBy(desc(serviceReports.dateCreated));
    return result;
  }

  async createServiceReport(companyId: string, insertReport: InsertServiceReport): Promise<ServiceReport> {
    const reportNumber = insertReport.reportNumber?.trim()
      || await this.generateDocumentNumber(companyId, "serviceReport");
    
    // Check if report number already exists for this company
    const existing = await db
      .select()
      .from(serviceReports)
      .where(and(eq(serviceReports.reportNumber, reportNumber), eq(serviceReports.companyId, companyId)));
    
    if (existing.length > 0) {
      throw new Error(`Report number ${reportNumber} already exists`);
    }
    
    const [report] = await db.insert(serviceReports).values({
      ...insertReport,
      companyId,
      reportNumber,
      acBrand: insertReport.acBrand ?? null,
      acModel: insertReport.acModel ?? null,
      acSerialNumber: insertReport.acSerialNumber ?? null,
      acLocation: insertReport.acLocation ?? null,
      technicianName: insertReport.technicianName ?? null,
      timeStarted: insertReport.timeStarted ?? null,
      timeEnded: insertReport.timeEnded ?? null,
      duration: insertReport.duration ?? null,
      troubleReported: insertReport.troubleReported ?? null,
      troubleFound: insertReport.troubleFound ?? null,
      workDone: insertReport.workDone ?? null,
      recommendations: insertReport.recommendations ?? null,
    }).returning();
    return report;
  }

  async updateServiceReport(id: string, companyId: string, updateData: Partial<InsertServiceReport>): Promise<ServiceReport | undefined> {
    const [updated] = await db
      .update(serviceReports)
      .set({ ...updateData, lastModified: new Date() })
      .where(and(eq(serviceReports.id, id), eq(serviceReports.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteServiceReport(id: string, companyId: string): Promise<boolean> {
    await this.deleteServiceLineItemsByReportId(id);
    await this.deleteServiceTechniciansByReportId(id);
    await this.deleteServiceAcUnitsByReportId(id);
    const result = await db.delete(serviceReports)
      .where(and(eq(serviceReports.id, id), eq(serviceReports.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async softDeleteServiceReport(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(serviceReports)
      .set({ deletedAt: new Date() })
      .where(and(eq(serviceReports.id, id), eq(serviceReports.companyId, companyId), isNull(serviceReports.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async restoreServiceReport(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(serviceReports)
      .set({ deletedAt: null })
      .where(and(eq(serviceReports.id, id), eq(serviceReports.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async getDeletedServiceReports(companyId: string): Promise<ServiceReport[]> {
    return await db.select().from(serviceReports)
      .where(and(eq(serviceReports.companyId, companyId), isNotNull(serviceReports.deletedAt)))
      .orderBy(desc(serviceReports.deletedAt));
  }

  // Service Line Item methods
  async getServiceLineItems(serviceReportId: string): Promise<ServiceLineItem[]> {
    const result = await db
      .select()
      .from(serviceLineItems)
      .where(eq(serviceLineItems.serviceReportId, serviceReportId))
      .orderBy(serviceLineItems.orderIndex);
    return result;
  }

  async createServiceLineItem(insertItem: InsertServiceLineItem): Promise<ServiceLineItem> {
    const [item] = await db.insert(serviceLineItems).values({
      ...insertItem,
      quantity: insertItem.quantity ?? 1,
      orderIndex: insertItem.orderIndex ?? null,
    }).returning();
    return item;
  }

  async updateServiceLineItem(id: string, updateData: Partial<InsertServiceLineItem>): Promise<ServiceLineItem | undefined> {
    const [updated] = await db
      .update(serviceLineItems)
      .set(updateData)
      .where(eq(serviceLineItems.id, id))
      .returning();
    return updated;
  }

  async deleteServiceLineItem(id: string): Promise<boolean> {
    const result = await db.delete(serviceLineItems).where(eq(serviceLineItems.id, id)).returning();
    return result.length > 0;
  }

  async deleteServiceLineItemsByReportId(serviceReportId: string): Promise<boolean> {
    await db.delete(serviceLineItems).where(eq(serviceLineItems.serviceReportId, serviceReportId));
    return true;
  }

  // Service Technician methods
  async getServiceTechnicians(serviceReportId: string): Promise<ServiceTechnician[]> {
    const result = await db
      .select()
      .from(serviceTechnicians)
      .where(eq(serviceTechnicians.serviceReportId, serviceReportId))
      .orderBy(serviceTechnicians.orderIndex);
    return result;
  }

  async createServiceTechnician(insertTechnician: InsertServiceTechnician): Promise<ServiceTechnician> {
    const [technician] = await db.insert(serviceTechnicians).values(insertTechnician).returning();
    return technician;
  }

  async updateServiceTechnician(id: string, updateData: Partial<InsertServiceTechnician>): Promise<ServiceTechnician | undefined> {
    const [updated] = await db
      .update(serviceTechnicians)
      .set(updateData)
      .where(eq(serviceTechnicians.id, id))
      .returning();
    return updated;
  }

  async deleteServiceTechnician(id: string): Promise<boolean> {
    const result = await db.delete(serviceTechnicians).where(eq(serviceTechnicians.id, id)).returning();
    return result.length > 0;
  }

  async deleteServiceTechniciansByReportId(serviceReportId: string): Promise<boolean> {
    await db.delete(serviceTechnicians).where(eq(serviceTechnicians.serviceReportId, serviceReportId));
    return true;
  }

  // Service AC Unit methods
  async getServiceAcUnits(serviceReportId: string): Promise<ServiceAcUnit[]> {
    return await db.select().from(serviceAcUnits)
      .where(eq(serviceAcUnits.serviceReportId, serviceReportId))
      .orderBy(serviceAcUnits.orderIndex);
  }

  async getServiceDoneByReportIds(reportIds: string[]): Promise<Record<string, { acBrand: string; acModel: string; acLocation: string; serviceDone: string }[]>> {
    if (reportIds.length === 0) return {};
    const units = await db.select({
      serviceReportId: serviceAcUnits.serviceReportId,
      acBrand: serviceAcUnits.acBrand,
      acModel: serviceAcUnits.acModel,
      acLocation: serviceAcUnits.acLocation,
      serviceDone: serviceAcUnits.serviceDone,
    }).from(serviceAcUnits).where(inArray(serviceAcUnits.serviceReportId, reportIds));
    const result: Record<string, { acBrand: string; acModel: string; acLocation: string; serviceDone: string }[]> = {};
    for (const unit of units) {
      if (!unit.serviceDone) continue;
      if (!result[unit.serviceReportId]) result[unit.serviceReportId] = [];
      result[unit.serviceReportId].push({
        acBrand: unit.acBrand ?? "",
        acModel: unit.acModel ?? "",
        acLocation: unit.acLocation ?? "",
        serviceDone: unit.serviceDone,
      });
    }
    return result;
  }

  async createServiceAcUnit(unit: InsertServiceAcUnit): Promise<ServiceAcUnit> {
    const [created] = await db.insert(serviceAcUnits).values(unit).returning();
    return created;
  }

  async deleteServiceAcUnitsByReportId(serviceReportId: string): Promise<boolean> {
    await db.delete(serviceAcUnits).where(eq(serviceAcUnits.serviceReportId, serviceReportId));
    return true;
  }

  // Quotation methods
  async getQuotations(companyId: string): Promise<Quotation[]> {
    const result = await db.select().from(quotations)
      .where(and(eq(quotations.companyId, companyId), isNull(quotations.deletedAt)))
      .orderBy(desc(quotations.dateCreated));
    return result;
  }

  async getQuotation(id: string, companyId: string): Promise<Quotation | undefined> {
    const result = await db.select().from(quotations)
      .where(and(eq(quotations.id, id), eq(quotations.companyId, companyId), isNull(quotations.deletedAt)));
    return result[0];
  }

  async getQuotationsByClientId(clientId: string, companyId: string): Promise<Quotation[]> {
    const result = await db
      .select()
      .from(quotations)
      .where(and(eq(quotations.clientId, clientId), eq(quotations.companyId, companyId), isNull(quotations.deletedAt)))
      .orderBy(desc(quotations.dateCreated));
    return result;
  }

  async createQuotation(companyId: string, insertQuotation: InsertQuotation): Promise<Quotation> {
    const now = new Date();
    const quotationNumber = insertQuotation.quotationNumber?.trim() || await this.generateDocumentNumber(companyId, "quotation");
    
    // Check if quotation number already exists for this company
    const existingQuotation = await db
      .select()
      .from(quotations)
      .where(and(eq(quotations.quotationNumber, quotationNumber), eq(quotations.companyId, companyId)));
    
    if (existingQuotation.length > 0) {
      throw new Error(`Quotation number ${quotationNumber} already exists`);
    }
    
    const [quotation] = await db.insert(quotations).values({
      ...insertQuotation,
      companyId,
      quotationNumber,
      quotationDate: insertQuotation.quotationDate || now,
      validUntil: insertQuotation.validUntil || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      title: insertQuotation.title || insertQuotation.description || "Quotation",
      status: insertQuotation.status || "draft",
      subtotal: insertQuotation.subtotal || "0.00",
      tax: insertQuotation.tax || "0.00",
      total: insertQuotation.total || "0.00",
      description: insertQuotation.description ?? null,
      terms: insertQuotation.terms ?? null,
      notes: insertQuotation.notes ?? null,
    }).returning();
    return quotation;
  }

  async updateQuotation(id: string, companyId: string, updateData: Partial<InsertQuotation>): Promise<Quotation | undefined> {
    const [updated] = await db
      .update(quotations)
      .set({ ...updateData, lastModified: new Date() })
      .where(and(eq(quotations.id, id), eq(quotations.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteQuotation(id: string, companyId: string): Promise<boolean> {
    await this.deleteQuotationLineItemsByQuotationId(id);
    // Delete sales entries created when this quotation was accepted
    await db.delete(salesEntries).where(
      and(eq(salesEntries.sourceType, 'quotation'), eq(salesEntries.sourceId, id), eq(salesEntries.companyId, companyId))
    );
    const result = await db.delete(quotations)
      .where(and(eq(quotations.id, id), eq(quotations.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async softDeleteQuotation(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(quotations)
      .set({ deletedAt: new Date() })
      .where(and(eq(quotations.id, id), eq(quotations.companyId, companyId), isNull(quotations.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async restoreQuotation(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(quotations)
      .set({ deletedAt: null })
      .where(and(eq(quotations.id, id), eq(quotations.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async getDeletedQuotations(companyId: string): Promise<Quotation[]> {
    return await db.select().from(quotations)
      .where(and(eq(quotations.companyId, companyId), isNotNull(quotations.deletedAt)))
      .orderBy(desc(quotations.deletedAt));
  }

  // Quotation Line Item methods
  async getQuotationLineItems(quotationId: string): Promise<QuotationLineItem[]> {
    const result = await db
      .select()
      .from(quotationLineItems)
      .where(eq(quotationLineItems.quotationId, quotationId))
      .orderBy(quotationLineItems.orderIndex);
    return result;
  }

  async createQuotationLineItem(insertItem: InsertQuotationLineItem): Promise<QuotationLineItem> {
    const [item] = await db.insert(quotationLineItems).values({
      ...insertItem,
      quantity: insertItem.quantity ?? 1,
      orderIndex: insertItem.orderIndex ?? null,
    }).returning();
    return item;
  }

  async updateQuotationLineItem(id: string, updateData: Partial<InsertQuotationLineItem>): Promise<QuotationLineItem | undefined> {
    const [updated] = await db
      .update(quotationLineItems)
      .set(updateData)
      .where(eq(quotationLineItems.id, id))
      .returning();
    return updated;
  }

  async deleteQuotationLineItem(id: string): Promise<boolean> {
    const result = await db.delete(quotationLineItems).where(eq(quotationLineItems.id, id)).returning();
    return result.length > 0;
  }

  async deleteQuotationLineItemsByQuotationId(quotationId: string): Promise<boolean> {
    await db.delete(quotationLineItems).where(eq(quotationLineItems.quotationId, quotationId));
    return true;
  }

  // Invoice methods
  async getInvoices(companyId: string): Promise<Invoice[]> {
    const result = await db.select().from(invoices)
      .where(and(eq(invoices.companyId, companyId), isNull(invoices.deletedAt)))
      .orderBy(desc(invoices.dateCreated));
    return result;
  }

  async getInvoice(id: string, companyId: string): Promise<Invoice | undefined> {
    const result = await db.select().from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId), isNull(invoices.deletedAt)));
    return result[0];
  }

  async getInvoicesByClientId(clientId: string, companyId: string): Promise<Invoice[]> {
    const result = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.clientId, clientId), eq(invoices.companyId, companyId), isNull(invoices.deletedAt)))
      .orderBy(desc(invoices.dateCreated));
    return result;
  }

  async createInvoice(companyId: string, insertInvoice: InsertInvoice): Promise<Invoice> {
    const now = new Date();
    const invoiceNumber = insertInvoice.invoiceNumber?.trim() || await this.generateDocumentNumber(companyId, "invoice");
    
    // Check if invoice number already exists for this company
    const existingInvoice = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.invoiceNumber, invoiceNumber), eq(invoices.companyId, companyId)));
    
    if (existingInvoice.length > 0) {
      throw new Error(`Invoice number ${invoiceNumber} already exists`);
    }
    
    const [invoice] = await db.insert(invoices).values({
      companyId,
      clientId: insertInvoice.clientId,
      invoiceNumber,
      title: insertInvoice.title || "Invoice",
      invoiceDate: insertInvoice.invoiceDate || now,
      dueDate: insertInvoice.dueDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      status: insertInvoice.status || "unpaid",
      subtotal: insertInvoice.subtotal || "0.00",
      tax: insertInvoice.tax || "0.00",
      total: insertInvoice.total || "0.00",
      description: insertInvoice.description ?? null,
      terms: insertInvoice.terms ?? null,
      notes: insertInvoice.notes ?? null,
      quotationId: insertInvoice.quotationId ?? null,
    }).returning();
    return invoice;
  }

  async updateInvoice(id: string, companyId: string, updateData: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db
      .update(invoices)
      .set({ ...updateData, lastModified: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteInvoice(id: string, companyId: string): Promise<boolean> {
    await this.deleteInvoiceLineItemsByInvoiceId(id);
    const result = await db.delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async softDeleteInvoice(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(invoices)
      .set({ deletedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId), isNull(invoices.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async restoreInvoice(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(invoices)
      .set({ deletedAt: null })
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async getDeletedInvoices(companyId: string): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(and(eq(invoices.companyId, companyId), isNotNull(invoices.deletedAt)))
      .orderBy(desc(invoices.deletedAt));
  }

  // Invoice Line Item methods
  async getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
    const result = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoiceId))
      .orderBy(invoiceLineItems.orderIndex);
    return result;
  }

  async createInvoiceLineItem(insertItem: InsertInvoiceLineItem): Promise<InvoiceLineItem> {
    const [item] = await db.insert(invoiceLineItems).values({
      ...insertItem,
      quantity: insertItem.quantity ?? 1,
      orderIndex: insertItem.orderIndex ?? null,
    }).returning();
    return item;
  }

  async updateInvoiceLineItem(id: string, updateData: Partial<InsertInvoiceLineItem>): Promise<InvoiceLineItem | undefined> {
    const [updated] = await db
      .update(invoiceLineItems)
      .set(updateData)
      .where(eq(invoiceLineItems.id, id))
      .returning();
    return updated;
  }

  async deleteInvoiceLineItem(id: string): Promise<boolean> {
    const result = await db.delete(invoiceLineItems).where(eq(invoiceLineItems.id, id)).returning();
    return result.length > 0;
  }

  async deleteInvoiceLineItemsByInvoiceId(invoiceId: string): Promise<boolean> {
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));
    return true;
  }

  // Accounts Receivable methods
  async getAccountsReceivables(companyId: string): Promise<AccountsReceivable[]> {
    const result = await db.select().from(accountsReceivables)
      .where(and(eq(accountsReceivables.companyId, companyId), isNull(accountsReceivables.deletedAt)))
      .orderBy(desc(accountsReceivables.date));
    return result;
  }

  async getAccountsReceivable(id: string, companyId: string): Promise<AccountsReceivable | undefined> {
    const result = await db.select().from(accountsReceivables)
      .where(and(eq(accountsReceivables.id, id), eq(accountsReceivables.companyId, companyId), isNull(accountsReceivables.deletedAt)));
    return result[0];
  }

  async getAccountsReceivablesByClientId(clientId: string, companyId: string): Promise<AccountsReceivable[]> {
    const result = await db
      .select()
      .from(accountsReceivables)
      .where(and(eq(accountsReceivables.clientId, clientId), eq(accountsReceivables.companyId, companyId), isNull(accountsReceivables.deletedAt)))
      .orderBy(desc(accountsReceivables.date));
    return result;
  }

  async createAccountsReceivable(companyId: string, insertAR: InsertAccountsReceivable): Promise<AccountsReceivable> {
    // Generate AR number using the company's configurable numbering format (default AR-001, AR-002, etc.)
    const arNumber = await this.generateDocumentNumber(companyId, "accountsReceivable");
    
    const [ar] = await db.insert(accountsReceivables).values({
      ...insertAR,
      companyId,
      arNumber,
    }).returning();
    return ar;
  }

  async updateAccountsReceivable(id: string, companyId: string, updateData: Partial<InsertAccountsReceivable>): Promise<AccountsReceivable | undefined> {
    const [updated] = await db
      .update(accountsReceivables)
      .set({ ...updateData, lastModified: new Date() })
      .where(and(eq(accountsReceivables.id, id), eq(accountsReceivables.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteAccountsReceivable(id: string, companyId: string): Promise<boolean> {
    await this.deleteArPaymentsByArId(id);
    // Delete sales entries created from AR payments
    await db.delete(salesEntries).where(
      and(eq(salesEntries.sourceType, 'accounts_receivable'), eq(salesEntries.sourceId, id), eq(salesEntries.companyId, companyId))
    );
    const result = await db.delete(accountsReceivables)
      .where(and(eq(accountsReceivables.id, id), eq(accountsReceivables.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async softDeleteAccountsReceivable(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(accountsReceivables)
      .set({ deletedAt: new Date() })
      .where(and(eq(accountsReceivables.id, id), eq(accountsReceivables.companyId, companyId), isNull(accountsReceivables.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async restoreAccountsReceivable(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(accountsReceivables)
      .set({ deletedAt: null })
      .where(and(eq(accountsReceivables.id, id), eq(accountsReceivables.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async getDeletedAccountsReceivables(companyId: string): Promise<AccountsReceivable[]> {
    return await db.select().from(accountsReceivables)
      .where(and(eq(accountsReceivables.companyId, companyId), isNotNull(accountsReceivables.deletedAt)))
      .orderBy(desc(accountsReceivables.deletedAt));
  }

  // AR Payment methods
  async getArPayments(arId: string): Promise<ArPayment[]> {
    const result = await db
      .select()
      .from(arPayments)
      .where(eq(arPayments.arId, arId))
      .orderBy(arPayments.paymentNumber);
    return result;
  }

  async createArPayment(insertPayment: InsertArPayment): Promise<ArPayment> {
    const [payment] = await db.insert(arPayments).values(insertPayment).returning();
    return payment;
  }

  async updateArPayment(id: string, updateData: Partial<InsertArPayment>): Promise<ArPayment | undefined> {
    const [updated] = await db
      .update(arPayments)
      .set(updateData)
      .where(eq(arPayments.id, id))
      .returning();
    return updated;
  }

  async deleteArPayment(id: string): Promise<boolean> {
    const result = await db.delete(arPayments).where(eq(arPayments.id, id)).returning();
    return result.length > 0;
  }

  async deleteArPaymentsByArId(arId: string): Promise<boolean> {
    await db.delete(arPayments).where(eq(arPayments.arId, arId));
    return true;
  }

  // Operational Expense methods
  async getOperationalExpenses(companyId: string): Promise<OperationalExpense[]> {
    const result = await db.select().from(operationalExpenses)
      .where(and(eq(operationalExpenses.companyId, companyId), isNull(operationalExpenses.deletedAt)))
      .orderBy(desc(operationalExpenses.date));
    return result;
  }

  async getOperationalExpense(id: string, companyId: string): Promise<OperationalExpense | undefined> {
    const result = await db.select().from(operationalExpenses)
      .where(and(eq(operationalExpenses.id, id), eq(operationalExpenses.companyId, companyId), isNull(operationalExpenses.deletedAt)));
    return result[0];
  }

  async createOperationalExpense(companyId: string, insertExpense: InsertOperationalExpense): Promise<OperationalExpense> {
    const [expense] = await db.insert(operationalExpenses).values({
      ...insertExpense,
      companyId,
      vendor: insertExpense.vendor ?? null,
      referenceNo: insertExpense.referenceNo ?? null,
      remarks: insertExpense.remarks ?? null,
    }).returning();
    return expense;
  }

  async updateOperationalExpense(id: string, companyId: string, updateData: Partial<InsertOperationalExpense>): Promise<OperationalExpense | undefined> {
    const [updated] = await db
      .update(operationalExpenses)
      .set(updateData)
      .where(and(eq(operationalExpenses.id, id), eq(operationalExpenses.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteOperationalExpense(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(operationalExpenses)
      .where(and(eq(operationalExpenses.id, id), eq(operationalExpenses.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async softDeleteOperationalExpense(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(operationalExpenses)
      .set({ deletedAt: new Date() })
      .where(and(eq(operationalExpenses.id, id), eq(operationalExpenses.companyId, companyId), isNull(operationalExpenses.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async restoreOperationalExpense(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(operationalExpenses)
      .set({ deletedAt: null })
      .where(and(eq(operationalExpenses.id, id), eq(operationalExpenses.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async getDeletedOperationalExpenses(companyId: string): Promise<OperationalExpense[]> {
    return await db.select().from(operationalExpenses)
      .where(and(eq(operationalExpenses.companyId, companyId), isNotNull(operationalExpenses.deletedAt)))
      .orderBy(desc(operationalExpenses.deletedAt));
  }

  // Sales Entry methods
  async getSalesEntries(companyId: string): Promise<SalesEntry[]> {
    const result = await db.select().from(salesEntries)
      .where(and(eq(salesEntries.companyId, companyId), isNull(salesEntries.deletedAt)))
      .orderBy(desc(salesEntries.date));
    return result;
  }

  async getSalesEntriesBySource(sourceType: string, sourceId: string, companyId: string): Promise<SalesEntry[]> {
    return await db.select().from(salesEntries)
      .where(and(eq(salesEntries.sourceType, sourceType), eq(salesEntries.sourceId, sourceId), eq(salesEntries.companyId, companyId), isNull(salesEntries.deletedAt)));
  }

  async getSalesEntry(id: string, companyId: string): Promise<SalesEntry | undefined> {
    const result = await db.select().from(salesEntries)
      .where(and(eq(salesEntries.id, id), eq(salesEntries.companyId, companyId), isNull(salesEntries.deletedAt)));
    return result[0];
  }

  async createSalesEntry(companyId: string, insertEntry: InsertSalesEntry): Promise<SalesEntry> {
    const [entry] = await db.insert(salesEntries).values({
      ...insertEntry,
      companyId,
      sourceType: insertEntry.sourceType ?? null,
      sourceId: insertEntry.sourceId ?? null,
      remarks: insertEntry.remarks ?? null,
    }).returning();
    return entry;
  }

  async updateSalesEntry(id: string, companyId: string, updateData: Partial<InsertSalesEntry>): Promise<SalesEntry | undefined> {
    const [updated] = await db
      .update(salesEntries)
      .set(updateData)
      .where(and(eq(salesEntries.id, id), eq(salesEntries.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteSalesEntry(id: string, companyId: string): Promise<boolean> {
    const result = await db.delete(salesEntries)
      .where(and(eq(salesEntries.id, id), eq(salesEntries.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async softDeleteSalesEntry(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(salesEntries)
      .set({ deletedAt: new Date() })
      .where(and(eq(salesEntries.id, id), eq(salesEntries.companyId, companyId), isNull(salesEntries.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async restoreSalesEntry(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(salesEntries)
      .set({ deletedAt: null })
      .where(and(eq(salesEntries.id, id), eq(salesEntries.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async getDeletedSalesEntries(companyId: string): Promise<SalesEntry[]> {
    return await db.select().from(salesEntries)
      .where(and(eq(salesEntries.companyId, companyId), isNotNull(salesEntries.deletedAt)))
      .orderBy(desc(salesEntries.deletedAt));
  }

  // Purchase Order methods
  async getPurchaseOrders(companyId: string): Promise<PurchaseOrder[]> {
    const result = await db.select().from(purchaseOrders)
      .where(and(eq(purchaseOrders.companyId, companyId), isNull(purchaseOrders.deletedAt)))
      .orderBy(desc(purchaseOrders.date));
    return result;
  }

  async getPurchaseOrder(id: string, companyId: string): Promise<PurchaseOrder | undefined> {
    const result = await db.select().from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, companyId), isNull(purchaseOrders.deletedAt)));
    return result[0];
  }

  async createPurchaseOrder(companyId: string, insertPO: InsertPurchaseOrder): Promise<PurchaseOrder> {
    // Generate PO number using the company's configurable numbering format (default PO-001, PO-002, etc.)
    const poNumber = await this.generateDocumentNumber(companyId, "purchaseOrder");
    
    const [po] = await db.insert(purchaseOrders).values({
      ...insertPO,
      companyId,
      poNumber,
      attention: insertPO.attention ?? null,
      status: insertPO.status ?? 'draft',
      paymentStatus: insertPO.paymentStatus ?? 'pending',
      totalUnits: insertPO.totalUnits ?? 0,
      discount: insertPO.discount ?? "0.00",
      grandTotal: insertPO.grandTotal ?? "0.00",
    }).returning();
    return po;
  }

  async updatePurchaseOrder(id: string, companyId: string, updateData: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined> {
    const [updated] = await db
      .update(purchaseOrders)
      .set(updateData)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, companyId)))
      .returning();
    return updated;
  }

  async deletePurchaseOrder(id: string, companyId: string): Promise<boolean> {
    // Delete operational expenses auto-created when this PO was marked paid
    const [po] = await db.select().from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, companyId)));
    if (po?.poNumber) {
      await db.delete(operationalExpenses).where(
        and(eq(operationalExpenses.referenceNo, po.poNumber), eq(operationalExpenses.category, 'purchase_order'), eq(operationalExpenses.companyId, companyId))
      );
    }
    // Delete linked accounts payables (each cascades to its own expenses)
    const linkedAPs = await this.getAccountsPayablesByPurchaseOrderId(id, companyId);
    for (const ap of linkedAPs) {
      await this.deleteAccountsPayable(ap.id, companyId);
    }
    await this.deletePurchaseOrderItemsByPurchaseOrderId(id);
    const result = await db.delete(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async softDeletePurchaseOrder(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(purchaseOrders)
      .set({ deletedAt: new Date() })
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, companyId), isNull(purchaseOrders.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async restorePurchaseOrder(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(purchaseOrders)
      .set({ deletedAt: null })
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async getDeletedPurchaseOrders(companyId: string): Promise<PurchaseOrder[]> {
    return await db.select().from(purchaseOrders)
      .where(and(eq(purchaseOrders.companyId, companyId), isNotNull(purchaseOrders.deletedAt)))
      .orderBy(desc(purchaseOrders.deletedAt));
  }

  // Purchase Order Item methods
  async getAllPurchaseOrderItems(companyId: string): Promise<PurchaseOrderItem[]> {
    const result = await db
      .select({
        id: purchaseOrderItems.id,
        purchaseOrderId: purchaseOrderItems.purchaseOrderId,
        qty: purchaseOrderItems.qty,
        particulars: purchaseOrderItems.particulars,
        unitPrice: purchaseOrderItems.unitPrice,
        amount: purchaseOrderItems.amount,
        orderIndex: purchaseOrderItems.orderIndex,
      })
      .from(purchaseOrderItems)
      .innerJoin(purchaseOrders, eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id))
      .where(eq(purchaseOrders.companyId, companyId))
      .orderBy(purchaseOrderItems.orderIndex);
    return result;
  }

  async getPurchaseOrderItems(purchaseOrderId: string): Promise<PurchaseOrderItem[]> {
    const result = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId))
      .orderBy(purchaseOrderItems.orderIndex);
    return result;
  }

  async createPurchaseOrderItem(insertItem: InsertPurchaseOrderItem): Promise<PurchaseOrderItem> {
    const [item] = await db.insert(purchaseOrderItems).values({
      ...insertItem,
      qty: insertItem.qty ?? 1,
      orderIndex: insertItem.orderIndex ?? 0,
    }).returning();
    return item;
  }

  async updatePurchaseOrderItem(id: string, updateData: Partial<InsertPurchaseOrderItem>): Promise<PurchaseOrderItem | undefined> {
    const [updated] = await db
      .update(purchaseOrderItems)
      .set(updateData)
      .where(eq(purchaseOrderItems.id, id))
      .returning();
    return updated;
  }

  async deletePurchaseOrderItem(id: string): Promise<boolean> {
    const result = await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.id, id)).returning();
    return result.length > 0;
  }

  async deletePurchaseOrderItemsByPurchaseOrderId(purchaseOrderId: string): Promise<boolean> {
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));
    return true;
  }

  // Accounts Payable methods
  async getAccountsPayables(companyId: string): Promise<AccountsPayable[]> {
    const result = await db.select().from(accountsPayables)
      .where(and(eq(accountsPayables.companyId, companyId), isNull(accountsPayables.deletedAt)))
      .orderBy(desc(accountsPayables.date));
    return result;
  }

  async getAccountsPayable(id: string, companyId: string): Promise<AccountsPayable | undefined> {
    const result = await db.select().from(accountsPayables)
      .where(and(eq(accountsPayables.id, id), eq(accountsPayables.companyId, companyId), isNull(accountsPayables.deletedAt)));
    return result[0];
  }

  async getAccountsPayablesByPurchaseOrderId(purchaseOrderId: string, companyId: string): Promise<AccountsPayable[]> {
    const result = await db
      .select()
      .from(accountsPayables)
      .where(and(eq(accountsPayables.purchaseOrderId, purchaseOrderId), eq(accountsPayables.companyId, companyId), isNull(accountsPayables.deletedAt)))
      .orderBy(desc(accountsPayables.date));
    return result;
  }

  async createAccountsPayable(companyId: string, insertAP: InsertAccountsPayable): Promise<AccountsPayable> {
    // Generate AP number using the company's configurable numbering format (default AP-001, AP-002, etc.)
    const apNumber = await this.generateDocumentNumber(companyId, "accountsPayable");
    
    const [ap] = await db.insert(accountsPayables).values({
      ...insertAP,
      companyId,
      apNumber,
    }).returning();
    return ap;
  }

  async updateAccountsPayable(id: string, companyId: string, updateData: Partial<InsertAccountsPayable>): Promise<AccountsPayable | undefined> {
    const [updated] = await db
      .update(accountsPayables)
      .set(updateData)
      .where(and(eq(accountsPayables.id, id), eq(accountsPayables.companyId, companyId)))
      .returning();
    return updated;
  }

  async deleteAccountsPayable(id: string, companyId: string): Promise<boolean> {
    // Delete operational expenses auto-created when this AP was marked paid
    const [ap] = await db.select().from(accountsPayables)
      .where(and(eq(accountsPayables.id, id), eq(accountsPayables.companyId, companyId)));
    if (ap?.apNumber) {
      await db.delete(operationalExpenses).where(
        and(eq(operationalExpenses.referenceNo, ap.apNumber), eq(operationalExpenses.category, 'accounts_payable'), eq(operationalExpenses.companyId, companyId))
      );
    }
    const result = await db.delete(accountsPayables)
      .where(and(eq(accountsPayables.id, id), eq(accountsPayables.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async softDeleteAccountsPayable(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(accountsPayables)
      .set({ deletedAt: new Date() })
      .where(and(eq(accountsPayables.id, id), eq(accountsPayables.companyId, companyId), isNull(accountsPayables.deletedAt)))
      .returning();
    return result.length > 0;
  }

  async restoreAccountsPayable(id: string, companyId: string): Promise<boolean> {
    const result = await db.update(accountsPayables)
      .set({ deletedAt: null })
      .where(and(eq(accountsPayables.id, id), eq(accountsPayables.companyId, companyId)))
      .returning();
    return result.length > 0;
  }

  async getDeletedAccountsPayables(companyId: string): Promise<AccountsPayable[]> {
    return await db.select().from(accountsPayables)
      .where(and(eq(accountsPayables.companyId, companyId), isNotNull(accountsPayables.deletedAt)))
      .orderBy(desc(accountsPayables.deletedAt));
  }

  // Notification methods
  async getNotifications(userId: string, companyId: string): Promise<Notification[]> {
    const result = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.companyId, companyId)))
      .orderBy(desc(notifications.createdAt));
    return result;
  }

  async getUnreadNotifications(userId: string, companyId: string): Promise<Notification[]> {
    const result = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false), eq(notifications.companyId, companyId)))
      .orderBy(desc(notifications.createdAt));
    return result;
  }

  async createNotification(companyId: string, insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values({
      ...insertNotification,
      companyId,
    }).returning();
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return result.length > 0;
  }

  async markAllNotificationsAsRead(userId: string, companyId: string): Promise<boolean> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.companyId, companyId)));
    return true;
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id)).returning();
    return result.length > 0;
  }

  async notifyCompanyUsers(companyId: string, notification: Omit<InsertNotification, "userId">, roles: string[] = ["owner", "admin"]): Promise<Notification[]> {
    const companyUsers = await this.getUsersByCompany(companyId);
    const targetUsers = companyUsers.filter(u => roles.includes(u.role));
    const created: Notification[] = [];
    for (const targetUser of targetUsers) {
      const notif = await this.createNotification(companyId, {
        ...notification,
        userId: targetUser.id,
      } as InsertNotification);
      created.push(notif);
    }
    return created;
  }

  async generateNotifications(userId: string, companyId: string): Promise<Notification[]> {
    const newNotifications: Notification[] = [];
    const now = new Date();
    
    // Get all clients for this company
    const allClients = await db.select().from(clients).where(eq(clients.companyId, companyId));
    
    // Client loop retained for future per-client notifications
    for (const client of allClients) {
      void client; // no per-client notifications currently active
    }
    
    // Get all accounts receivables for this company
    const allReceivables = await db.select().from(accountsReceivables).where(eq(accountsReceivables.companyId, companyId));
    const agingThresholds = [15, 30, 45, 60, 90]; // days
    
    for (const ar of allReceivables) {
      if (ar.status === 'paid' || ar.status === 'waived') continue;
      
      const arDate = new Date(ar.date);
      const daysSince = Math.floor((now.getTime() - arDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if receivable has crossed an aging threshold
      for (const threshold of agingThresholds) {
        if (daysSince === threshold) {
          // Check if we already have a notification for this AR at this threshold
          const existingNotifications = await this.getNotifications(userId, companyId);
          const alreadyNotified = existingNotifications.some(n => 
            n.type === 'receivable_aging' && 
            n.relatedId === ar.id &&
            n.metadata && JSON.parse(n.metadata).agingDays === threshold
          );
          
          if (!alreadyNotified) {
            // Get client from database
            const clientResult = await db.select().from(clients).where(eq(clients.id, ar.clientId));
            const client = clientResult[0];
            const clientName = client?.name || 'Unknown Client';
            
            const notification = await this.createNotification(companyId, {
              userId,
              type: 'receivable_aging',
              category: 'finance',
              title: 'Aging Receivable Alert',
              message: `Receivable ${ar.arNumber} for ${clientName} is now ${threshold} days old (₱${parseFloat(ar.balance || '0').toLocaleString('en-PH', { minimumFractionDigits: 2 })})`,
              relatedId: ar.id,
              relatedType: 'receivable',
              metadata: JSON.stringify({ agingDays: threshold }),
              isRead: false,
            });
            newNotifications.push(notification);
          }
        }
      }
    }
    
    return newNotifications;
  }
  
  // Activity Log methods
  async getActivityLogs(companyId: string, limit: number = 50): Promise<ActivityLog[]> {
    const logs = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.companyId, companyId))
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
    return logs;
  }
  
  async createActivityLog(companyId: string, log: InsertActivityLog): Promise<ActivityLog> {
    const [createdLog] = await db.insert(activityLogs).values({
      ...log,
      companyId,
    }).returning();
    return createdLog;
  }

  async getActivityLogsFiltered(companyId: string, filters: ActivityLogFilters): Promise<{ logs: ActivityLog[]; total: number }> {
    const conditions = [eq(activityLogs.companyId, companyId)];
    if (filters.userId) conditions.push(eq(activityLogs.userId, filters.userId));
    if (filters.entityType) conditions.push(eq(activityLogs.entityType, filters.entityType));
    if (filters.startDate) conditions.push(gte(activityLogs.timestamp, filters.startDate));
    if (filters.endDate) conditions.push(lte(activityLogs.timestamp, filters.endDate));

    const whereClause = and(...conditions);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(activityLogs)
      .where(whereClause);

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 25;
    const offset = (page - 1) * limit;

    const logs = await db
      .select()
      .from(activityLogs)
      .where(whereClause)
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit)
      .offset(offset);

    return { logs, total: count };
  }

  // Attachment methods
  async getAttachments(companyId: string, filters?: AttachmentFilters): Promise<Attachment[]> {
    const conditions = [eq(attachments.companyId, companyId)];
    if (filters?.entityType) conditions.push(eq(attachments.entityType, filters.entityType));
    if (filters?.entityId) conditions.push(eq(attachments.entityId, filters.entityId));

    return await db
      .select()
      .from(attachments)
      .where(and(...conditions))
      .orderBy(desc(attachments.dateCreated));
  }

  async getAttachmentsByEntity(companyId: string, entityType: string, entityId: string): Promise<Attachment[]> {
    return await db
      .select()
      .from(attachments)
      .where(and(
        eq(attachments.companyId, companyId),
        eq(attachments.entityType, entityType),
        eq(attachments.entityId, entityId),
      ))
      .orderBy(desc(attachments.dateCreated));
  }

  async getAttachment(companyId: string, id: string): Promise<Attachment | undefined> {
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(and(eq(attachments.companyId, companyId), eq(attachments.id, id)));
    return attachment;
  }

  async findDuplicateAttachment(companyId: string, entityType: string, entityId: string, fileName: string, sizeBytes: number, fileHash?: string): Promise<Attachment | undefined> {
    const conditions = [
      eq(attachments.companyId, companyId),
      eq(attachments.entityType, entityType),
      eq(attachments.entityId, entityId),
    ];

    if (fileHash) {
      const [match] = await db
        .select()
        .from(attachments)
        .where(and(...conditions, eq(attachments.fileHash, fileHash)));
      if (match) return match;
    }

    const [match] = await db
      .select()
      .from(attachments)
      .where(and(...conditions, eq(attachments.fileName, fileName), eq(attachments.sizeBytes, sizeBytes)));
    return match;
  }

  async createAttachment(companyId: string, attachment: InsertAttachment): Promise<Attachment> {
    const [created] = await db.insert(attachments).values({
      ...attachment,
      companyId,
    }).returning();
    return created;
  }

  async deleteAttachment(companyId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(attachments)
      .where(and(eq(attachments.companyId, companyId), eq(attachments.id, id)))
      .returning();
    return result.length > 0;
  }
}

// Export database-only storage instance
export const storage = new DbStorage();
