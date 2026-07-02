import TopNavigation from '../TopNavigation';
import { SidebarProvider } from "@/components/ui/sidebar";

export default function TopNavigationExample() {
  return (
    <SidebarProvider>
      <div className="w-full">
        <TopNavigation userName="Mr. Johnson" notifications={3} />
      </div>
    </SidebarProvider>
  );
}