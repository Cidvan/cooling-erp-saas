import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertServiceReportSchema, insertServiceLineItemSchema, insertQuotationSchema, insertQuotationLineItemSchema, insertInvoiceSchema, insertInvoiceLineItemSchema, insertAccountsReceivableSchema, insertOperationalExpenseSchema, insertSalesEntrySchema, insertPurchaseOrderSchema, insertPurchaseOrderItemSchema, insertAccountsPayableSchema, updateUserProfileSchema, updatePasswordSchema, insertNotificationSchema } from "@shared/schema";
import bcrypt from "bcrypt";

// Helper function to log activities
// Uses session user data when available, falls back to 'system' for automated processes
async function logActivity(
  activityType: 'created' | 'updated' | 'deleted',
  entityType: string,
  entityId: string,
  entityName: string,
  description: string,
  userId?: string,
  userName?: string
) {
  try {
    await storage.createActivityLog({
      userId: userId || 'system',
      userName: userName || 'System',
      activityType,
      entityType,
      entityId,
      entityName,
      description,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// Recalculates and persists the most recent cleaning service date for a client
async function syncClientLastCleaning(clientId: string) {
  try {
    const reports = await storage.getServiceReportsByClientId(clientId);
    const cleaningReports = reports
      .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
    const lastTransactionDate = cleaningReports.length > 0 ? new Date(cleaningReports[0].serviceDate) : null;
    await storage.updateClient(clientId, { lastTransactionDate } as any);
  } catch (error) {
    console.error('Failed to sync client last transaction date:', error);
  }
}

// Extend Express Request type to include session
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userName?: string;
    userRole?: string;
  }
}

function requireRole(...allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const role = req.session.userRole || "staff";
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      // Find user by username
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Set session
      req.session.userId = user.id;
      req.session.userName = user.username;
      req.session.userRole = user.role ?? "staff";

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/session", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("[auth] Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  // User Profile routes
  app.get("/api/user/profile/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  app.put("/api/user/profile/:userId", async (req, res) => {
    try {
      const validatedData = updateUserProfileSchema.parse(req.body);
      const user = await storage.updateUserProfile(req.params.userId, validatedData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ error: "Invalid profile data", details: error });
    }
  });

  app.put("/api/user/password/:userId", async (req, res) => {
    try {
      const validatedData = updatePasswordSchema.parse(req.body);
      
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isPasswordValid = await bcrypt.compare(validatedData.currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10);
      const success = await storage.updateUserPassword(req.params.userId, hashedPassword);
      
      if (!success) {
        return res.status(500).json({ error: "Failed to update password" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(400).json({ error: "Invalid password data", details: error });
    }
  });

  // Client routes
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      await logActivity('created', 'client', client.id, client.name, `Created client: ${client.name}`);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ error: "Invalid client data", details: error });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, validatedData);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      await logActivity('updated', 'client', client.id, client.name, `Updated client: ${client.name}`);
      res.json(client);
    } catch (error) {
      res.status(400).json({ error: "Invalid client data", details: error });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Cascade delete: remove all related records before deleting the client
      const [clientReports, clientQuotations, clientInvoices, clientARs] = await Promise.all([
        storage.getServiceReportsByClientId(req.params.id),
        storage.getQuotationsByClientId(req.params.id),
        storage.getInvoicesByClientId(req.params.id),
        storage.getAccountsReceivablesByClientId(req.params.id),
      ]);

      // Delete service reports (each also deletes its line items, technicians, AC units)
      for (const report of clientReports) {
        await storage.deleteServiceReport(report.id);
      }
      // Delete quotations (each also deletes its line items)
      for (const quotation of clientQuotations) {
        await storage.deleteQuotation(quotation.id);
      }
      // Delete invoices (each also deletes its line items)
      for (const invoice of clientInvoices) {
        await storage.deleteInvoice(invoice.id);
      }
      // Delete accounts receivables
      for (const ar of clientARs) {
        await storage.deleteAccountsReceivable(ar.id);
      }

      const deleted = await storage.deleteClient(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Client not found" });
      }
      await logActivity('deleted', 'client', client.id, client.name, `Deleted client: ${client.name} (and all related records)`);
      res.status(204).send();
    } catch (error) {
      console.error("[client] Error deleting client:", error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Service Report routes
  app.get("/api/service-reports", async (req, res) => {
    try {
      const clientId = req.query.clientId as string;
      let reports;
      
      if (clientId) {
        reports = await storage.getServiceReportsByClientId(clientId);
        const reportIds = reports.map(r => r.id);
        const serviceDoneMap = await storage.getServiceDoneByReportIds(reportIds);
        const reportsWithServiceDone = reports.map(r => ({
          ...r,
          serviceDoneList: serviceDoneMap[r.id] || [],
        }));
        return res.json(reportsWithServiceDone);
      } else {
        reports = await storage.getServiceReports();
      }
      
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch service reports" });
    }
  });

  app.get("/api/service-reports/:id", async (req, res) => {
    try {
      const report = await storage.getServiceReport(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Service report not found" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch service report" });
    }
  });

  app.post("/api/service-reports", async (req, res) => {
    try {
      const { lineItems, technicians, acUnits, ...reportData } = req.body;
      
      // Log the incoming data for debugging
      console.log('Service report data:', JSON.stringify(reportData, null, 2));

      // Auto-set primary technicianName from first technician if not provided
      if (technicians && Array.isArray(technicians) && technicians.length > 0 && !reportData.technicianName) {
        reportData.technicianName = technicians[0].technicianName || "";
      }
      
      // Validate service report data
      const validatedReport = insertServiceReportSchema.parse(reportData);
      const report = await storage.createServiceReport(validatedReport);
      await logActivity('created', 'service_report', report.id, report.reportNumber, `Created service report: ${report.reportNumber}`);
      await syncClientLastCleaning(report.clientId);
      
      const createdLineItems = [];
      const createdTechnicians = [];
      
      // Validate and create line items if provided
      if (lineItems && Array.isArray(lineItems)) {
        for (const item of lineItems) {
          const validatedItem = insertServiceLineItemSchema.parse({
            ...item,
            serviceReportId: report.id
          });
          const createdItem = await storage.createServiceLineItem(validatedItem);
          createdLineItems.push(createdItem);
        }
      }
      
      // Validate and create technicians if provided
      if (technicians && Array.isArray(technicians)) {
        const { insertServiceTechnicianSchema } = await import("@shared/schema");
        for (const tech of technicians) {
          const validatedTech = insertServiceTechnicianSchema.parse({
            ...tech,
            serviceReportId: report.id
          });
          const createdTech = await storage.createServiceTechnician(validatedTech);
          createdTechnicians.push(createdTech);
        }
      }

      // Validate and create AC units if provided
      const createdAcUnits = [];
      if (acUnits && Array.isArray(acUnits)) {
        const { insertServiceAcUnitSchema } = await import("@shared/schema");
        for (const unit of acUnits) {
          const validatedUnit = insertServiceAcUnitSchema.parse({
            ...unit,
            serviceReportId: report.id
          });
          const createdUnit = await storage.createServiceAcUnit(validatedUnit);
          createdAcUnits.push(createdUnit);
        }
      }
      
      // Auto-create sales entry when service report is completed
      if (report.status?.toLowerCase() === 'completed' && createdLineItems.length > 0) {
        const total = createdLineItems.reduce((sum: number, item: any) => sum + parseFloat(item.amount || '0'), 0);
        if (total > 0) {
          const existing = await storage.getSalesEntriesBySource('service_report', report.id);
          if (existing.length === 0) {
            const { insertSalesEntrySchema } = await import("@shared/schema");
            const salesEntryData = insertSalesEntrySchema.parse({
              date: report.serviceDate || new Date(),
              amount: total.toFixed(2),
              paymentMethod: 'cash',
              sourceType: 'service_report',
              sourceId: report.id,
              remarks: `Service Report ${report.reportNumber}`,
            });
            const salesEntry = await storage.createSalesEntry(salesEntryData);
            await logActivity('created', 'sales_entry', salesEntry.id, `₱${salesEntry.amount}`, `SR completed: ${report.reportNumber}`);
          }
        }
      }

      // Return report with line items, technicians and AC units
      res.status(201).json({ 
        ...report, 
        lineItems: createdLineItems,
        technicians: createdTechnicians,
        acUnits: createdAcUnits
      });
    } catch (error: any) {
      console.error('Service report creation error:', error?.message, error?.errors);
      if (error.message && error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      // Extract specific Zod field error if available
      if (error?.errors?.length) {
        const first = error.errors[0];
        const field = first.path?.join('.') || 'field';
        const msg = `${field}: ${first.message}`;
        return res.status(400).json({ error: msg });
      }
      const message = error?.message || "Failed to save service report";
      res.status(400).json({ error: message });
    }
  });

  app.put("/api/service-reports/:id", async (req, res) => {
    try {
      const { lineItems, technicians, acUnits, ...reportData } = req.body;

      const validatedReport = insertServiceReportSchema.partial().parse(reportData);
      const report = await storage.updateServiceReport(req.params.id, validatedReport);

      if (!report) {
        return res.status(404).json({ error: "Service report not found" });
      }

      let createdLineItems = [];
      if (lineItems && Array.isArray(lineItems)) {
        await storage.deleteServiceLineItemsByReportId(req.params.id);
        for (const item of lineItems) {
          const validatedItem = insertServiceLineItemSchema.parse({
            ...item,
            serviceReportId: req.params.id
          });
          createdLineItems.push(await storage.createServiceLineItem(validatedItem));
        }
      }

      let createdTechnicians = [];
      if (technicians && Array.isArray(technicians)) {
        const { insertServiceTechnicianSchema } = await import("@shared/schema");
        await storage.deleteServiceTechniciansByReportId(req.params.id);
        for (const tech of technicians) {
          const validatedTech = insertServiceTechnicianSchema.parse({
            ...tech,
            serviceReportId: req.params.id
          });
          createdTechnicians.push(await storage.createServiceTechnician(validatedTech));
        }
      }

      let createdAcUnits = [];
      if (acUnits && Array.isArray(acUnits)) {
        const { insertServiceAcUnitSchema } = await import("@shared/schema");
        await storage.deleteServiceAcUnitsByReportId(req.params.id);
        for (const unit of acUnits) {
          const validatedUnit = insertServiceAcUnitSchema.parse({
            ...unit,
            serviceReportId: req.params.id
          });
          createdAcUnits.push(await storage.createServiceAcUnit(validatedUnit));
        }
      }

      await syncClientLastCleaning(report.clientId);

      // Sync sales entry for service report based on completed status
      const allLineItems = await storage.getServiceLineItems(req.params.id);
      const total = allLineItems.reduce((sum, item: any) => sum + parseFloat(item.amount || '0'), 0);
      const existingSalesEntries = await storage.getSalesEntriesBySource('service_report', req.params.id);

      if (report.status?.toLowerCase() === 'completed' && total > 0) {
        if (existingSalesEntries.length === 0) {
          const { insertSalesEntrySchema } = await import("@shared/schema");
          const salesEntryData = insertSalesEntrySchema.parse({
            date: report.serviceDate || new Date(),
            amount: total.toFixed(2),
            paymentMethod: 'cash',
            sourceType: 'service_report',
            sourceId: report.id,
            remarks: `Service Report ${report.reportNumber}`,
          });
          const salesEntry = await storage.createSalesEntry(salesEntryData);
          await logActivity('created', 'sales_entry', salesEntry.id, `₱${salesEntry.amount}`, `SR completed: ${report.reportNumber}`);
        } else {
          // Update amount in case line items changed
          const { insertSalesEntrySchema } = await import("@shared/schema");
          await storage.updateSalesEntry(existingSalesEntries[0].id, { amount: total.toFixed(2) });
        }
      } else if (report.status?.toLowerCase() !== 'completed') {
        // Remove sales entry if status changed away from completed
        for (const entry of existingSalesEntries) {
          await storage.deleteSalesEntry(entry.id);
        }
      }

      const userName = (req.session as any)?.userName || "System";
      const userId = (req.session as any)?.userId || null;
      await storage.createActivityLog({
        userId, userName,
        activityType: "updated",
        entityType: "service_report",
        entityId: report.id,
        entityName: report.reportNumber,
        description: `Updated service report ${report.reportNumber}`,
      });

      res.json({ ...report, lineItems: createdLineItems, technicians: createdTechnicians, acUnits: createdAcUnits });
    } catch (error: any) {
      console.error('Service report update error:', error?.message, error?.errors);
      if (error?.errors?.length) {
        const first = error.errors[0];
        const field = first.path?.join('.') || 'field';
        return res.status(400).json({ error: `${field}: ${first.message}` });
      }
      res.status(400).json({ error: error?.message || "Failed to update service report" });
    }
  });

  app.delete("/api/service-reports/:id", async (req, res) => {
    try {
      const existing = await storage.getServiceReport(req.params.id);
      const deleted = await storage.deleteServiceReport(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Service report not found" });
      }
      if (existing?.clientId) await syncClientLastCleaning(existing.clientId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete service report" });
    }
  });

  // Service Line Item routes
  app.get("/api/service-reports/:reportId/line-items", async (req, res) => {
    try {
      const lineItems = await storage.getServiceLineItems(req.params.reportId);
      res.json(lineItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch line items" });
    }
  });

  // Service Report Technicians
  app.get("/api/service-reports/:reportId/technicians", async (req, res) => {
    try {
      const technicians = await storage.getServiceTechnicians(req.params.reportId);
      res.json(technicians);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch technicians" });
    }
  });

  // Service Report AC Units
  app.get("/api/service-reports/:reportId/ac-units", async (req, res) => {
    try {
      const units = await storage.getServiceAcUnits(req.params.reportId);
      res.json(units);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch AC units" });
    }
  });

  app.post("/api/service-reports/:reportId/line-items", async (req, res) => {
    try {
      const validatedData = insertServiceLineItemSchema.parse({
        ...req.body,
        serviceReportId: req.params.reportId
      });
      const lineItem = await storage.createServiceLineItem(validatedData);
      res.status(201).json(lineItem);
    } catch (error) {
      res.status(400).json({ error: "Invalid line item data", details: error });
    }
  });

  app.put("/api/line-items/:id", async (req, res) => {
    try {
      const validatedData = insertServiceLineItemSchema.partial().parse(req.body);
      const lineItem = await storage.updateServiceLineItem(req.params.id, validatedData);
      if (!lineItem) {
        return res.status(404).json({ error: "Line item not found" });
      }
      res.json(lineItem);
    } catch (error) {
      res.status(400).json({ error: "Invalid line item data", details: error });
    }
  });

  app.delete("/api/line-items/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteServiceLineItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Line item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete line item" });
    }
  });

  // Quotation routes
  app.get("/api/quotations", async (req, res) => {
    try {
      const clientId = req.query.clientId as string;
      let quotations;
      
      if (clientId) {
        quotations = await storage.getQuotationsByClientId(clientId);
      } else {
        quotations = await storage.getQuotations();
      }
      
      res.json(quotations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quotations" });
    }
  });

  app.get("/api/quotations/:id", async (req, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      res.json(quotation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quotation" });
    }
  });

  app.post("/api/quotations", async (req, res) => {
    try {
      const { lineItems, ...rawQuotationData } = req.body;

      // Ensure required fields have fallbacks before schema validation
      const quotationData = {
        ...rawQuotationData,
        title: rawQuotationData.title || rawQuotationData.subject || "",
        quotationDate: rawQuotationData.quotationDate || new Date().toISOString(),
        validUntil: rawQuotationData.validUntil || undefined,
      };
      
      // Validate quotation data
      const validatedQuotation = insertQuotationSchema.parse(quotationData);
      const quotation = await storage.createQuotation(validatedQuotation);
      await logActivity('created', 'quotation', quotation.id, quotation.quotationNumber, `Created quotation: ${quotation.quotationNumber}`);
      
      // Validate and create line items if provided
      if (lineItems && Array.isArray(lineItems)) {
        const createdLineItems = [];
        for (const item of lineItems) {
          const validatedItem = insertQuotationLineItemSchema.parse({
            ...item,
            quotationId: quotation.id
          });
          const createdItem = await storage.createQuotationLineItem(validatedItem);
          createdLineItems.push(createdItem);
        }
        
        // Return quotation with line items
        res.status(201).json({ ...quotation, lineItems: createdLineItems });
      } else {
        res.status(201).json(quotation);
      }
    } catch (error: any) {
      console.error("POST /api/quotations error:", error?.message, error?.stack);
      const message = error?.errors?.[0]?.message || error?.message || "Failed to save quotation";
      res.status(400).json({ error: message });
    }
  });

  app.put("/api/quotations/:id", async (req, res) => {
    try {
      const { lineItems, ...quotationData } = req.body;

      // Capture old status before update
      const oldQuotation = await storage.getQuotation(req.params.id);
      const oldStatus = oldQuotation?.status;
      
      // Update quotation
      const validatedQuotation = insertQuotationSchema.partial().parse(quotationData);
      const quotation = await storage.updateQuotation(req.params.id, validatedQuotation);
      
      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }

      // Handle line items update if provided
      if (lineItems && Array.isArray(lineItems)) {
        // Delete existing line items
        await storage.deleteQuotationLineItemsByQuotationId(req.params.id);
        
        // Create new line items
        const createdLineItems = [];
        for (const item of lineItems) {
          const validatedItem = insertQuotationLineItemSchema.parse({
            ...item,
            quotationId: req.params.id
          });
          const createdItem = await storage.createQuotationLineItem(validatedItem);
          createdLineItems.push(createdItem);
        }
        
        // Return quotation with line items
        res.json({ ...quotation, lineItems: createdLineItems });
      } else {
        res.json(quotation);
      }
    } catch (error: any) {
      console.error("PUT /api/quotations error:", error?.message, error?.stack);
      const message = error?.errors?.[0]?.message || error?.message || "Failed to update quotation";
      res.status(400).json({ error: message });
    }
  });

  app.delete("/api/quotations/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteQuotation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete quotation" });
    }
  });

  // Quotation Line Item routes
  app.get("/api/quotations/:quotationId/line-items", async (req, res) => {
    try {
      const lineItems = await storage.getQuotationLineItems(req.params.quotationId);
      res.json(lineItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quotation line items" });
    }
  });

  app.post("/api/quotations/:quotationId/line-items", async (req, res) => {
    try {
      const validatedData = insertQuotationLineItemSchema.parse({
        ...req.body,
        quotationId: req.params.quotationId
      });
      const lineItem = await storage.createQuotationLineItem(validatedData);
      res.status(201).json(lineItem);
    } catch (error) {
      res.status(400).json({ error: "Invalid quotation line item data", details: error });
    }
  });

  app.put("/api/quotation-line-items/:id", async (req, res) => {
    try {
      const validatedData = insertQuotationLineItemSchema.partial().parse(req.body);
      const lineItem = await storage.updateQuotationLineItem(req.params.id, validatedData);
      if (!lineItem) {
        return res.status(404).json({ error: "Quotation line item not found" });
      }
      res.json(lineItem);
    } catch (error) {
      res.status(400).json({ error: "Invalid quotation line item data", details: error });
    }
  });

  app.delete("/api/quotation-line-items/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteQuotationLineItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Quotation line item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete quotation line item" });
    }
  });

  // Dashboard analytics endpoint
  app.get("/api/dashboard/analytics", async (req, res) => {
    try {
      const clients = await storage.getClients();
      const quotations = await storage.getQuotations();
      const serviceReports = await storage.getServiceReports();
      const accountsReceivables = await storage.getAccountsReceivables();
      const operationalExpenses = await storage.getOperationalExpenses();
      const salesEntries = await storage.getSalesEntries();

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Calculate metrics
      const totalClients = clients.length;

      // Cash-based revenue: only count sales entries (created when AR is paid)
      const totalSales = salesEntries
        .reduce((sum, s) => sum + parseFloat(s.amount || '0'), 0);

      // Case-insensitive status comparison to handle 'Completed' vs 'completed'
      const completedJobs = serviceReports
        .filter(r => r.status?.toLowerCase() === 'completed')
        .length;

      const outstandingReceivables = accountsReceivables
        .filter(ar => ar.status === 'unsettled' || ar.status === 'partial')
        .reduce((sum, ar) => sum + parseFloat(ar.balance || '0'), 0);

      // Monthly expenses from operational expenses
      const monthlyExpenses = operationalExpenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        })
        .reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0);

      // Sales by month for the last 12 months
      const salesByMonth = [];
      const expensesByMonth = [];
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleString('default', { month: 'short' });
        const targetMonth = date.getMonth();
        const targetYear = date.getFullYear();

        // Cash-based: only count sales entries (created when AR is paid)
        const monthlySales = salesEntries
          .filter(s => {
            const sDate = new Date(s.date);
            return sDate.getMonth() === targetMonth && sDate.getFullYear() === targetYear;
          })
          .reduce((sum, s) => sum + parseFloat(s.amount || '0'), 0);
        
        const monthlyExpense = operationalExpenses
          .filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === targetMonth &&
                   expDate.getFullYear() === targetYear;
          })
          .reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0);
        
        salesByMonth.push({ month, sales: monthlySales });
        expensesByMonth.push({ month, expenses: monthlyExpense });
      }

      // Recent activities (last 5 activities)
      const allActivities = [
        ...serviceReports.map(r => ({
          id: r.id,
          type: 'service_report',
          timestamp: r.lastModified || r.dateCreated || new Date(),
          description: `Service report ${r.id.slice(0, 8)} - ${r.status}`,
          clientId: r.clientId
        })),
        ...quotations.map(q => ({
          id: q.id,
          type: 'quotation',
          timestamp: q.lastModified || q.dateCreated || new Date(),
          description: `Quotation ${q.quotationNumber} - ${q.status}`,
          clientId: q.clientId
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

      res.json({
        metrics: {
          totalSales,
          totalClients,
          completedJobs,
          outstandingReceivables,
          monthlyExpenses
        },
        salesByMonth,
        expensesByMonth,
        recentActivities: allActivities
      });
    } catch (error) {
      console.error("[analytics] Error fetching dashboard analytics:", error);
      res.status(500).json({ error: "Failed to fetch dashboard analytics" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", async (req, res) => {
    try {
      const clientId = req.query.clientId as string;
      let invoices;
      
      if (clientId) {
        invoices = await storage.getInvoicesByClientId(clientId);
      } else {
        invoices = await storage.getInvoices();
      }
      
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const { lineItems, ...invoiceData } = req.body;
      
      // Validate invoice data
      const validatedInvoice = insertInvoiceSchema.parse(invoiceData);
      const invoice = await storage.createInvoice(validatedInvoice);
      
      // Validate and create line items if provided
      if (lineItems && Array.isArray(lineItems)) {
        const createdLineItems = [];
        for (const item of lineItems) {
          const validatedItem = insertInvoiceLineItemSchema.parse({
            ...item,
            invoiceId: invoice.id
          });
          const createdItem = await storage.createInvoiceLineItem(validatedItem);
          createdLineItems.push(createdItem);
        }
        
        // Return invoice with line items
        res.status(201).json({ ...invoice, lineItems: createdLineItems });
      } else {
        res.status(201).json(invoice);
      }
    } catch (error) {
      res.status(400).json({ error: "Invalid invoice data", details: error });
    }
  });

  // Convert quotation to invoice
  app.post("/api/invoices/from-quotation/:quotationId", async (req, res) => {
    try {
      const quotationId = req.params.quotationId;
      
      // Get the quotation
      const quotation = await storage.getQuotation(quotationId);
      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      
      // Get quotation line items
      const quotationLineItems = await storage.getQuotationLineItems(quotationId);
      
      // Create invoice from quotation
      const invoiceData = {
        clientId: quotation.clientId,
        quotationId: quotation.id,
        invoiceNumber: `INV-${Date.now()}`, // Generate unique invoice number
        title: quotation.title,
        description: quotation.description,
        terms: quotation.terms,
        notes: quotation.notes,
        subtotal: quotation.subtotal,
        tax: quotation.tax,
        total: quotation.total,
        status: "unpaid"
      };
      
      const validatedInvoice = insertInvoiceSchema.parse(invoiceData);
      const invoice = await storage.createInvoice(validatedInvoice);
      
      // Convert quotation line items to invoice line items
      const createdLineItems = [];
      for (const item of quotationLineItems) {
        const invoiceLineItem = {
          invoiceId: invoice.id,
          quantity: item.quantity,
          unitDescription: item.unitDescription,
          unitPrice: item.unitPrice,
          amount: item.amount,
          orderIndex: item.orderIndex
        };
        
        const validatedItem = insertInvoiceLineItemSchema.parse(invoiceLineItem);
        const createdItem = await storage.createInvoiceLineItem(validatedItem);
        createdLineItems.push(createdItem);
      }
      
      res.status(201).json({ ...invoice, lineItems: createdLineItems });
    } catch (error) {
      res.status(400).json({ error: "Failed to convert quotation to invoice", details: error });
    }
  });

  // Role-based access: ojt cannot access financial routes
  const financeGuard = requireRole("owner", "staff");
  app.use("/api/accounts-receivables", financeGuard);
  app.use("/api/accounts-payables", financeGuard);
  app.use("/api/purchase-orders", financeGuard);
  app.use("/api/sales-entries", financeGuard);
  app.use("/api/operational-expenses", financeGuard);

  // Accounts Receivable routes
  app.get("/api/accounts-receivables", async (req, res) => {
    try {
      const clientId = req.query.clientId as string;
      let ars;
      
      if (clientId) {
        ars = await storage.getAccountsReceivablesByClientId(clientId);
      } else {
        ars = await storage.getAccountsReceivables();
      }
      
      res.json(ars);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accounts receivables" });
    }
  });

  app.get("/api/accounts-receivables/:id", async (req, res) => {
    try {
      const ar = await storage.getAccountsReceivable(req.params.id);
      if (!ar) {
        return res.status(404).json({ error: "Accounts receivable not found" });
      }
      res.json(ar);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accounts receivable" });
    }
  });

  app.post("/api/accounts-receivables", async (req, res) => {
    try {
      const { insertAccountsReceivableSchema } = await import("@shared/schema");
      const { z } = await import("zod");
      
      // Define payment validation schema
      const paymentSchema = z.object({
        paymentMode: z.enum(['cheque', 'cash', 'gcash_bank']),
        amount: z.string().or(z.number()),
        paymentDate: z.coerce.date(),
        chequeNumber: z.string().optional().nullable(),
        referenceNumber: z.string().optional().nullable(),
      }).refine((data) => {
        // Validate mode-specific fields
        if (data.paymentMode === 'cheque') {
          return data.chequeNumber && data.chequeNumber.length > 0;
        }
        if (data.paymentMode === 'gcash_bank') {
          return data.referenceNumber && data.referenceNumber.length > 0;
        }
        return true;
      }, {
        message: "Cheque mode requires cheque number, GCash/Bank mode requires reference number"
      });
      
      const paymentsArraySchema = z.array(paymentSchema).optional();
      
      const { payments, ...arData } = req.body;
      const validatedData = insertAccountsReceivableSchema.parse(arData);
      const validatedPayments = paymentsArraySchema.parse(payments);
      
      let ar;
      try {
        ar = await storage.createAccountsReceivable(validatedData);
        
        // Create payment records if any
        if (validatedPayments && validatedPayments.length > 0) {
          for (let i = 0; i < validatedPayments.length; i++) {
            const payment = validatedPayments[i];
            await storage.createArPayment({
              arId: ar.id,
              paymentNumber: i + 1,
              paymentMode: payment.paymentMode,
              amount: typeof payment.amount === 'number' ? payment.amount.toString() : payment.amount,
              paymentDate: payment.paymentDate,
              chequeNumber: payment.paymentMode === 'cheque' ? payment.chequeNumber || null : null,
              referenceNumber: payment.paymentMode === 'gcash_bank' ? payment.referenceNumber || null : null,
            });
          }
        }
        
        await logActivity('created', 'accounts_receivable', ar.id, ar.arNumber, `Created accounts receivable: ${ar.arNumber}`);
        res.status(201).json(ar);
      } catch (paymentError) {
        // If payment creation fails, delete the AR to maintain consistency
        if (ar) {
          await storage.deleteAccountsReceivable(ar.id);
        }
        throw paymentError;
      }
    } catch (error) {
      res.status(400).json({ error: "Failed to create accounts receivable", details: error });
    }
  });

  app.get("/api/accounts-receivables/:id/payments", async (req, res) => {
    try {
      const payments = await storage.getArPayments(req.params.id);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.patch("/api/accounts-receivables/:id", async (req, res) => {
    try {
      const originalAR = await storage.getAccountsReceivable(req.params.id);
      if (!originalAR) {
        return res.status(404).json({ error: "Accounts receivable not found" });
      }

      // Parse AR fields (strip payments + legacy paymentMethod)
      const { payments, paymentMethod: _pm, ...arFields } = req.body;
      const validatedData = insertAccountsReceivableSchema.partial().parse(arFields);
      const updatedAR = await storage.updateAccountsReceivable(req.params.id, validatedData);
      if (!updatedAR) {
        return res.status(404).json({ error: "Accounts receivable not found" });
      }
      await logActivity('updated', 'accounts_receivable', updatedAR.id, updatedAR.arNumber, `Updated accounts receivable: ${updatedAR.arNumber}`);

      // Sync payments if provided
      if (payments && Array.isArray(payments)) {
        const { z } = await import("zod");
        const paymentSchema = z.object({
          paymentMode: z.enum(['cheque', 'cash', 'gcash_bank']),
          amount: z.string().or(z.number()),
          paymentDate: z.coerce.date(),
          chequeNumber: z.string().optional().nullable(),
          referenceNumber: z.string().optional().nullable(),
        });
        const validatedPayments = z.array(paymentSchema).parse(payments);

        // Replace all payments
        await storage.deleteArPaymentsByArId(req.params.id);
        for (let i = 0; i < validatedPayments.length; i++) {
          const p = validatedPayments[i];
          await storage.createArPayment({
            arId: req.params.id,
            paymentNumber: i + 1,
            paymentMode: p.paymentMode,
            amount: typeof p.amount === 'number' ? p.amount.toString() : p.amount,
            paymentDate: p.paymentDate,
            chequeNumber: p.paymentMode === 'cheque' ? p.chequeNumber || null : null,
            referenceNumber: p.paymentMode === 'gcash_bank' ? p.referenceNumber || null : null,
          });
        }
      }

      // Cash-based revenue: create ONE sales entry when AR status becomes 'paid'
      const wasAlreadyPaid = originalAR.status === 'paid';
      const isNowPaid = updatedAR.status === 'paid';

      if (!wasAlreadyPaid && isNowPaid) {
        // AR just marked paid — create a sales entry (prevent duplicates)
        const existing = await storage.getSalesEntriesBySource('accounts_receivable', updatedAR.id);
        if (existing.length === 0) {
          // Use last payment date if available, otherwise today
          const arPayments = await storage.getArPayments(updatedAR.id);
          const paymentDate = arPayments.length > 0
            ? new Date(arPayments[arPayments.length - 1].paymentDate)
            : new Date();
          const lastPayment = arPayments[arPayments.length - 1];
          const modeMap: Record<string, string> = { cash: 'cash', cheque: 'cheque', gcash_bank: 'bank_gcash' };
          const paymentMethod = lastPayment ? (modeMap[lastPayment.paymentMode] || 'cash') : 'cash';
          const salesEntryData = {
            date: paymentDate,
            amount: updatedAR.amount,
            paymentMethod,
            sourceType: 'accounts_receivable',
            sourceId: updatedAR.id,
            remarks: `AR ${updatedAR.arNumber} - fully paid`,
          };
          const validatedSalesEntry = insertSalesEntrySchema.parse(salesEntryData);
          const salesEntry = await storage.createSalesEntry(validatedSalesEntry);
          await logActivity('created', 'sales_entry', salesEntry.id, `₱${salesEntry.amount}`, `AR paid: ${updatedAR.arNumber}`);
        }
      } else if (wasAlreadyPaid && !isNowPaid) {
        // AR un-paid — remove the auto-created sales entry
        const existing = await storage.getSalesEntriesBySource('accounts_receivable', updatedAR.id);
        for (const entry of existing) {
          await storage.deleteSalesEntry(entry.id);
        }
      }

      res.json(updatedAR);
    } catch (error: any) {
      console.error("PATCH /api/accounts-receivables error:", error?.message, error?.errors);
      res.status(400).json({ error: "Failed to update accounts receivable", details: error?.message });
    }
  });

  app.delete("/api/accounts-receivables/:id", async (req, res) => {
    try {
      const ar = await storage.getAccountsReceivable(req.params.id);
      const success = await storage.deleteAccountsReceivable(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Accounts receivable not found" });
      }
      if (ar) {
        await logActivity('deleted', 'accounts_receivable', ar.id, ar.arNumber, `Deleted accounts receivable: ${ar.arNumber}`);
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete accounts receivable" });
    }
  });

  // Operational Expense routes
  app.get("/api/operational-expenses", async (req, res) => {
    try {
      const expenses = await storage.getOperationalExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch operational expenses" });
    }
  });

  app.get("/api/operational-expenses/:id", async (req, res) => {
    try {
      const expense = await storage.getOperationalExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ error: "Operational expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch operational expense" });
    }
  });

  app.post("/api/operational-expenses", async (req, res) => {
    try {
      const validatedData = insertOperationalExpenseSchema.parse(req.body);
      const expense = await storage.createOperationalExpense(validatedData);
      await logActivity('created', 'operational_expense', expense.id, expense.category, `Created expense: ₱${expense.amount} for ${expense.category}`);
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ error: "Failed to create operational expense", details: error });
    }
  });

  app.patch("/api/operational-expenses/:id", async (req, res) => {
    try {
      const updatedExpense = await storage.updateOperationalExpense(req.params.id, req.body);
      if (!updatedExpense) {
        return res.status(404).json({ error: "Operational expense not found" });
      }
      await logActivity('updated', 'operational_expense', updatedExpense.id, updatedExpense.category, `Updated expense: ₱${updatedExpense.amount} for ${updatedExpense.category}`);
      res.json(updatedExpense);
    } catch (error) {
      res.status(400).json({ error: "Failed to update operational expense", details: error });
    }
  });

  app.delete("/api/operational-expenses/:id", async (req, res) => {
    try {
      const expense = await storage.getOperationalExpense(req.params.id);
      const success = await storage.deleteOperationalExpense(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Operational expense not found" });
      }
      if (expense) {
        await logActivity('deleted', 'operational_expense', expense.id, expense.category, `Deleted expense: ₱${expense.amount} for ${expense.category}`);
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete operational expense" });
    }
  });

  // Sales Entry routes
  app.get("/api/sales-entries", async (req, res) => {
    try {
      const entries = await storage.getSalesEntries();
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales entries" });
    }
  });

  app.get("/api/sales-entries/:id", async (req, res) => {
    try {
      const entry = await storage.getSalesEntry(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: "Sales entry not found" });
      }
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales entry" });
    }
  });

  app.post("/api/sales-entries", async (req, res) => {
    try {
      const validatedData = insertSalesEntrySchema.parse(req.body);
      const entry = await storage.createSalesEntry(validatedData);
      await logActivity('created', 'sales_entry', entry.id, `₱${entry.amount}`, `Created sales entry: ₱${entry.amount} via ${entry.paymentMethod}`);
      res.status(201).json(entry);
    } catch (error) {
      res.status(400).json({ error: "Failed to create sales entry", details: error });
    }
  });

  app.patch("/api/sales-entries/:id", async (req, res) => {
    try {
      const updatedEntry = await storage.updateSalesEntry(req.params.id, req.body);
      if (!updatedEntry) {
        return res.status(404).json({ error: "Sales entry not found" });
      }
      await logActivity('updated', 'sales_entry', updatedEntry.id, `₱${updatedEntry.amount}`, `Updated sales entry: ₱${updatedEntry.amount} via ${updatedEntry.paymentMethod}`);
      res.json(updatedEntry);
    } catch (error) {
      res.status(400).json({ error: "Failed to update sales entry", details: error });
    }
  });

  app.delete("/api/sales-entries/:id", async (req, res) => {
    try {
      const entry = await storage.getSalesEntry(req.params.id);
      const success = await storage.deleteSalesEntry(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Sales entry not found" });
      }
      if (entry) {
        await logActivity('deleted', 'sales_entry', entry.id, `₱${entry.amount}`, `Deleted sales entry: ₱${entry.amount} via ${entry.paymentMethod}`);
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete sales entry" });
    }
  });

  // Purchase Order routes
  app.get("/api/purchase-orders", async (req, res) => {
    try {
      const purchaseOrders = await storage.getPurchaseOrders();
      res.json(purchaseOrders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase orders" });
    }
  });

  app.get("/api/purchase-orders/:id", async (req, res) => {
    try {
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      res.json(po);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase order" });
    }
  });

  // Purchase Order Items routes
  app.get("/api/purchase-order-items", async (req, res) => {
    try {
      const items = await storage.getAllPurchaseOrderItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase order items" });
    }
  });

  app.post("/api/purchase-orders", async (req, res) => {
    try {
      const { items, ...poData } = req.body;
      
      // Validate purchase order data
      const validatedPO = insertPurchaseOrderSchema.parse(poData);
      const po = await storage.createPurchaseOrder(validatedPO);
      await logActivity('created', 'purchase_order', po.id, po.poNumber, `Created purchase order: ${po.poNumber} for ${po.supplierName}`);
      
      // Validate and create items if provided
      if (items && Array.isArray(items)) {
        const createdItems = [];
        for (const item of items) {
          const validatedItem = insertPurchaseOrderItemSchema.parse({
            ...item,
            purchaseOrderId: po.id
          });
          const createdItem = await storage.createPurchaseOrderItem(validatedItem);
          createdItems.push(createdItem);
        }
        
        // Automatically create Accounts Payable entry (only if payment is pending)
        // Paid POs don't need AP tracking since there's no outstanding payable
        if (po.paymentStatus === 'pending') {
          const apData = {
            date: po.date,
            supplierName: po.supplierName,
            purchaseOrderId: po.id,
            poNumber: po.poNumber,
            amount: po.grandTotal,
            balance: po.grandTotal,
            status: 'pending',
            remarks: `Purchase Order ${po.poNumber}`,
          };
          
          const validatedAP = insertAccountsPayableSchema.parse(apData);
          await storage.createAccountsPayable(validatedAP);
        }
        
        // If PO is paid, create an operational expense entry
        if (po.paymentStatus === 'paid') {
          const expenseData = {
            date: po.date,
            amount: po.grandTotal,
            category: 'purchase_order',
            paymentMethod: 'cash',
            vendor: po.supplierName,
            referenceNo: po.poNumber,
            remarks: `Purchase Order ${po.poNumber}`,
          };
          
          const validatedExpense = insertOperationalExpenseSchema.parse(expenseData);
          const expense = await storage.createOperationalExpense(validatedExpense);
          await logActivity('created', 'operational_expense', expense.id, `₱${expense.amount}`, `Created expense from PO: ${po.poNumber}`);
        }
        
        // Return PO with items
        res.status(201).json({ ...po, items: createdItems });
      } else {
        res.status(201).json(po);
      }
    } catch (error) {
      res.status(400).json({ error: "Failed to create purchase order", details: error });
    }
  });

  app.patch("/api/purchase-orders/:id", async (req, res) => {
    try {
      const { items, ...poData } = req.body;
      
      // Get original PO to check if status is changing
      const originalPO = await storage.getPurchaseOrder(req.params.id);
      if (!originalPO) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      
      // Update the purchase order
      const updatedPO = await storage.updatePurchaseOrder(req.params.id, poData);
      if (!updatedPO) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      await logActivity('updated', 'purchase_order', updatedPO.id, updatedPO.poNumber, `Updated purchase order: ${updatedPO.poNumber}`);
      
      // If payment status changed from pending to paid, create an operational expense
      if (originalPO.paymentStatus === 'pending' && poData.paymentStatus === 'paid') {
        const expenseData = {
          date: updatedPO.date,
          amount: updatedPO.grandTotal,
          category: 'purchase_order',
          paymentMethod: 'cash',
          vendor: updatedPO.supplierName,
          referenceNo: updatedPO.poNumber,
          remarks: `Purchase Order ${updatedPO.poNumber} - Paid`,
        };
        
        const validatedExpense = insertOperationalExpenseSchema.parse(expenseData);
        const expense = await storage.createOperationalExpense(validatedExpense);
        await logActivity('created', 'operational_expense', expense.id, `₱${expense.amount}`, `Created expense from paid PO: ${updatedPO.poNumber}`);
      }
      
      // Update or create linked accounts payable record
      const linkedAPs = await storage.getAccountsPayablesByPurchaseOrderId(req.params.id);
      
      // If no AP exists and PO is being marked as pending, create one
      if (linkedAPs.length === 0 && poData.paymentStatus === 'pending') {
        const apData = {
          date: updatedPO.date,
          supplierName: updatedPO.supplierName,
          purchaseOrderId: updatedPO.id,
          poNumber: updatedPO.poNumber,
          amount: updatedPO.grandTotal,
          balance: updatedPO.grandTotal,
          status: 'pending',
          remarks: `Purchase Order ${updatedPO.poNumber}`,
        };
        
        const validatedAP = insertAccountsPayableSchema.parse(apData);
        await storage.createAccountsPayable(validatedAP);
      }
      // If AP exists, update it with any changed data
      else if (linkedAPs.length > 0) {
        const linkedAP = linkedAPs[0];
        const apUpdateData: any = {};
        
        // Determine final status (use provided status or keep existing)
        const finalStatus = poData.paymentStatus 
          ? (poData.paymentStatus === 'paid' ? 'paid' : 'pending')
          : linkedAP.status;
        
        // Sync payment status
        if (poData.paymentStatus) {
          apUpdateData.status = poData.paymentStatus === 'paid' ? 'paid' : 'pending';
        }
        
        // Sync financial data
        if (poData.grandTotal !== undefined) {
          apUpdateData.amount = poData.grandTotal;
          // Only update balance if AP will be (or remains) pending
          // Paid APs should keep balance at 0
          if (finalStatus === 'pending') {
            apUpdateData.balance = poData.grandTotal;
          } else if (finalStatus === 'paid') {
            apUpdateData.balance = "0.00";
          }
        }
        
        // If marking as paid but not updating amount, still set balance to 0
        if (poData.paymentStatus === 'paid' && poData.grandTotal === undefined) {
          apUpdateData.balance = "0.00";
        }
        
        // Sync date
        if (poData.date !== undefined) {
          apUpdateData.date = poData.date;
        }
        
        // Sync supplier data
        if (poData.supplierName !== undefined) {
          apUpdateData.supplierName = poData.supplierName;
        }
        
        // Update AP if there are changes
        if (Object.keys(apUpdateData).length > 0) {
          await storage.updateAccountsPayable(linkedAP.id, apUpdateData);
        }
      }
      
      // If items are provided, delete existing items and create new ones
      if (items && Array.isArray(items)) {
        await storage.deletePurchaseOrderItemsByPurchaseOrderId(req.params.id);
        
        const createdItems = [];
        for (const item of items) {
          const validatedItem = insertPurchaseOrderItemSchema.parse({
            ...item,
            purchaseOrderId: req.params.id
          });
          const createdItem = await storage.createPurchaseOrderItem(validatedItem);
          createdItems.push(createdItem);
        }
        
        res.json({ ...updatedPO, items: createdItems });
      } else {
        res.json(updatedPO);
      }
    } catch (error) {
      res.status(400).json({ error: "Failed to update purchase order", details: error });
    }
  });

  app.delete("/api/purchase-orders/:id", async (req, res) => {
    try {
      const success = await storage.deletePurchaseOrder(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete purchase order" });
    }
  });

  // Purchase Order Item routes
  app.get("/api/purchase-orders/:poId/items", async (req, res) => {
    try {
      const items = await storage.getPurchaseOrderItems(req.params.poId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase order items" });
    }
  });

  app.post("/api/purchase-orders/:id/convert-to-payable", async (req, res) => {
    try {
      const { bankDetails } = req.body;
      const poId = req.params.id;
      
      // Get the purchase order
      const po = await storage.getPurchaseOrder(poId);
      if (!po) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      
      // Check if an AP already exists for this PO
      const existingAPs = await storage.getAccountsPayablesByPurchaseOrderId(poId);
      if (existingAPs.length > 0) {
        return res.status(400).json({ error: "This purchase order has already been converted to accounts payable" });
      }
      
      // Create accounts payable
      const apData = {
        date: po.date,
        supplierName: po.supplierName,
        purchaseOrderId: po.id,
        poNumber: po.poNumber,
        amount: po.grandTotal,
        balance: po.grandTotal,
        status: 'pending',
        remarks: `Converted from Purchase Order ${po.poNumber}`,
        bankDetails: bankDetails || '',
      };
      
      const validatedAP = insertAccountsPayableSchema.parse(apData);
      const ap = await storage.createAccountsPayable(validatedAP);
      await logActivity('created', 'accounts_payable', ap.id, ap.apNumber, `Converted PO ${po.poNumber} to AP ${ap.apNumber}`);
      
      res.status(201).json(ap);
    } catch (error) {
      console.error('Error converting to payable:', error);
      res.status(500).json({ error: "Failed to convert to payable" });
    }
  });

  app.post("/api/purchase-orders/:poId/items", async (req, res) => {
    try {
      const validatedItem = insertPurchaseOrderItemSchema.parse({
        ...req.body,
        purchaseOrderId: req.params.poId
      });
      const item = await storage.createPurchaseOrderItem(validatedItem);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ error: "Failed to create purchase order item", details: error });
    }
  });

  app.delete("/api/purchase-order-items/:id", async (req, res) => {
    try {
      const success = await storage.deletePurchaseOrderItem(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Purchase order item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete purchase order item" });
    }
  });

  // Accounts Payable routes
  app.get("/api/accounts-payables", async (req, res) => {
    try {
      const accountsPayables = await storage.getAccountsPayables();
      res.json(accountsPayables);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accounts payables" });
    }
  });

  app.get("/api/accounts-payables/:id", async (req, res) => {
    try {
      const ap = await storage.getAccountsPayable(req.params.id);
      if (!ap) {
        return res.status(404).json({ error: "Accounts payable not found" });
      }
      res.json(ap);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accounts payable" });
    }
  });

  app.post("/api/accounts-payables", async (req, res) => {
    try {
      const validatedAP = insertAccountsPayableSchema.parse(req.body);
      const ap = await storage.createAccountsPayable(validatedAP);
      res.status(201).json(ap);
    } catch (error) {
      res.status(400).json({ error: "Failed to create accounts payable", details: error });
    }
  });

  app.patch("/api/accounts-payables/:id", async (req, res) => {
    try {
      // Get original AP to check if status is changing
      const originalAP = await storage.getAccountsPayable(req.params.id);
      if (!originalAP) {
        return res.status(404).json({ error: "Accounts payable not found" });
      }
      
      const updatedAP = await storage.updateAccountsPayable(req.params.id, req.body);
      if (!updatedAP) {
        return res.status(404).json({ error: "Accounts payable not found" });
      }
      await logActivity('updated', 'accounts_payable', updatedAP.id, updatedAP.apNumber, `Updated accounts payable: ${updatedAP.apNumber}`);
      
      // If status changed from pending to paid OR balance decreased, create an operational expense
      const oldBalance = parseFloat(originalAP.balance);
      const newBalance = parseFloat(updatedAP.balance);
      const paymentAmount = oldBalance - newBalance;
      
      if ((originalAP.status === 'pending' && req.body.status === 'paid') || paymentAmount > 0) {
        // Use payment amount if balance decreased, otherwise use full amount
        const expenseAmount = paymentAmount > 0 ? paymentAmount.toFixed(2) : updatedAP.amount;
        
        const expenseData = {
          date: updatedAP.paymentDate || updatedAP.date,
          amount: expenseAmount,
          category: 'accounts_payable',
          paymentMethod: updatedAP.paymentMethod || 'cash',
          vendor: updatedAP.supplierName,
          referenceNo: updatedAP.apNumber,
          remarks: `Accounts Payable ${updatedAP.apNumber} - Payment`,
        };
        
        const validatedExpense = insertOperationalExpenseSchema.parse(expenseData);
        const expense = await storage.createOperationalExpense(validatedExpense);
        await logActivity('created', 'operational_expense', expense.id, `₱${expense.amount}`, `Created expense from AP payment: ${updatedAP.apNumber}`);
      }
      
      res.json(updatedAP);
    } catch (error) {
      res.status(400).json({ error: "Failed to update accounts payable", details: error });
    }
  });

  app.delete("/api/accounts-payables/:id", async (req, res) => {
    try {
      const success = await storage.deleteAccountsPayable(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Accounts payable not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete accounts payable" });
    }
  });

  // Notification routes
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const notifications = await storage.getNotifications(req.params.userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/:userId/unread", async (req, res) => {
    try {
      const notifications = await storage.getUnreadNotifications(req.params.userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const validatedData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(validatedData);
      res.status(201).json(notification);
    } catch (error) {
      res.status(400).json({ error: "Invalid notification data", details: error });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const success = await storage.markNotificationAsRead(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/:userId/read-all", async (req, res) => {
    try {
      const success = await storage.markAllNotificationsAsRead(req.params.userId);
      res.json({ message: "All notifications marked as read", success });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  app.post("/api/notifications/:userId/generate", async (req, res) => {
    try {
      const newNotifications = await storage.generateNotifications(req.params.userId);
      res.json({ 
        message: `Generated ${newNotifications.length} new notification(s)`,
        notifications: newNotifications 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate notifications" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const success = await storage.deleteNotification(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // Activity Log routes
  app.get("/api/activity-logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // Backfill lastCleaningDate for all clients on startup
  (async () => {
    try {
      const clients = await storage.getClients();
      for (const client of clients) {
        await syncClientLastCleaning(client.id);
      }
      console.log(`[startup] Synced lastTransactionDate for ${clients.length} clients`);
    } catch (err) {
      console.error('[startup] Failed to backfill lastTransactionDate:', err);
    }
  })();

  // Backfill sales entries for completed service reports that don't have one yet
  (async () => {
    try {
      const reports = await storage.getServiceReports();
      let created = 0;
      for (const report of reports) {
        if (report.status?.toLowerCase() !== 'completed') continue;
        const existing = await storage.getSalesEntriesBySource('service_report', report.id);
        if (existing.length > 0) continue;
        const lineItems = await storage.getServiceLineItems(report.id);
        const total = lineItems.reduce((sum, item: any) => sum + parseFloat(item.amount || '0'), 0);
        if (total <= 0) continue;
        await storage.createSalesEntry({
          date: report.serviceDate || new Date(),
          amount: total.toFixed(2),
          paymentMethod: 'cash',
          sourceType: 'service_report',
          sourceId: report.id,
          remarks: `Service Report ${report.reportNumber}`,
        });
        created++;
      }
      if (created > 0) console.log(`[startup] Backfilled ${created} sales entries for completed service reports`);
    } catch (err) {
      console.error('[startup] Failed to backfill service report sales entries:', err);
    }
  })();

  // Auto-generate birthday/AR notifications for all users daily
  const runDailyNotifications = async () => {
    try {
      const allUsers = await storage.getUsers();
      for (const user of allUsers) {
        await storage.generateNotifications(user.id);
      }
      console.log(`[notifications] Auto-generated notifications for ${allUsers.length} user(s)`);
    } catch (err) {
      console.error('[notifications] Failed to auto-generate notifications:', err);
    }
  };
  runDailyNotifications();
  setInterval(runDailyNotifications, 24 * 60 * 60 * 1000);

  const httpServer = createServer(app);

  return httpServer;
}
