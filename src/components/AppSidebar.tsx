import {
  LayoutDashboard,
  Pill,
  Package,
  ShoppingCart,
  Users,
  Truck,
  BarChart3,
  Bell,
  UserCog,
  Cross,
  Building2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Punto de Venta", url: "/pos", icon: ShoppingCart },
];

const managementItems = [
  { title: "Productos", url: "/productos", icon: Pill },
  { title: "Inventario", url: "/inventario", icon: Package },
  { title: "Compras", url: "/compras", icon: Truck },
  { title: "Clientes", url: "/clientes", icon: Users },
];

const systemItems = [
  { title: "Reportes", url: "/reportes", icon: BarChart3 },
  { title: "Alertas", url: "/alertas", icon: Bell },
  { title: "Usuarios", url: "/usuarios", icon: UserCog },
  { title: "Farmacia", url: "/farmacia", icon: Building2 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const renderGroup = (label: string, items: typeof mainItems) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel className="text-sidebar-muted uppercase text-[10px] tracking-widest font-semibold">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(item.url)}>
                <NavLink
                  to={item.url}
                  end
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  activeClassName="bg-sidebar-accent text-sidebar-primary-foreground font-medium"
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span className="text-sm">{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Cross className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-base font-bold text-sidebar-foreground">Farmacia CyR</h1>
              <p className="text-[11px] text-sidebar-muted">Sistema de Gestion</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 gap-1">
        {renderGroup("Principal", mainItems)}
        {renderGroup("Gestión", managementItems)}
        {renderGroup("Sistema", systemItems)}
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="text-[10px] text-sidebar-muted text-center">
            Farmacia CyR v1.0
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
