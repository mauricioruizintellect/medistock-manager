import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpCircle, Loader2, Package, RotateCcw, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { products } from "@/lib/mock-data";
import { getBranchProducts } from "@/services/branch-products.service";
import { getBranches } from "@/services/branches.service";
import {
  receiveInventoryLots,
  type ReceiveInventoryLotPayload,
} from "@/services/inventory-lots.service";

const movements = [
  { id: "M001", fecha: "2026-03-25 08:00", producto: "Paracetamol 500mg", tipo: "entrada", cantidad: 50, motivo: "Compra proveedor", usuario: "Admin" },
  { id: "M002", fecha: "2026-03-25 09:15", producto: "Metformina 850mg", tipo: "salida", cantidad: 2, motivo: "Venta V001", usuario: "Ana Vendedor" },
  { id: "M003", fecha: "2026-03-25 10:30", producto: "Paracetamol 500mg", tipo: "salida", cantidad: 1, motivo: "Venta V002", usuario: "Ana Vendedor" },
  { id: "M004", fecha: "2026-03-24 14:00", producto: "Ibuprofeno 400mg", tipo: "ajuste", cantidad: -2, motivo: "Ajuste por daño", usuario: "Admin" },
  { id: "M005", fecha: "2026-03-24 16:00", producto: "Vitamina C 1000mg", tipo: "entrada", cantidad: 100, motivo: "Compra proveedor", usuario: "Admin" },
];

interface ReceiveLotFormState {
  branch_id: string;
  branch_product_id: string;
  lot_number: string;
  expiration_date: string;
  purchase_price: string;
  quantity: string;
  received_at: string;
  supplier_name: string;
  invoice_reference: string;
  notes: string;
  status: "active" | "inactive";
}

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const emptyReceiveLotForm = (): ReceiveLotFormState => ({
  branch_id: "",
  branch_product_id: "",
  lot_number: "",
  expiration_date: "",
  purchase_price: "0",
  quantity: "1",
  received_at: formatDateInputValue(new Date()),
  supplier_name: "",
  invoice_reference: "",
  notes: "",
  status: "active",
});

const parseNonNegativeNumber = (value: string, label: string) => {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} debe ser un número positivo o 0.`);
  }

  return parsed;
};

const parsePositiveNumber = (value: string, label: string) => {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} debe ser mayor que 0.`);
  }

  return parsed;
};

