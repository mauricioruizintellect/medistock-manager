import { AlertTriangle, Clock, XCircle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { products } from "@/lib/mock-data";

const Alerts = () => {
  const lowStock = products.filter((p) => p.stock <= p.stockMinimo && p.stock > 0 && p.estado === "activo");
  const noStock = products.filter((p) => p.stock === 0);
  const expired = products.filter((p) => new Date(p.fechaVencimiento) < new Date());
  const expiring = products.filter((p) => {
    const diff = (new Date(p.fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 90;
  });

  const sections = [
    { title: "Sin Stock", icon: XCircle, items: noStock, color: "text-destructive", bg: "bg-destructive/10", badge: "destructive" as const },
    { title: "Stock Bajo", icon: AlertTriangle, items: lowStock, color: "text-warning", bg: "bg-warning/10", badge: "secondary" as const },
    { title: "Productos Vencidos", icon: Clock, items: expired, color: "text-destructive", bg: "bg-destructive/10", badge: "destructive" as const },
    { title: "Próximos a Vencer (90 días)", icon: Clock, items: expiring, color: "text-warning", bg: "bg-warning/10", badge: "secondary" as const },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Alertas y Notificaciones</h1>
        <p className="page-description">Resumen de alertas activas del sistema</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sections.map((s) => (
          <div key={s.title} className="stat-card">
            <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold">{s.items.length}</p>
            <p className="text-xs text-muted-foreground">{s.title}</p>
          </div>
        ))}
      </div>

      {sections.map((section) => (
        section.items.length > 0 && (
          <Card key={section.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <section.icon className={`h-4 w-4 ${section.color}`} />
                {section.title}
                <Badge variant={section.badge} className="text-[10px] ml-2">{section.items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {section.items.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{p.nombreComercial}</p>
                        <p className="text-xs text-muted-foreground">{p.codigoInterno} · {p.laboratorio}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Stock: {p.stock} / {p.stockMinimo}</p>
                      <p className="text-xs text-muted-foreground">Vence: {p.fechaVencimiento}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ))}
    </div>
  );
};

export default Alerts;
