import { useEffect, useMemo, useState } from "react";
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
import { getErrorMessage } from "@/lib/api-errors";
import { getBranchProducts } from "@/services/branch-products.service";
import { getBranches } from "@/services/branches.service";
import {
  getInventoryMovements,
  getInventoryStock,
  type InventoryMovementItem,
  type InventoryMovementType,
  type InventoryStockItem,
} from "@/services/inventory.service";
import {
  receiveInventoryLots,
  type ReceiveInventoryLotPayload,
} from "@/services/inventory-lots.service";
import { getUserBranchRoles, type UserBranchRole } from "@/services/user-branch-roles.service";

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

interface InventoryBranchOption {
  id: number;
  name: string;
  is_default: boolean;
}

const MOVEMENT_TYPE_LABELS: Record<InventoryMovementType, string> = {
  purchase: "entrada",
  in: "entrada",
  sale: "venta",
  out: "salida",
  adjustment: "ajuste",
};

const dedupeAssignedBranches = (branches: UserBranchRole[]) => {
  const uniqueBranches = new Map<number, InventoryBranchOption>();

  for (const branch of branches) {
    const existing = uniqueBranches.get(branch.branch_id);

    if (!existing || (!existing.is_default && Boolean(branch.is_default))) {
      uniqueBranches.set(branch.branch_id, {
        id: branch.branch_id,
        name: branch.branch_name,
        is_default: Boolean(branch.is_default),
      });
    }
  }

  return Array.from(uniqueBranches.values());
};

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

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatStock = (value: string | number | null | undefined) => {
  const stock = toNumber(value);
  return Number.isInteger(stock) ? String(stock) : stock.toFixed(2);
};

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getStockStatus = (stockItem: InventoryStockItem) => {
  const currentStock = toNumber(stockItem.current_stock);
  const minStock = toNumber(stockItem.min_stock);

  if (currentStock <= 0) {
    return "out";
  }

  if (currentStock <= minStock) {
    return "low";
  }

  return "ok";
};

const getMovementVariant = (movementType: InventoryMovementType) => {
  if (movementType === "purchase" || movementType === "in") {
    return "default";
  }

  if (movementType === "sale" || movementType === "out") {
    return "secondary";
  }

  return "outline";
};

