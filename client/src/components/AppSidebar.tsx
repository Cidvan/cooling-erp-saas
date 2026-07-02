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
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                asChild
                data-active={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Link href={item.url} className="hover-elevate">
                  <item.icon className="w-4 h-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
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
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">CD</span>
          </div>
          <div>
            <div className="font-semibold text-sm">CoolDesk</div>
            <div className="text-xs text-muted-foreground">
              {isSuperAdmin ? "Platform Admin" : "ERP System"}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
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