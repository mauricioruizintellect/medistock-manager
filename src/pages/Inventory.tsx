import { useState } from "react";
import { Package, ArrowUpCircle, ArrowDownCircle, RotateCcw, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { products } from "@/lib/mock-data";

const movements = [
  { id: "M001", fecha: "2026-03-25 08:00", producto: "Paracetamol 500mg", tipo: "entrada", cantidad: 50, motivo: "Compra proveedor", usuario: "Admin" },
  { id: "M002", fecha: "2026-03-25 09:15", producto: "Metformina 850mg", tipo: "salida", cantidad: 2, motivo: "Venta V001", usuario: "Ana Vendedor" },
  { id: "M003", fecha: "2026-03-25 10:30", producto: "Paracetamol 500mg", tipo: "salida", cantidad: 1, motivo: "Venta V002", usuario: "Ana Vendedor" },
  { id: "M004", fecha: "2026-03-24 14:00", producto: "Ibuprofeno 400mg", tipo: "ajuste", cantidad: -2, motivo: "Ajuste por daño", usuario: "Admin" },
  { id: "M005", fecha: "2026-03-24 16:00", producto: "Vitamina C 1000mg", tipo: "entrada", cantidad: 100, motivo: "Compra proveedor", usuario: "Admin" },
];

const Inventory = () => {
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter(p =>
    p.nombreComercial.toLowerCase().includes(search.toLowerCase()) ||
    p.codigoInterno.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-description">Control de existencias y movimientos</p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2"><ArrowUpCircle className="h-4 w-4" />Entrada</Button>
          <Button variant="outline" className="gap-2"><RotateCcw className="h-4 w-4" />Ajuste</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-2xl font-bold">{products.reduce((s, p) => s + p.stock, 0)}</p>
          <p className="text-xs text-muted-foreground">Unidades Totales</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold">{products.filter(p => p.estado === "activo").length}</p>
          <p className="text-xs text-muted-foreground">Productos Activos</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-warning">{products.filter(p => p.stock <= p.stockMinimo && p.stock > 0).length}</p>
          <p className="text-xs text-muted-foreground">Stock Bajo</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-destructive">{products.filter(p => p.stock === 0).length}</p>
          <p className="text-xs text-muted-foreground">Sin Stock</p>
        </div>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Existencias</TabsTrigger>
          <TabsTrigger value="movements">Kardex / Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Mínimo</TableHead>
                    <TableHead className="hidden md:table-cell">Lote</TableHead>
                    <TableHead className="hidden md:table-cell">Vencimiento</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{p.nombreComercial}</p>
                        <p className="text-xs text-muted-foreground">{p.codigoInterno}</p>
                      </TableCell>
                      <TableCell className="text-center font-medium">{p.stock}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{p.stockMinimo}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{p.lote}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{p.fechaVencimiento}</TableCell>
                      <TableCell className="text-center">
                        {p.stock === 0 ? (
                          <Badge variant="destructive" className="text-[10px]">Sin stock</Badge>
                        ) : p.stock <= p.stockMinimo ? (
                          <Badge className="badge-low-stock text-[10px]">Bajo</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Tipo</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="hidden md:table-cell">Motivo</TableHead>
                    <TableHead className="hidden md:table-cell">Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">{m.fecha}</TableCell>
                      <TableCell className="text-sm font-medium">{m.producto}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={m.tipo === "entrada" ? "default" : m.tipo === "salida" ? "secondary" : "outline"} className="text-[10px] capitalize">
                          {m.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {m.tipo === "entrada" ? "+" : ""}{m.cantidad}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{m.motivo}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{m.usuario}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Inventory;
