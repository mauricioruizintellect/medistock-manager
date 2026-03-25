import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  Package,
  Users,
  Truck,
  ShoppingCart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { products, recentSales, dailySalesData, topProductsData, categorySalesData, clients, suppliers } from "@/lib/mock-data";

const CHART_COLORS = [
  "hsl(152, 55%, 38%)",
  "hsl(200, 80%, 50%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 60%, 50%)",
  "hsl(0, 72%, 51%)",
];

const Dashboard = () => {
  const lowStockProducts = products.filter((p) => p.stock <= p.stockMinimo && p.estado === "activo");
  const expiringProducts = products.filter((p) => {
    const exp = new Date(p.fechaVencimiento);
    const now = new Date();
    const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 90 && diff > 0;
  });
  const todaySales = recentSales.filter((s) => s.fecha.startsWith("2026-03-25"));
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
  const monthTotal = recentSales.reduce((sum, s) => sum + s.total, 0);

  const stats = [
    { label: "Ventas del Día", value: `$${todayTotal.toFixed(2)}`, icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
    { label: "Ventas del Mes", value: `$${monthTotal.toFixed(2)}`, icon: TrendingUp, color: "text-info", bg: "bg-info/10" },
    { label: "Stock Bajo", value: lowStockProducts.length, icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
    { label: "Por Vencer", value: expiringProducts.length, icon: Clock, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Productos", value: products.length, icon: Package, color: "text-primary", bg: "bg-primary/10" },
    { label: "Clientes", value: clients.length, icon: Users, color: "text-info", bg: "bg-info/10" },
    { label: "Proveedores", value: suppliers.length, icon: Truck, color: "text-accent-foreground", bg: "bg-accent" },
    { label: "Ventas Hoy", value: todaySales.length, icon: ShoppingCart, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Resumen general de tu farmacia</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`h-10 w-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Ventas por Día</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="dia" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(value: number) => [`$${value}`, "Ventas"]} />
                <Bar dataKey="ventas" fill="hsl(152, 55%, 38%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Categorías más Vendidas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categorySalesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="ventas"
                  nameKey="categoria"
                >
                  {categorySalesData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`$${value}`, "Ventas"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {categorySalesData.map((item, i) => (
                <div key={item.categoria} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                  <span className="text-muted-foreground">{item.categoria}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Productos más Vendidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topProductsData.map((p, i) => (
              <div key={p.nombre} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <span className="text-sm font-medium">{p.nombre}</span>
                </div>
                <Badge variant="secondary" className="text-xs">{p.ventas} uds</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Últimas Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSales.slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{sale.cliente}</p>
                    <p className="text-xs text-muted-foreground">{sale.fecha} · {sale.productos.length} producto(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">${sale.total.toFixed(2)}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">{sale.metodoPago}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
