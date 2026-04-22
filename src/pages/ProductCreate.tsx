import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, GitBranch, Loader2, Package } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getBranches, type Branch, type BranchStatus } from "@/services/branches.service";
import { createBranchProduct, type CreateBranchProductPayload } from "@/services/branch-products.service";
import { getProductCategories } from "@/services/product-categories.service";
import {
  createProduct,
  getProductById,
  updateProduct,
  type CreateProductPayload,
  type ProductMaster,
  type UpdateProductPayload,
} from "@/services/products.service";

interface ProductFormState {
  category_id: string;
  sku: string;
  barcode: string;
  name: string;
  generic_name: string;
  description: string;
  brand: string;
  pharmaceutical_form: string;
  presentation: string;
  concentration: string;
  unit_of_measure: string;
  requires_prescription: boolean;
  is_controlled_substance: boolean;
  tax_rate: string;
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

const emptyProductForm: ProductFormState = {
  category_id: "none",
  sku: "",
  barcode: "",
  name: "",
  generic_name: "",
  description: "",
  brand: "",
  pharmaceutical_form: "",
  presentation: "",
  concentration: "",
  unit_of_measure: "unidad",
  requires_prescription: false,
  is_controlled_substance: false,
  tax_rate: "0",
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

const asBoolean = (value: boolean | number) => value === true || value === 1;

const productToForm = (product: ProductMaster): ProductFormState => ({
  category_id: product.category_id ? String(product.category_id) : "none",
  sku: product.sku,
  barcode: product.barcode ?? "",
  name: product.name,
  generic_name: product.generic_name ?? "",
  description: product.description ?? "",
  brand: product.brand ?? "",
  pharmaceutical_form: product.pharmaceutical_form ?? "",
  presentation: product.presentation ?? "",
  concentration: product.concentration ?? "",
  unit_of_measure: product.unit_of_measure ?? "unidad",
  requires_prescription: asBoolean(product.requires_prescription),
  is_controlled_substance: asBoolean(product.is_controlled_substance),
  tax_rate: String(product.tax_rate ?? "0"),
  status: product.status,
});

const parseNonNegativeNumber = (value: string, label: string) => {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} debe ser un número positivo o 0.`);
  }

  return parsed;
};

const ProductCreate = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { productId } = useParams();
  const queryClient = useQueryClient();
  const pharmacyId = user?.pharmacy_id ?? null;
  const parsedProductId = productId ? Number(productId) : null;
  const isEditMode = Number.isInteger(parsedProductId) && Number(parsedProductId) > 0;
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [branchProductForm, setBranchProductForm] = useState<BranchProductFormState>(emptyBranchProductForm);

  const categoriesQuery = useQuery({
    queryKey: ["product-categories", { pharmacyId }],
    queryFn: () => getProductCategories({ ...(pharmacyId !== null ? { pharmacy_id: pharmacyId } : {}) }),
    enabled: pharmacyId !== null,
  });

  const productQuery = useQuery({
    queryKey: ["products", parsedProductId],
    queryFn: () => getProductById(parsedProductId as number),
    enabled: isEditMode,
  });

  const branchesQuery = useQuery({
    queryKey: ["branches", { pharmacyId, status: "active" }],
    queryFn: () =>
      getBranches({
        ...(pharmacyId !== null ? { pharmacy_id: pharmacyId } : {}),
        status: "active",
      }),
    enabled: pharmacyId !== null,
  });

  useEffect(() => {
    if (!productQuery.data) {
      return;
    }

    setProductForm(productToForm(productQuery.data));
  }, [productQuery.data]);

  const createProductMutation = useMutation({
    mutationFn: (payload: CreateProductPayload) => createProduct(payload),
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Producto creado",
        description: "El producto maestro fue registrado correctamente.",
      });
      navigate(`/productos/${product.id}`);
    },
    onError: (mutationError) => {
      toast({
        title: "No se pudo crear",
        description: mutationError instanceof Error ? mutationError.message : "Ocurrió un error al crear el producto.",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ productId: currentProductId, payload }: { productId: number; payload: UpdateProductPayload }) =>
      updateProduct(currentProductId, payload),
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["products", product.id] });
      setProductForm(productToForm(product));
      toast({
        title: "Producto actualizado",
        description: "Los cambios fueron guardados correctamente.",
      });
    },
    onError: (mutationError) => {
      toast({
        title: "No se pudo actualizar",
        description: mutationError instanceof Error ? mutationError.message : "Ocurrió un error al actualizar el producto.",
        variant: "destructive",
      });
    },
  });

  const createBranchProductMutation = useMutation({
    mutationFn: (payload: CreateBranchProductPayload) => createBranchProduct(payload),
    onSuccess: () => {
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

  const handleProductChange = (field: keyof ProductFormState, value: string | boolean) => {
    setProductForm((current) => ({ ...current, [field]: value }));
  };

  const handleBranchProductChange = (field: keyof BranchProductFormState, value: string | boolean) => {
    setBranchProductForm((current) => ({ ...current, [field]: value }));
  };

  const buildProductPayload = () => {
    const taxRate = Number(productForm.tax_rate || 0);

    if (!Number.isFinite(taxRate) || taxRate < 0) {
      throw new Error("La tasa de impuesto debe ser un número positivo o 0.");
    }

    return {
      pharmacy_id: pharmacyId as number,
      ...(productForm.category_id !== "none" ? { category_id: Number(productForm.category_id) } : {}),
      sku: productForm.sku.trim(),
      name: productForm.name.trim(),
      ...(productForm.barcode.trim() ? { barcode: productForm.barcode.trim() } : {}),
      ...(productForm.generic_name.trim() ? { generic_name: productForm.generic_name.trim() } : {}),
      ...(productForm.description.trim() ? { description: productForm.description.trim() } : {}),
      ...(productForm.brand.trim() ? { brand: productForm.brand.trim() } : {}),
      ...(productForm.pharmaceutical_form.trim() ? { pharmaceutical_form: productForm.pharmaceutical_form.trim() } : {}),
      ...(productForm.presentation.trim() ? { presentation: productForm.presentation.trim() } : {}),
      ...(productForm.concentration.trim() ? { concentration: productForm.concentration.trim() } : {}),
      ...(productForm.unit_of_measure.trim() ? { unit_of_measure: productForm.unit_of_measure.trim() } : {}),
      requires_prescription: productForm.requires_prescription,
      is_controlled_substance: productForm.is_controlled_substance,
      tax_rate: taxRate,
      status: productForm.status,
    };
  };

  const handleProductSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pharmacyId === null) {
      toast({
        title: "Pharmacy ID requerido",
        description: "El usuario autenticado no tiene una farmacia asignada.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = buildProductPayload();

      if (isEditMode) {
        updateProductMutation.mutate({
          productId: parsedProductId as number,
          payload,
        });
        return;
      }

      createProductMutation.mutate(payload);
    } catch (validationError) {
      toast({
        title: "Valor inválido",
        description: validationError instanceof Error ? validationError.message : "Revisa los datos del producto.",
        variant: "destructive",
      });
    }
  };

  const handleBranchProductSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isEditMode) {
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
        product_id: parsedProductId as number,
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

  const isSavingProduct = createProductMutation.isPending || updateProductMutation.isPending;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">{isEditMode ? "Editar producto maestro" : "Nuevo producto maestro"}</h1>
          <p className="page-description">
            {isEditMode ? "Actualiza la ficha base y administra su disponibilidad por sucursal." : "Registra la ficha base antes de asignarla a una sucursal."}
          </p>
        </div>
        <Button variant="outline" className="gap-2 self-start" onClick={() => navigate("/productos")}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      {pharmacyId === null ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            El usuario autenticado no tiene `pharmacy_id` asignado para crear productos.
          </CardContent>
        </Card>
      ) : productQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando producto...
          </CardContent>
        </Card>
      ) : productQuery.isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            {productQuery.error instanceof Error ? productQuery.error.message : "Ocurrió un error al consultar el producto."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleProductSubmit} className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Identificación
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-name">Nombre</Label>
                <Input
                  id="product-name"
                  value={productForm.name}
                  onChange={(event) => handleProductChange("name", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-sku">SKU</Label>
                <Input
                  id="product-sku"
                  value={productForm.sku}
                  onChange={(event) => handleProductChange("sku", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={productForm.category_id} onValueChange={(value) => handleProductChange("category_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {(categoriesQuery.data?.items ?? []).map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-barcode">Código de barras</Label>
                <Input
                  id="product-barcode"
                  value={productForm.barcode}
                  onChange={(event) => handleProductChange("barcode", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-generic-name">Nombre genérico</Label>
                <Input
                  id="product-generic-name"
                  value={productForm.generic_name}
                  onChange={(event) => handleProductChange("generic_name", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-brand">Marca</Label>
                <Input
                  id="product-brand"
                  value={productForm.brand}
                  onChange={(event) => handleProductChange("brand", event.target.value)}
                />
              </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Presentación clínica</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-form">Forma farmacéutica</Label>
                <Input
                  id="product-form"
                  value={productForm.pharmaceutical_form}
                  onChange={(event) => handleProductChange("pharmaceutical_form", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-concentration">Concentración</Label>
                <Input
                  id="product-concentration"
                  value={productForm.concentration}
                  onChange={(event) => handleProductChange("concentration", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-presentation">Presentación</Label>
                <Input
                  id="product-presentation"
                  value={productForm.presentation}
                  onChange={(event) => handleProductChange("presentation", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-unit">Unidad de medida</Label>
                <Input
                  id="product-unit"
                  value={productForm.unit_of_measure}
                  onChange={(event) => handleProductChange("unit_of_measure", event.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="product-description">Descripción</Label>
                <Textarea
                  id="product-description"
                  value={productForm.description}
                  onChange={(event) => handleProductChange("description", event.target.value)}
                />
              </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Reglas comerciales</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-tax">Tasa de impuesto</Label>
                <Input
                  id="product-tax"
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.tax_rate}
                  onChange={(event) => handleProductChange("tax_rate", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={productForm.status} onValueChange={(value) => handleProductChange("status", value as BranchStatus)}>
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
                <Label htmlFor="requires-prescription" className="font-medium">
                  Requiere receta
                </Label>
                <Switch
                  id="requires-prescription"
                  checked={productForm.requires_prescription}
                  onCheckedChange={(checked) => handleProductChange("requires_prescription", checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="controlled-substance" className="font-medium">
                  Sustancia controlada
                </Label>
                <Switch
                  id="controlled-substance"
                  checked={productForm.is_controlled_substance}
                  onCheckedChange={(checked) => handleProductChange("is_controlled_substance", checked)}
                />
              </div>
              </CardContent>
            </Card>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => navigate("/productos")} disabled={isSavingProduct}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2" disabled={isSavingProduct}>
                {isSavingProduct ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4" />
                    {isEditMode ? "Guardar cambios" : "Crear producto"}
                  </>
                )}
              </Button>
            </div>
          </form>

          {isEditMode && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Asignar a sucursal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBranchProductSubmit} className="space-y-4">
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
                  <div className="flex justify-end">
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
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductCreate;
