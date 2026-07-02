import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import TopNavigation from "@/components/TopNavigation";
import { AuthProvider, useAuth } from "@/lib/auth";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import ServiceReports from "@/pages/ServiceReports";
import ServiceReportPDFPreview from "@/pages/ServiceReportPDFPreview";
import QuotationPDFPreview from "@/pages/QuotationPDFPreview";
import Quotations from "@/pages/Quotations";
import SalesFinancialDashboard from "@/pages/SalesFinancialDashboard";
import SalesTracking from "@/pages/SalesTracking";
import AccountsReceivables from "@/pages/AccountsReceivables";
import PLCashFlow from "@/pages/PLCashFlow";
import PurchaseOrders from "@/pages/PurchaseOrders";
import Documents from "@/pages/Documents";
import Profile from "@/pages/Profile";
import PlaceholderPage from "@/pages/PlaceholderPage";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

// Guard component: redirects ojt users away from Finance routes
function FinanceRoute({ component: Component }: { component: React.ComponentType }) {
  const { user } = useAuth();
  if (user?.role === "ojt") {
    return <Redirect to="/dashboard" />;
  }
  return <Component />;
}

// Protected routes component - only accessible when logged in
function ProtectedRoutes() {
  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/clients" component={Clients} />
      <Route path="/service-reports/pdf-preview/:reportNumber" component={ServiceReportPDFPreview} />
      <Route path="/service-reports/edit/:id" component={ServiceReports} />
      <Route path="/service-reports" component={ServiceReports} />
      <Route path="/quotations/pdf-preview/:quotationNumber" component={QuotationPDFPreview} />
      <Route path="/quotations" component={Quotations} />
      <Route path="/sales-financial/sales-tracking">
        <FinanceRoute component={SalesTracking} />
      </Route>
      <Route path="/sales-financial/accounts-receivables">
        <FinanceRoute component={AccountsReceivables} />
      </Route>
      <Route path="/sales-financial/pl-cash-flow">
        <FinanceRoute component={PLCashFlow} />
      </Route>
      <Route path="/sales-financial">
        <FinanceRoute component={SalesFinancialDashboard} />
      </Route>
      <Route path="/accounts-receivables">
        <FinanceRoute component={AccountsReceivables} />
      </Route>
      <Route path="/purchase-orders">
        <FinanceRoute component={PurchaseOrders} />
      </Route>
      <Route path="/documents" component={Documents} />
      <Route path="/settings">
        <PlaceholderPage 
          title="Settings"
          description="Configure your ERP system preferences"
          comingSoonFeatures={[
            "User management",
            "System preferences",
            "Data backup settings",
            "Integration configuration",
            "Security settings"
          ]}
        />
      </Route>
      <Route path="/profile" component={Profile} />
      {/* Fallback to dashboard */}
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Main router that handles public vs protected routes
function AppRouter() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    
    if (!user) {
      // User is not authenticated
      // Redirect to landing page if on protected routes
      if (location !== "/" && location !== "/login") {
        setLocation("/");
      }
    } else {
      // User is authenticated
      // Redirect to dashboard if on public pages
      if (location === "/" || location === "/login") {
        setLocation("/dashboard");
      }
    }
  }, [user, isLoading, location, setLocation]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Public routes (landing and login)
  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/" component={LandingPage} />
        <Route component={LandingPage} />
      </Switch>
    );
  }

  // Protected routes (dashboard and app)
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <TopNavigation />
          <main className="flex-1 overflow-auto">
            <ProtectedRoutes />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppRouter />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