const Inventory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("all");
  const [selectedBranchProductId, setSelectedBranchProductId] = useState("all");
  const [selectedMovementType, setSelectedMovementType] = useState<InventoryMovementType | "all">("all");
  const [isReceiveLotDialogOpen, setIsReceiveLotDialogOpen] = useState(false);
  const [receiveLotForm, setReceiveLotForm] = useState<ReceiveLotFormState>(emptyReceiveLotForm);
  const [hasInitializedBranchSelection, setHasInitializedBranchSelection] = useState(false);
  const pharmacyId = user?.pharmacy_id ?? null;
  const isBranchAdmin = user?.role_code === "BRANCH_ADMIN";

  const branchesQuery = useQuery({
    queryKey: ["branches", { pharmacyId, status: "active" }],
    queryFn: () =>
      getBranches({
        ...(pharmacyId !== null ? { pharmacy_id: pharmacyId } : {}),
        status: "active",
      }),
    enabled: pharmacyId !== null && !isBranchAdmin,
  });

  const assignedBranchesQuery = useQuery({
    queryKey: ["user-branch-roles", "inventory"],
    queryFn: () => getUserBranchRoles({ status: "active" }),
    enabled: Boolean(user?.id) && isBranchAdmin,
  });

  const branchOptions = useMemo<InventoryBranchOption[]>(
    () =>
      isBranchAdmin
        ? dedupeAssignedBranches(assignedBranchesQuery.data?.items ?? [])
        : (branchesQuery.data?.items ?? []).map((branch) => ({
            id: branch.id,
            name: branch.name,
            is_default: user?.default_branch_id === branch.id,
          })),
    [assignedBranchesQuery.data?.items, branchesQuery.data?.items, isBranchAdmin, user?.default_branch_id],
  );

  useEffect(() => {
    if (hasInitializedBranchSelection || branchOptions.length === 0) {
      return;
    }

    const defaultBranch =
      branchOptions.find((branch) => branch.id === user?.default_branch_id) ||
      branchOptions.find((branch) => branch.is_default) ||
      branchOptions[0];

    if (defaultBranch) {
      setSelectedBranchId(String(defaultBranch.id));
    }

    setHasInitializedBranchSelection(true);
  }, [branchOptions, hasInitializedBranchSelection, user?.default_branch_id]);

  useEffect(() => {
    if (!isReceiveLotDialogOpen || receiveLotForm.branch_id || selectedBranchId === "all") {
      return;
    }

    setReceiveLotForm((current) => ({
      ...current,
      branch_id: selectedBranchId,
    }));
  }, [isReceiveLotDialogOpen, receiveLotForm.branch_id, selectedBranchId]);

  const selectedInventoryBranchId = selectedBranchId !== "all" ? Number(selectedBranchId) : null;
  const canQueryInventory = pharmacyId !== null && (!isBranchAdmin || selectedInventoryBranchId !== null);

  const inventoryStockQuery = useQuery({
    queryKey: [
      "inventory-stock",
      {
        pharmacyId,
        branchId: selectedBranchId,
        branchProductId: selectedBranchProductId,
      },
    ],
    queryFn: () =>
      getInventoryStock({
        ...(pharmacyId !== null ? { pharmacy_id: pharmacyId } : {}),
        ...(selectedInventoryBranchId !== null ? { branch_id: selectedInventoryBranchId } : {}),
        ...(selectedBranchProductId !== "all" ? { branch_product_id: Number(selectedBranchProductId) } : {}),
      }),
    enabled: canQueryInventory,
  });

  const inventoryMovementsQuery = useQuery({
    queryKey: [
      "inventory-movements",
      {
        pharmacyId,
        branchId: selectedBranchId,
        branchProductId: selectedBranchProductId,
        movementType: selectedMovementType,
      },
    ],
    queryFn: () =>
      getInventoryMovements({
        ...(pharmacyId !== null ? { pharmacy_id: pharmacyId } : {}),
        ...(selectedInventoryBranchId !== null ? { branch_id: selectedInventoryBranchId } : {}),
        ...(selectedBranchProductId !== "all" ? { branch_product_id: Number(selectedBranchProductId) } : {}),
        ...(selectedMovementType !== "all" ? { movement_type: selectedMovementType } : {}),
      }),
    enabled: canQueryInventory,
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
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
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

  const isBranchesLoading = isBranchAdmin ? assignedBranchesQuery.isLoading : branchesQuery.isLoading;
  const branchesError = isBranchAdmin ? assignedBranchesQuery.error : branchesQuery.error;
  const branchPermissionMessage = getErrorMessage(
    branchesError,
    "No se pudieron obtener las sucursales.",
    { 403: "No tienes permisos para consultar sucursales fuera de tus asignaciones." },
  );
  const inventoryStockErrorMessage = getErrorMessage(
    inventoryStockQuery.error,
    "Ocurrió un error al consultar existencias.",
    { 403: "No tienes permisos para consultar inventario fuera de tus sucursales asignadas." },
  );
  const inventoryMovementsErrorMessage = getErrorMessage(
    inventoryMovementsQuery.error,
    "Ocurrió un error al consultar movimientos.",
    { 403: "No tienes permisos para consultar movimientos fuera de tus sucursales asignadas." },
  );

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
  const stockItems = inventoryStockQuery.data?.items ?? [];
  const movementsItems = inventoryMovementsQuery.data?.items ?? [];
  const normalizedSearch = search.trim().toLowerCase();
  const filteredStockItems = normalizedSearch
    ? stockItems.filter((item) =>
        [item.product_name, item.sku, item.branch_name, item.nearest_lot_number]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
      )
    : stockItems;
  const filteredMovementsItems = normalizedSearch
    ? movementsItems.filter((item) =>
        [item.product_name, item.notes, item.user_name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
      )
    : movementsItems;
  const totalUnits = stockItems.reduce((total, item) => total + toNumber(item.current_stock), 0);
  const lowStockCount = stockItems.filter((item) => getStockStatus(item) === "low").length;
  const outOfStockCount = stockItems.filter((item) => getStockStatus(item) === "out").length;

  const handleStockBranchChange = (value: string) => {
    setSelectedBranchId(value);
    setSelectedBranchProductId("all");
  };

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
            disabled={pharmacyId === null || isBranchesLoading || branchOptions.length === 0}
          >
            <ArrowUpCircle className="h-4 w-4" />
            Entrada
          </Button>
          <Button variant="outline" className="gap-2"><RotateCcw className="h-4 w-4" />Ajuste</Button>
        </div>
      </div>

      {branchesError ? (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">{branchPermissionMessage}</CardContent>
        </Card>
      ) : null}

      {!isBranchesLoading && isBranchAdmin && branchOptions.length === 0 ? (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm text-muted-foreground">
            El usuario no tiene sucursales activas asignadas para consultar inventario.
          </CardContent>
        </Card>
      ) : null}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-2xl font-bold">{formatStock(totalUnits)}</p>
          <p className="text-xs text-muted-foreground">Stock Total</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold">{stockItems.length}</p>
          <p className="text-xs text-muted-foreground">Productos con Stock</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-warning">{lowStockCount}</p>
          <p className="text-xs text-muted-foreground">Stock Bajo</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-destructive">{outOfStockCount}</p>
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
                <Select value={selectedBranchId} onValueChange={handleStockBranchChange} disabled={isBranchesLoading}>
                  <SelectTrigger className="sm:w-56">
                    <SelectValue placeholder={isBranchAdmin ? "Selecciona sucursal" : "Todas las sucursales"} />
                  </SelectTrigger>
                  <SelectContent>
                    {!isBranchAdmin ? <SelectItem value="all">Todas las sucursales</SelectItem> : null}
                    {branchOptions.map((branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedBranchProductId} onValueChange={setSelectedBranchProductId}>
                  <SelectTrigger className="sm:w-60">
                    <SelectValue placeholder="Todos los productos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los productos</SelectItem>
                    {stockItems.map((item) => (
                      <SelectItem key={item.branch_product_id} value={String(item.branch_product_id)}>
                        {item.product_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Stock Total</TableHead>
                    <TableHead className="text-center">Mínimo</TableHead>
                    <TableHead className="hidden md:table-cell">Lote</TableHead>
                    <TableHead className="hidden md:table-cell">Vencimiento</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryStockQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Cargando existencias...
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : inventoryStockQuery.isError ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sm text-destructive">
                        {inventoryStockErrorMessage}
                      </TableCell>
                    </TableRow>
                  ) : filteredStockItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                        No hay existencias para los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStockItems.map((item) => {
                      const stockStatus = getStockStatus(item);

                      return (
                        <TableRow key={item.branch_product_id}>
                          <TableCell>
                            <p className="font-medium text-sm">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {[item.sku, item.branch_name].filter(Boolean).join(" · ") || "Sin referencia"}
                            </p>
                          </TableCell>
                          <TableCell className="text-center font-medium">{formatStock(item.current_stock)}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{formatStock(item.min_stock)}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {item.nearest_lot_number || "Sin lote"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {item.nearest_expiration_date || "Sin vencimiento"}
                          </TableCell>
                          <TableCell className="text-center">
                            {stockStatus === "out" ? (
                              <Badge variant="destructive" className="text-[10px]">Sin stock</Badge>
                            ) : stockStatus === "low" ? (
                              <Badge className="badge-low-stock text-[10px]">Bajo</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={selectedMovementType} onValueChange={(value) => setSelectedMovementType(value as InventoryMovementType | "all")}>
                  <SelectTrigger className="sm:w-56">
                    <SelectValue placeholder="Todos los movimientos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los movimientos</SelectItem>
                    <SelectItem value="purchase">Entrada por compra</SelectItem>
                    <SelectItem value="sale">Venta</SelectItem>
                    <SelectItem value="out">Salida</SelectItem>
                    <SelectItem value="adjustment">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
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
                  {inventoryMovementsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Cargando movimientos...
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : inventoryMovementsQuery.isError ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sm text-destructive">
                        {inventoryMovementsErrorMessage}
                      </TableCell>
                    </TableRow>
                  ) : filteredMovementsItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                        No hay movimientos para los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMovementsItems.map((movement: InventoryMovementItem) => (
                      <TableRow key={movement.inventory_movement_id}>
                        <TableCell className="text-sm">{formatDateTime(movement.created_at)}</TableCell>
                        <TableCell className="text-sm font-medium">{movement.product_name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getMovementVariant(movement.movement_type)} className="text-[10px] capitalize">
                            {MOVEMENT_TYPE_LABELS[movement.movement_type] ?? movement.movement_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {movement.movement_type === "purchase" || movement.movement_type === "in" ? "+" : ""}
                          {formatStock(movement.quantity)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {movement.notes || "Sin motivo"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {movement.user_name || "Sin usuario"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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
                  disabled={isBranchesLoading || isSavingReceiveLot}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {branchOptions.map((branch) => (
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
                  isBranchesLoading ||
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
