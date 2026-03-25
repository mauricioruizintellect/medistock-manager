import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { products, recentSales, dailySalesData } from "@/lib/mock-data";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const Reports = () => {
  const expiringProducts = products.filter((p) => {
    const diff = (new Date(p.fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 90;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-description">Informes y estadísticas del negocio</p>
        </div>
        <Button variant="outline" className="gap-2"><FileDown className="h-4 w-4" />Exportar</Button>
      </div>

      <Tabs defaultValue="ventas">
        <TabsList>
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
          <TabsTrigger value="vencimiento">Por Vencer</TabsTrigger>
        </TabsList>

        <TabsContent value="ventas" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Ventas de la Semana</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => [`$${v}`, "Ventas"]} />
                  <Bar dataKey="ventas" fill="hsl(152, 55%, 38%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Productos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.id}</TableCell>
                      <TableCell className="text-sm">{s.fecha}</TableCell>
                      <TableCell className="text-sm font-medium">{s.cliente}</TableCell>
                      <TableCell className="text-center">{s.productos.length}</TableCell>
                      <TableCell className="text-right font-medium">${s.total.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px] capitalize">{s.metodoPago}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventario">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Mínimo</TableHead>
                    <TableHead className="text-right">Valor Stock</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.filter(p => p.estado === "activo").map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.nombreComercial}</TableCell>
                      <TableCell className="text-center">{p.stock}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{p.stockMinimo}</TableCell>
                      <TableCell className="text-right font-medium">${(p.stock * p.precioCompra).toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        {p.stock === 0 ? <Badge variant="destructive" className="text-[10px]">Sin stock</Badge>
                          : p.stock <= p.stockMinimo ? <Badge className="badge-low-stock text-[10px]">Bajo</Badge>
                          : <Badge variant="secondary" className="text-[10px]">OK</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencimiento">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiringProducts.map((p) => {
                    const diff = Math.ceil((new Date(p.fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-sm">{p.nombreComercial}</TableCell>
                        <TableCell className="text-sm">{p.lote}</TableCell>
                        <TableCell className="text-sm">{p.fechaVencimiento}</TableCell>
                        <TableCell className="text-center">{p.stock}</TableCell>
                        <TableCell className="text-center">
                          {diff <= 0 ? <Badge variant="destructive" className="text-[10px]">Vencido</Badge>
                            : diff <= 30 ? <Badge variant="destructive" className="text-[10px]">{diff} días</Badge>
                            : <Badge className="badge-low-stock text-[10px]">{diff} días</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
