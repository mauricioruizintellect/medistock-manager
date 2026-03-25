import { useState } from "react";
import { Plus, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { suppliers } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";

const purchases = [
  { id: "CO001", fecha: "2026-03-20", proveedor: "Distribuidora Farmacéutica del Norte", factura: "F-2024-0150", productos: 5, total: 450.00, estado: "recibida" },
  { id: "CO002", fecha: "2026-03-18", proveedor: "MedSupply Internacional", factura: "F-2024-0148", productos: 3, total: 280.00, estado: "recibida" },
  { id: "CO003", fecha: "2026-03-15", proveedor: "Laboratorios Unidos S.A.", factura: "F-2024-0145", productos: 8, total: 720.00, estado: "recibida" },
  { id: "CO004", fecha: "2026-03-25", proveedor: "Distribuidora Farmacéutica del Norte", factura: "F-2024-0155", productos: 4, total: 350.00, estado: "pendiente" },
];

const Purchases = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Compras a Proveedores</h1>
          <p className="page-description">Registro y control de compras</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nueva Compra</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Registrar Compra</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>No. Factura</Label><Input placeholder="F-2024-XXXX" /></div>
                <div className="space-y-2"><Label>Fecha de Compra</Label><Input type="date" /></div>
              </div>
              <div className="space-y-2"><Label>Total ($)</Label><Input type="number" step="0.01" placeholder="0.00" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => { setDialogOpen(false); toast({ title: "Compra registrada" }); }}>Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-2xl font-bold">{purchases.length}</p>
          <p className="text-xs text-muted-foreground">Compras Totales</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold">${purchases.reduce((s, p) => s + p.total, 0).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Monto Total</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold">{suppliers.length}</p>
          <p className="text-xs text-muted-foreground">Proveedores</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="hidden md:table-cell">Factura</TableHead>
                <TableHead className="text-center">Productos</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                  <TableCell className="text-sm">{p.fecha}</TableCell>
                  <TableCell className="text-sm font-medium">{p.proveedor}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.factura}</TableCell>
                  <TableCell className="text-center">{p.productos}</TableCell>
                  <TableCell className="text-right font-medium">${p.total.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={p.estado === "recibida" ? "default" : "secondary"} className="text-[10px] capitalize">{p.estado}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Purchases;
