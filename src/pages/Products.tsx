import { useState } from "react";
import { Search, Plus, Edit2, Trash2, AlertTriangle, Clock, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { products, type Product } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";

const categories = ["Todos", "Analgésicos", "Antibióticos", "Gastrointestinal", "Cardiovascular", "Antialérgicos", "Antidiabéticos", "Antiinflamatorios", "Vitaminas"];

const Products = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const filtered = products.filter((p) => {
    const matchSearch =
      p.nombreComercial.toLowerCase().includes(search.toLowerCase()) ||
      p.nombreGenerico.toLowerCase().includes(search.toLowerCase()) ||
      p.codigoInterno.toLowerCase().includes(search.toLowerCase()) ||
      p.codigoBarras.includes(search);
    const matchCategory = category === "Todos" || p.categoria === category;
    return matchSearch && matchCategory;
  });

  const isLowStock = (p: Product) => p.stock <= p.stockMinimo && p.stock > 0;
  const isExpiring = (p: Product) => {
    const diff = (new Date(p.fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 90 && diff > 0;
  };
  const isExpired = (p: Product) => new Date(p.fechaVencimiento) < new Date();

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Productos / Medicamentos</h1>
          <p className="page-description">{products.length} productos registrados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Producto</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Nombre Comercial</Label>
                <Input placeholder="Ej: Paracetamol 500mg" />
              </div>
              <div className="space-y-2">
                <Label>Nombre Genérico</Label>
                <Input placeholder="Ej: Acetaminofén" />
              </div>
              <div className="space-y-2">
                <Label>Código Interno</Label>
                <Input placeholder="MED-XXX" />
              </div>
              <div className="space-y-2">
                <Label>Código de Barras</Label>
                <Input placeholder="7501234567890" />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c !== "Todos").map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Laboratorio / Marca</Label>
                <Input placeholder="Ej: Bayer" />
              </div>
              <div className="space-y-2">
                <Label>Presentación</Label>
                <Input placeholder="Ej: Caja x 20 tabletas" />
              </div>
              <div className="space-y-2">
                <Label>Lote</Label>
                <Input placeholder="L2024-XX" />
              </div>
              <div className="space-y-2">
                <Label>Precio de Compra ($)</Label>
                <Input type="number" step="0.01" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Precio de Venta ($)</Label>
                <Input type="number" step="0.01" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Stock Actual</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Stock Mínimo</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Vencimiento</Label>
                <Input type="date" />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch id="receta" />
                <Label htmlFor="receta">Requiere Receta</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => { setDialogOpen(false); toast({ title: "Producto guardado" }); }}>Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, código o código de barras..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead className="hidden lg:table-cell">Laboratorio</TableHead>
                  <TableHead className="text-right">P. Venta</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="hidden md:table-cell">Vencimiento</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{p.nombreComercial}</p>
                        <p className="text-xs text-muted-foreground">{p.nombreGenerico} · {p.codigoInterno}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{p.categoria}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{p.laboratorio}</TableCell>
                    <TableCell className="text-right font-medium">${p.precioVenta.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-medium ${isLowStock(p) ? "text-warning" : p.stock === 0 ? "text-destructive" : ""}`}>
                          {p.stock}
                        </span>
                        {isLowStock(p) && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      <div className="flex items-center gap-1">
                        {p.fechaVencimiento}
                        {isExpired(p) && <Badge variant="destructive" className="text-[10px] ml-1">Vencido</Badge>}
                        {isExpiring(p) && <Clock className="h-3.5 w-3.5 text-warning" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.estado === "activo" ? "default" : "secondary"} className="text-[10px]">
                        {p.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Products;
