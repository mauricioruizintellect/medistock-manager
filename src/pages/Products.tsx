import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, GitBranch, Loader2, Package, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getBranches, type Branch, type BranchStatus } from "@/services/branches.service";
import {
  createBranchProduct,
  type CreateBranchProductPayload,
} from "@/services/branch-products.service";
import {
  createProductCategory,
  getProductCategories,
  type CreateProductCategoryPayload,
} from "@/services/product-categories.service";
import { getProducts, type ProductMaster } from "@/services/products.service";

interface CategoryFormState {
  name: string;
  description: string;
  status: BranchStatus;
}

interface BranchProductFormState {
  branch_id: string;
  sale_price: string;
  cost_price_default: string;
  min_stock: string;
  max_stock: string;
  reorder_point: string;
  current_stock: string;
  reserved_stock: string;
  shelf_location: string;
  is_sellable: boolean;
  is_visible_in_pos: boolean;
  status: BranchStatus;
}

const emptyCategoryForm: CategoryFormState = {
  name: "",
  description: "",
  status: "active",
};

const emptyBranchProductForm: BranchProductFormState = {
  branch_id: "",
  sale_price: "0",
  cost_price_default: "0",
  min_stock: "0",
  max_stock: "0",
  reorder_point: "0",
  current_stock: "0",
  reserved_stock: "0",
  shelf_location: "",
  is_sellable: true,
  is_visible_in_pos: true,
  status: "active",
};

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatMoneyRate = (value: ProductMaster["tax_rate"]) => {
  const rate = Number(value);
  return Number.isFinite(rate) ? rate.toFixed(2) : String(value);
};

const asBoolean = (value: boolean | number) => value === true || value === 1;

