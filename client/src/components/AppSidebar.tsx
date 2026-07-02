import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel,
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarHeader
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Quote, 
  DollarSign, 
  ShoppingCart, 
  FolderOpen,
  ReceiptText,
  Building2
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";

const operationsItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Clients", 
    url: "/clients",
    icon: Users,
  },
  {
    title: "Service Reports",
    url: "/service-reports", 
    icon: FileText,
  },
  {
    title: "Quotations",
    url: "/quotations",
    icon: Quote,
  },
  {
    title: "Documents",
    url: "/documents",
    icon: FolderOpen,
  },
];

const financeItems = [
  {
    title: "Sales & Financial",
    url: "/sales-financial",
    icon: DollarSign,
  },
  {
    title: "Accounts Receivable",
    url: "/accounts-receivables",
    icon: ReceiptText,
  },
  {
    title: "Purchase Orders", 
    url: "/purchase-orders",
    icon: ShoppingCart,
  },
];

const superAdminItems = [
  {
    title: "Companies",
    url: "/admin/companies",
    icon: Building2,
  },
];

function NavGroup({ label, items, location }: { label: string; items: typeof operationsItems; location: string }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => {
            const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  data-active={isActive}
                  data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  className="h-9 rounded-lg px-3 text-[13px] font-medium text-sidebar-foreground/80 transition-colors data-[active=true]:font-semibold data-[active=true]:text-primary data-[active=true]:shadow-[inset_0_0_0_1px_hsl(var(--sidebar-border))]"
                >
                  <Link href={item.url}>
                    <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isOjt = user?.role === "ojt";
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <Sidebar data-testid="sidebar-navigation">
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-primary-foreground font-bold text-sm">CD</span>
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[15px] tracking-tight truncate">CoolDesk</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {isSuperAdmin ? "Platform Admin" : "Business Workspace"}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1 pt-2">
        {isSuperAdmin ? (
          <NavGroup label="Platform" items={superAdminItems} location={location} />
        ) : (
          <>
            <NavGroup label="Operations" items={operationsItems} location={location} />
            {!isOjt && <NavGroup label="Finance" items={financeItems} location={location} />}
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}