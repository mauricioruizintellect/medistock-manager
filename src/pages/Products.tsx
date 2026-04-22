import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, FolderPlus, Loader2, Package, Plus, Search } from "lucide-react";
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
import type { BranchStatus } from "@/services/branches.service";
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

const emptyCategoryForm: CategoryFormState = {
  name: "",
  description: "",
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

  const handleCategoryChange = (field: keyof CategoryFormState, value: string) => {
    setCategoryForm((current) => ({ ...current, [field]: value }));
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
                              onClick={() => navigate(`/productos/${product.id}`)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              Editar
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

    </div>
  );
};

export default Products;