const isFutureDate = (dateValue: string) => {
  const expirationDate = new Date(`${dateValue}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Number.isFinite(expirationDate.getTime()) && expirationDate > today;
};

const Inventory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isReceiveLotDialogOpen, setIsReceiveLotDialogOpen] = useState(false);
  const [receiveLotForm, setReceiveLotForm] = useState<ReceiveLotFormState>(emptyReceiveLotForm);
  const pharmacyId = user?.pharmacy_id ?? null;

  const filteredProducts = products.filter(p =>
    p.nombreComercial.toLowerCase().includes(search.toLowerCase()) ||
    p.codigoInterno.toLowerCase().includes(search.toLowerCase())
  );

  const branchesQuery = useQuery({
    queryKey: ["branches", { pharmacyId, status: "active" }],
    queryFn: () =>
      getBranches({
        ...(pharmacyId !== null ? { pharmacy_id: pharmacyId } : {}),
        status: "active",
      }),
    enabled: pharmacyId !== null,
  });

  const branchProductsQuery = useQuery({
    queryKey: ["branch-products", { branchId: receiveLotForm.branch_id }],
    queryFn: () => getBranchProducts({ branch_id: Number(receiveLotForm.branch_id) }),
    enabled: Number(receiveLotForm.branch_id) > 0,
  });

  const receiveLotMutation = useMutation({
    mutationFn: (payload: ReceiveInventoryLotPayload) => receiveInventoryLots(payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["branch-products", { branchId: receiveLotForm.branch_id }] });
      setReceiveLotForm(emptyReceiveLotForm());
      setIsReceiveLotDialogOpen(false);
      toast({
        title: "Lote ingresado",
        description: `${response.total_processed} lote(s) ingresado(s) correctamente.`,
      });
    },
    onError: (mutationError) => {
      toast({
        title: "No se pudo ingresar el lote",
        description: mutationError instanceof Error ? mutationError.message : "Ocurrió un error al ingresar el lote.",
        variant: "destructive",
      });
    },
  });

  const handleReceiveLotChange = (field: keyof ReceiveLotFormState, value: string) => {
    setReceiveLotForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "branch_id" ? { branch_product_id: "" } : {}),
    }));
  };

  const buildReceiveLotPayload = (): ReceiveInventoryLotPayload => {
    const branchProductId = Number(receiveLotForm.branch_product_id);

    if (!Number.isInteger(branchProductId) || branchProductId <= 0) {
      throw new Error("Selecciona un producto asignado a la sucursal.");
    }

    const lotNumber = receiveLotForm.lot_number.trim();

    if (!lotNumber) {
      throw new Error("Ingresa el número de lote.");
    }

    if (!isFutureDate(receiveLotForm.expiration_date)) {
      throw new Error("La fecha de vencimiento debe ser futura.");
    }

    return {
      branch_product_id: branchProductId,
      lot_number: lotNumber,
      expiration_date: receiveLotForm.expiration_date,
      purchase_price: parseNonNegativeNumber(receiveLotForm.purchase_price, "Precio de compra"),
      quantity: parsePositiveNumber(receiveLotForm.quantity, "Cantidad"),
      received_at: receiveLotForm.received_at || formatDateInputValue(new Date()),
      ...(receiveLotForm.supplier_name.trim() ? { supplier_name: receiveLotForm.supplier_name.trim() } : {}),
      ...(receiveLotForm.invoice_reference.trim() ? { invoice_reference: receiveLotForm.invoice_reference.trim() } : {}),
      ...(receiveLotForm.notes.trim() ? { notes: receiveLotForm.notes.trim() } : {}),
      status: receiveLotForm.status,
    };
  };

  const handleReceiveLotSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      receiveLotMutation.mutate(buildReceiveLotPayload());
    } catch (validationError) {
      toast({
        title: "Valor inválido",
        description: validationError instanceof Error ? validationError.message : "Revisa los datos del lote.",
        variant: "destructive",
      });
    }
  };

  const isSavingReceiveLot = receiveLotMutation.isPending;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-description">Control de existencias y movimientos</p>
        </div>
        <div className="flex gap-2">
          <Button
            className="gap-2"
            onClick={() => setIsReceiveLotDialogOpen(true)}
            disabled={pharmacyId === null || branchesQuery.isLoading}
          >
            <ArrowUpCircle className="h-4 w-4" />
            Entrada
          </Button>
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

      <Dialog
        open={isReceiveLotDialogOpen}
        onOpenChange={(open) => {
          setIsReceiveLotDialogOpen(open);

          if (!open && !isSavingReceiveLot) {
            setReceiveLotForm(emptyReceiveLotForm());
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ingresar nuevo lote</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReceiveLotSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sucursal</Label>
                <Select
                  value={receiveLotForm.branch_id}
                  onValueChange={(value) => handleReceiveLotChange("branch_id", value)}
                  disabled={branchesQuery.isLoading || isSavingReceiveLot}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {(branchesQuery.data?.items ?? []).map((branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Producto asignado</Label>
                <Select
                  value={receiveLotForm.branch_product_id}
                  onValueChange={(value) => handleReceiveLotChange("branch_product_id", value)}
                  disabled={
                    !receiveLotForm.branch_id ||
                    branchProductsQuery.isLoading ||
                    isSavingReceiveLot ||
                    (branchProductsQuery.data?.items.length ?? 0) === 0
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        receiveLotForm.branch_id ? "Selecciona un producto" : "Selecciona sucursal primero"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(branchProductsQuery.data?.items ?? []).map((branchProduct) => (
                      <SelectItem key={branchProduct.id} value={String(branchProduct.id)}>
                        {branchProduct.product_name || branchProduct.sku || `Producto ${branchProduct.product_id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receive-lot-number">Número de lote</Label>
                <Input
                  id="receive-lot-number"
                  value={receiveLotForm.lot_number}
                  onChange={(event) => handleReceiveLotChange("lot_number", event.target.value)}
                  placeholder="LOT-2027-002"
                  disabled={isSavingReceiveLot}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receive-expiration-date">Fecha de vencimiento</Label>
                <Input
                  id="receive-expiration-date"
                  type="date"
                  value={receiveLotForm.expiration_date}
                  onChange={(event) => handleReceiveLotChange("expiration_date", event.target.value)}
                  disabled={isSavingReceiveLot}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receive-purchase-price">Precio de compra</Label>
                <Input
                  id="receive-purchase-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={receiveLotForm.purchase_price}
                  onChange={(event) => handleReceiveLotChange("purchase_price", event.target.value)}
                  disabled={isSavingReceiveLot}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receive-quantity">Cantidad</Label>
                <Input
                  id="receive-quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={receiveLotForm.quantity}
                  onChange={(event) => handleReceiveLotChange("quantity", event.target.value)}
                  disabled={isSavingReceiveLot}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receive-received-at">Fecha de recepción</Label>
                <Input
                  id="receive-received-at"
                  type="date"
                  value={receiveLotForm.received_at}
                  onChange={(event) => handleReceiveLotChange("received_at", event.target.value)}
                  disabled={isSavingReceiveLot}
                />
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={receiveLotForm.status}
                  onValueChange={(value) => handleReceiveLotChange("status", value)}
                  disabled={isSavingReceiveLot}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receive-supplier">Proveedor</Label>
                <Input
                  id="receive-supplier"
                  value={receiveLotForm.supplier_name}
                  onChange={(event) => handleReceiveLotChange("supplier_name", event.target.value)}
                  placeholder="Distribuidora Salud"
                  disabled={isSavingReceiveLot}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receive-invoice">Factura</Label>
                <Input
                  id="receive-invoice"
                  value={receiveLotForm.invoice_reference}
                  onChange={(event) => handleReceiveLotChange("invoice_reference", event.target.value)}
                  placeholder="FAC-001-001-000456"
                  disabled={isSavingReceiveLot}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="receive-notes">Notas</Label>
                <Textarea
                  id="receive-notes"
                  value={receiveLotForm.notes}
                  onChange={(event) => handleReceiveLotChange("notes", event.target.value)}
                  placeholder="Compra regular de inventario"
                  disabled={isSavingReceiveLot}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReceiveLotDialogOpen(false)}
                disabled={isSavingReceiveLot}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={
                  isSavingReceiveLot ||
                  branchesQuery.isLoading ||
                  !receiveLotForm.branch_id ||
                  (branchProductsQuery.data?.items.length ?? 0) === 0
                }
              >
                {isSavingReceiveLot ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4" />
                    Ingresar lote
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