const parseNonNegativeNumber = (value: string, label: string) => {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} debe ser un número positivo o 0.`);
  }

  return parsed;
};

const Products = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pharmacyId = user?.pharmacy_id ?? null;
  const canUseProductFlow = pharmacyId !== null;

  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [selectedProductForBranch, setSelectedProductForBranch] = useState<ProductMaster | null>(null);
  const [branchProductForm, setBranchProductForm] = useState<BranchProductFormState>(emptyBranchProductForm);

  const categoriesQuery = useQuery({
    queryKey: ["product-categories", { pharmacyId }],
    queryFn: () => getProductCategories({ ...(pharmacyId !== null ? { pharmacy_id: pharmacyId } : {}) }),
    enabled: canUseProductFlow,
  });

  const productsQuery = useQuery({
    queryKey: ["products", { pharmacyId }],
    queryFn: () => getProducts({ ...(pharmacyId !== null ? { pharmacy_id: pharmacyId } : {}) }),
    enabled: canUseProductFlow,
  });

  const branchesQuery = useQuery({
    queryKey: ["branches", { pharmacyId, status: "active" }],
    queryFn: () =>
      getBranches({
        ...(pharmacyId !== null ? { pharmacy_id: pharmacyId } : {}),
        status: "active",
      }),
    enabled: canUseProductFlow,
  });

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();

    return (productsQuery.data?.items ?? []).filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        String(product.barcode ?? "").toLowerCase().includes(query) ||
        String(product.generic_name ?? "").toLowerCase().includes(query) ||
        String(product.brand ?? "").toLowerCase().includes(query);
      const matchesCategory = categoryFilter === "all" || String(product.category_id ?? "none") === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, productSearch, productsQuery.data?.items]);

  const createCategoryMutation = useMutation({
    mutationFn: (payload: CreateProductCategoryPayload) => createProductCategory(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      setCategoryForm(emptyCategoryForm);
      setIsCategoryDialogOpen(false);
      toast({
        title: "Categoría creada",
        description: "La categoría fue registrada correctamente.",
      });
    },
    onError: (mutationError) => {
      toast({
        title: "No se pudo crear",
        description: mutationError instanceof Error ? mutationError.message : "Ocurrió un error al crear la categoría.",
        variant: "destructive",
      });
    },
  });

  const createBranchProductMutation = useMutation({
    mutationFn: (payload: CreateBranchProductPayload) => createBranchProduct(payload),
    onSuccess: () => {
      setSelectedProductForBranch(null);
      setBranchProductForm(emptyBranchProductForm);
      toast({
        title: "Producto asignado",
        description: "El producto fue asignado a la sucursal correctamente.",
      });
    },
    onError: (mutationError) => {
      toast({
        title: "No se pudo asignar",
        description: mutationError instanceof Error ? mutationError.message : "Ocurrió un error al asignar el producto.",
        variant: "destructive",
      });
    },
  });

  const handleCategoryChange = (field: keyof CategoryFormState, value: string) => {
    setCategoryForm((current) => ({ ...current, [field]: value }));
  };

  const handleBranchProductChange = (field: keyof BranchProductFormState, value: string | boolean) => {
    setBranchProductForm((current) => ({ ...current, [field]: value }));
  };

  const openAssignProductToBranch = (product: ProductMaster) => {
    const firstBranch = branchesQuery.data?.items[0];
    setSelectedProductForBranch(product);
    setBranchProductForm({
      ...emptyBranchProductForm,
      branch_id: firstBranch ? String(firstBranch.id) : "",
    });
  };

  const handleCategorySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pharmacyId === null) {
      toast({
        title: "Pharmacy ID requerido",
        description: "El usuario autenticado no tiene una farmacia asignada.",
        variant: "destructive",
      });
      return;
    }

    createCategoryMutation.mutate({
      pharmacy_id: pharmacyId,
      name: categoryForm.name.trim(),
      ...(categoryForm.description.trim() ? { description: categoryForm.description.trim() } : {}),
      status: categoryForm.status,
    });
  };

  const handleBranchProductSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProductForBranch) {
      return;
    }

    const branchId = Number(branchProductForm.branch_id);

    if (!Number.isInteger(branchId) || branchId <= 0) {
      toast({
        title: "Sucursal requerida",
        description: "Selecciona una sucursal válida para asignar el producto.",
        variant: "destructive",
      });
      return;
    }

    try {
      createBranchProductMutation.mutate({
        branch_id: branchId,
        product_id: selectedProductForBranch.id,
        sale_price: parseNonNegativeNumber(branchProductForm.sale_price, "Precio de venta"),
        cost_price_default: parseNonNegativeNumber(branchProductForm.cost_price_default, "Costo por defecto"),
        min_stock: parseNonNegativeNumber(branchProductForm.min_stock, "Stock mínimo"),
        max_stock: parseNonNegativeNumber(branchProductForm.max_stock, "Stock máximo"),
        reorder_point: parseNonNegativeNumber(branchProductForm.reorder_point, "Punto de reorden"),
        current_stock: parseNonNegativeNumber(branchProductForm.current_stock, "Stock actual"),
        reserved_stock: parseNonNegativeNumber(branchProductForm.reserved_stock, "Stock reservado"),
        ...(branchProductForm.shelf_location.trim() ? { shelf_location: branchProductForm.shelf_location.trim() } : {}),
        is_sellable: branchProductForm.is_sellable,
        is_visible_in_pos: branchProductForm.is_visible_in_pos,
        status: branchProductForm.status,
      });
    } catch (validationError) {
      toast({
        title: "Valor inválido",
        description: validationError instanceof Error ? validationError.message : "Revisa los valores numéricos.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Productos / Medicamentos</h1>
          <p className="page-description">{productsQuery.data?.total ?? 0} productos registrados</p>
        </div>
      </div>

      {!canUseProductFlow ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            El usuario autenticado no tiene `pharmacy_id` asignado para gestionar productos.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="products" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="categories">Categorías</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Buscar por nombre, SKU, genérico, marca o código de barras"
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="lg:w-56">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      <SelectItem value="none">Sin categoría</SelectItem>
                      {(categoriesQuery.data?.items ?? []).map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button className="gap-2" onClick={() => navigate("/productos/nuevo")}>
                    <Plus className="h-4 w-4" />
                    Nuevo producto
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Productos maestros
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {productsQuery.isLoading ? (
                  <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando productos...
                  </div>
                ) : productsQuery.isError ? (
                  <div className="p-6 text-sm text-destructive">
                    {productsQuery.error instanceof Error ? productsQuery.error.message : "Ocurrió un error al consultar productos."}
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No hay productos registrados con los filtros actuales.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="hidden lg:table-cell">Presentación</TableHead>
                        <TableHead className="hidden xl:table-cell">Impuestos</TableHead>
                        <TableHead className="text-center">Flags</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="hidden lg:table-cell">Creado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.generic_name || "Sin genérico"} · {product.sku}
                              </p>
                              {product.barcode && <p className="text-xs text-muted-foreground">{product.barcode}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{product.category_name || "Sin categoría"}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <p className="text-sm">{product.presentation || "No disponible"}</p>
                            <p className="text-xs text-muted-foreground">
                              {[product.pharmaceutical_form, product.concentration].filter(Boolean).join(" · ") || "Sin detalle"}
                            </p>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-sm">{formatMoneyRate(product.tax_rate)}%</TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-wrap justify-center gap-1">
                              {asBoolean(product.requires_prescription) && (
                                <Badge variant="outline" className="text-[10px]">
                                  Receta
                                </Badge>
                              )}
                              {asBoolean(product.is_controlled_substance) && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Controlado
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={product.status === "active" ? "outline" : "secondary"}
                              className={product.status === "active" ? "badge-active text-[10px]" : "text-[10px]"}
                            >
                              {product.status === "active" ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {formatDate(product.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-2"
                              onClick={() => openAssignProductToBranch(product)}
                              disabled={branchesQuery.isLoading || (branchesQuery.data?.items.length ?? 0) === 0}
                            >
                              <GitBranch className="h-3.5 w-3.5" />
                              Asignar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Button className="gap-2" onClick={() => setIsCategoryDialogOpen(true)}>
                <FolderPlus className="h-4 w-4" />
                Nueva categoría
              </Button>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderPlus className="h-4 w-4 text-primary" />
                  Categorías
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {categoriesQuery.isLoading ? (
                  <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando categorías...
                  </div>
                ) : categoriesQuery.isError ? (
                  <div className="p-6 text-sm text-destructive">
                    {categoriesQuery.error instanceof Error ? categoriesQuery.error.message : "Ocurrió un error al consultar categorías."}
                  </div>
                ) : categoriesQuery.data?.items.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No hay categorías registradas.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="hidden lg:table-cell">Creada</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoriesQuery.data?.items.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{category.name}</p>
                            <p className="text-xs text-muted-foreground">ID {category.id}</p>
                          </TableCell>
                          <TableCell className="text-sm">{category.description || "Sin descripción"}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={category.status === "active" ? "outline" : "secondary"}
                              className={category.status === "active" ? "badge-active text-[10px]" : "text-[10px]"}
                            >
                              {category.status === "active" ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {formatDate(category.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nombre</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(event) => handleCategoryChange("name", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Descripción</Label>
              <Textarea
                id="category-description"
                value={categoryForm.description}
                onChange={(event) => handleCategoryChange("description", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={categoryForm.status} onValueChange={(value) => handleCategoryChange("status", value as BranchStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)} disabled={createCategoryMutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2" disabled={createCategoryMutation.isPending}>
                {createCategoryMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <FolderPlus className="h-4 w-4" />
                    Crear categoría
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedProductForBranch !== null} onOpenChange={(open) => !open && setSelectedProductForBranch(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asignar producto a sucursal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBranchProductSubmit} className="space-y-4">
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-sm font-medium">{selectedProductForBranch?.name}</p>
              <p className="text-xs text-muted-foreground">SKU {selectedProductForBranch?.sku}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Sucursal</Label>
                <Select
                  value={branchProductForm.branch_id}
                  onValueChange={(value) => handleBranchProductChange("branch_id", value)}
                  disabled={branchesQuery.isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {(branchesQuery.data?.items ?? []).map((branch: Branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch-product-sale-price">Precio de venta</Label>
                <Input
                  id="branch-product-sale-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={branchProductForm.sale_price}
                  onChange={(event) => handleBranchProductChange("sale_price", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-product-cost-price">Costo por defecto</Label>
                <Input
                  id="branch-product-cost-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={branchProductForm.cost_price_default}
                  onChange={(event) => handleBranchProductChange("cost_price_default", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-product-min-stock">Stock mínimo</Label>
                <Input
                  id="branch-product-min-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={branchProductForm.min_stock}
                  onChange={(event) => handleBranchProductChange("min_stock", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-product-max-stock">Stock máximo</Label>
                <Input
                  id="branch-product-max-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={branchProductForm.max_stock}
                  onChange={(event) => handleBranchProductChange("max_stock", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-product-reorder-point">Punto de reorden</Label>
                <Input
                  id="branch-product-reorder-point"
                  type="number"
                  min="0"
                  step="1"
                  value={branchProductForm.reorder_point}
                  onChange={(event) => handleBranchProductChange("reorder_point", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-product-current-stock">Stock actual</Label>
                <Input
                  id="branch-product-current-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={branchProductForm.current_stock}
                  onChange={(event) => handleBranchProductChange("current_stock", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-product-reserved-stock">Stock reservado</Label>
                <Input
                  id="branch-product-reserved-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={branchProductForm.reserved_stock}
                  onChange={(event) => handleBranchProductChange("reserved_stock", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-product-shelf">Ubicación en percha</Label>
                <Input
                  id="branch-product-shelf"
                  value={branchProductForm.shelf_location}
                  onChange={(event) => handleBranchProductChange("shelf_location", event.target.value)}
                  placeholder="A1-03"
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={branchProductForm.status}
                  onValueChange={(value) => handleBranchProductChange("status", value as BranchStatus)}
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
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="branch-product-sellable" className="font-medium">
                  Vendible
                </Label>
                <Switch
                  id="branch-product-sellable"
                  checked={branchProductForm.is_sellable}
                  onCheckedChange={(checked) => handleBranchProductChange("is_sellable", checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="branch-product-visible-pos" className="font-medium">
                  Visible en POS
                </Label>
                <Switch
                  id="branch-product-visible-pos"
                  checked={branchProductForm.is_visible_in_pos}
                  onCheckedChange={(checked) => handleBranchProductChange("is_visible_in_pos", checked)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedProductForBranch(null)}
                disabled={createBranchProductMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={createBranchProductMutation.isPending || (branchesQuery.data?.items.length ?? 0) === 0}
              >
                {createBranchProductMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Asignando...
                  </>
                ) : (
                  <>
                    <GitBranch className="h-4 w-4" />
                    Asignar a sucursal
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

export default Products;
