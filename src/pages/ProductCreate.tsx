import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit2, GitBranch, Loader2, Package, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getBranches, type Branch, type BranchStatus } from "@/services/branches.service";
import {
  createBranchProduct,
  getBranchProducts,
  updateBranchProduct,
  type BranchProduct,
  type CreateBranchProductPayload,
  type UpdateBranchProductPayload,
} from "@/services/branch-products.service";
import { getProductCategories } from "@/services/product-categories.service";
import {
  createInitialInventoryLot,
  type InitialInventoryLotPayload,
} from "@/services/inventory-lots.service";
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
  shelf_location: string;
  is_sellable: boolean;
  is_visible_in_pos: boolean;
  status: BranchStatus;
}

interface InitialInventoryLotFormState {
  lot_number: string;
  expiration_date: string;
  purchase_price: string;
  initial_quantity: string;
  received_at: string;
  supplier_name: string;
  invoice_reference: string;
  status: BranchStatus;
}

type BranchProductFormMode = "create" | "edit";

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
  shelf_location: "",
  is_sellable: true,
  is_visible_in_pos: true,
  status: "active",
};

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const emptyInitialInventoryLotForm = (): InitialInventoryLotFormState => ({
  lot_number: "",
  expiration_date: "",
  purchase_price: "0",
  initial_quantity: "1",
  received_at: formatDateInputValue(new Date()),
  supplier_name: "",
  invoice_reference: "",
  status: "active",
});

const asBoolean = (value: boolean | number) => value === true || value === 1;

const formatCurrency = (value: BranchProduct["sale_price"]) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return String(value);
  }

  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatStock = (value: BranchProduct["current_stock"]) => {
  const stock = Number(value ?? 0);
  return Number.isFinite(stock) ? stock.toFixed(2) : String(value);
};

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

const branchProductToForm = (branchProduct: BranchProduct): BranchProductFormState => ({
  branch_id: String(branchProduct.branch_id),
  sale_price: String(branchProduct.sale_price ?? "0"),
  cost_price_default: String(branchProduct.cost_price_default ?? "0"),
  min_stock: String(branchProduct.min_stock ?? "0"),
  max_stock: String(branchProduct.max_stock ?? "0"),
  reorder_point: String(branchProduct.reorder_point ?? "0"),
  shelf_location: branchProduct.shelf_location ?? "",
  is_sellable: asBoolean(branchProduct.is_sellable),
  is_visible_in_pos: asBoolean(branchProduct.is_visible_in_pos),
  status: branchProduct.status,
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
  const [branchProductFormMode, setBranchProductFormMode] = useState<BranchProductFormMode>("create");
  const [selectedBranchProductId, setSelectedBranchProductId] = useState<number | null>(null);
  const [isBranchProductDialogOpen, setIsBranchProductDialogOpen] = useState(false);
  const [initialInventoryLotForm, setInitialInventoryLotForm] = useState<InitialInventoryLotFormState>(
    emptyInitialInventoryLotForm,
  );
  const [pendingInitialLoadBranchProduct, setPendingInitialLoadBranchProduct] = useState<BranchProduct | null>(null);

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

  const branchProductsQuery = useQuery({
    queryKey: ["branch-products", { productId: parsedProductId }],
    queryFn: () => getBranchProducts({ product_id: parsedProductId as number }),
    enabled: isEditMode,
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
    onSuccess: async (branchProduct) => {
      await queryClient.invalidateQueries({ queryKey: ["branch-products", { productId: parsedProductId }] });
      setBranchProductForm(emptyBranchProductForm);
      setIsBranchProductDialogOpen(false);
      setInitialInventoryLotForm(emptyInitialInventoryLotForm());
      setPendingInitialLoadBranchProduct(branchProduct);
      toast({
        title: "Producto asignado",
        description: "Ahora registra el inventario inicial para esta sucursal.",
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

  const updateBranchProductMutation = useMutation({
    mutationFn: ({
      branchProductId,
      payload,
    }: {
      branchProductId: number;
      payload: UpdateBranchProductPayload;
    }) => updateBranchProduct(branchProductId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["branch-products", { productId: parsedProductId }] });
      setBranchProductForm(emptyBranchProductForm);
      setSelectedBranchProductId(null);
      setBranchProductFormMode("create");
      setIsBranchProductDialogOpen(false);
      toast({
        title: "Asignación actualizada",
        description: "Los datos de la sucursal fueron guardados correctamente.",
      });
    },
    onError: (mutationError) => {
      toast({
        title: "No se pudo actualizar",
        description: mutationError instanceof Error ? mutationError.message : "Ocurrió un error al actualizar la asignación.",
        variant: "destructive",
      });
    },
  });

  const createInitialInventoryLotMutation = useMutation({
    mutationFn: (payload: InitialInventoryLotPayload) => createInitialInventoryLot(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["branch-products", { productId: parsedProductId }] });
      setInitialInventoryLotForm(emptyInitialInventoryLotForm());
      setPendingInitialLoadBranchProduct(null);
      toast({
        title: "Inventario inicial cargado",
        description: "El lote inicial fue registrado correctamente.",
      });
    },
    onError: (mutationError) => {
      toast({
        title: "No se pudo cargar inventario",
        description:
          mutationError instanceof Error ? mutationError.message : "Ocurrió un error al registrar el lote inicial.",
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

  const handleInitialInventoryLotChange = (field: keyof InitialInventoryLotFormState, value: string) => {
    setInitialInventoryLotForm((current) => ({ ...current, [field]: value }));
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

  const buildCreateBranchProductPayload = (): CreateBranchProductPayload => {
    const branchId = Number(branchProductForm.branch_id);

    if (!Number.isInteger(branchId) || branchId <= 0) {
      throw new Error("Selecciona una sucursal válida para asignar el producto.");
    }

    return {
      branch_id: branchId,
      product_id: parsedProductId as number,
      sale_price: parseNonNegativeNumber(branchProductForm.sale_price, "Precio de venta"),
      cost_price_default: parseNonNegativeNumber(branchProductForm.cost_price_default, "Costo por defecto"),
      min_stock: parseNonNegativeNumber(branchProductForm.min_stock, "Stock mínimo"),
      max_stock: parseNonNegativeNumber(branchProductForm.max_stock, "Stock máximo"),
      reorder_point: parseNonNegativeNumber(branchProductForm.reorder_point, "Punto de reorden"),
      ...(branchProductForm.shelf_location.trim() ? { shelf_location: branchProductForm.shelf_location.trim() } : {}),
      is_sellable: branchProductForm.is_sellable,
      is_visible_in_pos: branchProductForm.is_visible_in_pos,
      status: branchProductForm.status,
    };
  };

  const buildUpdateBranchProductPayload = (): UpdateBranchProductPayload => ({
    sale_price: parseNonNegativeNumber(branchProductForm.sale_price, "Precio de venta"),
    cost_price_default: parseNonNegativeNumber(branchProductForm.cost_price_default, "Costo por defecto"),
    min_stock: parseNonNegativeNumber(branchProductForm.min_stock, "Stock mínimo"),
    max_stock: parseNonNegativeNumber(branchProductForm.max_stock, "Stock máximo"),
    reorder_point: parseNonNegativeNumber(branchProductForm.reorder_point, "Punto de reorden"),
    shelf_location: branchProductForm.shelf_location.trim(),
    is_sellable: branchProductForm.is_sellable,
    is_visible_in_pos: branchProductForm.is_visible_in_pos,
    status: branchProductForm.status,
  });

  const buildInitialInventoryLotPayload = (): InitialInventoryLotPayload => {
    if (!pendingInitialLoadBranchProduct) {
      throw new Error("No hay una asignación seleccionada para cargar inventario.");
    }

    const lotNumber = initialInventoryLotForm.lot_number.trim();

    if (!lotNumber) {
      throw new Error("Ingresa el número de lote.");
    }

    if (!isFutureDate(initialInventoryLotForm.expiration_date)) {
      throw new Error("La fecha de vencimiento debe ser futura.");
    }

    const purchasePrice = parseNonNegativeNumber(initialInventoryLotForm.purchase_price, "Precio de compra");
    const initialQuantity = parsePositiveNumber(initialInventoryLotForm.initial_quantity, "Cantidad inicial");

    return {
      branch_product_id: pendingInitialLoadBranchProduct.id,
      lot_number: lotNumber,
      expiration_date: initialInventoryLotForm.expiration_date,
      purchase_price: purchasePrice,
      initial_quantity: initialQuantity,
      current_quantity: initialQuantity,
      received_at: initialInventoryLotForm.received_at || formatDateInputValue(new Date()),
      ...(initialInventoryLotForm.supplier_name.trim()
        ? { supplier_name: initialInventoryLotForm.supplier_name.trim() }
        : {}),
      ...(initialInventoryLotForm.invoice_reference.trim()
        ? { invoice_reference: initialInventoryLotForm.invoice_reference.trim() }
        : {}),
      status: initialInventoryLotForm.status,
    };
  };

  const openCreateBranchProductDialog = () => {
    setBranchProductForm(emptyBranchProductForm);
    setSelectedBranchProductId(null);
    setBranchProductFormMode("create");
    setIsBranchProductDialogOpen(true);
  };

  const openEditBranchProductDialog = (branchProduct: BranchProduct) => {
    setBranchProductForm(branchProductToForm(branchProduct));
    setSelectedBranchProductId(branchProduct.id);
    setBranchProductFormMode("edit");
    setIsBranchProductDialogOpen(true);
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

    try {
      if (branchProductFormMode === "edit" && selectedBranchProductId !== null) {
        updateBranchProductMutation.mutate({
          branchProductId: selectedBranchProductId,
          payload: buildUpdateBranchProductPayload(),
        });
        return;
      }

      createBranchProductMutation.mutate(buildCreateBranchProductPayload());
    } catch (validationError) {
      toast({
        title: "Valor inválido",
        description: validationError instanceof Error ? validationError.message : "Revisa los valores numéricos.",
        variant: "destructive",
      });
    }
  };

  const handleInitialInventoryLotSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      createInitialInventoryLotMutation.mutate(buildInitialInventoryLotPayload());
    } catch (validationError) {
      toast({
        title: "Valor inválido",
        description: validationError instanceof Error ? validationError.message : "Revisa los datos del lote inicial.",
        variant: "destructive",
      });
    }
  };

  const isSavingProduct = createProductMutation.isPending || updateProductMutation.isPending;
  const isSavingBranchProduct = createBranchProductMutation.isPending || updateBranchProductMutation.isPending;
  const isSavingInitialInventoryLot = createInitialInventoryLotMutation.isPending;

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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" />
                    Sucursales asignadas
                  </CardTitle>
                  <Button
                    type="button"
                    className="gap-2 sm:self-start"
                    onClick={openCreateBranchProductDialog}
                    disabled={branchesQuery.isLoading || (branchesQuery.data?.items.length ?? 0) === 0}
                  >
                    <Plus className="h-4 w-4" />
                    Nueva asignación
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {branchProductsQuery.data?.total ?? 0} asignaciones registradas para este producto. El stock entra por lotes, no en la asignación.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {branchProductsQuery.isLoading ? (
                  <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando asignaciones...
                  </div>
                ) : branchProductsQuery.isError ? (
                  <div className="p-6 text-sm text-destructive">
                    {branchProductsQuery.error instanceof Error
                      ? branchProductsQuery.error.message
                      : "Ocurrió un error al consultar las asignaciones."}
                  </div>
                ) : (branchProductsQuery.data?.items.length ?? 0) === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">Este producto todavía no está asignado a sucursales.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sucursal</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Stock Total</TableHead>
                        <TableHead className="hidden md:table-cell">Percha</TableHead>
                        <TableHead className="text-center">POS</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(branchProductsQuery.data?.items ?? []).map((branchProduct) => (
                        <TableRow key={branchProduct.id}>
                          <TableCell>
                            <p className="font-medium text-sm">
                              {branchProduct.branch_name || `Sucursal ${branchProduct.branch_id}`}
                            </p>
                            <p className="text-xs text-muted-foreground">{branchProduct.sku || productForm.sku}</p>
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(branchProduct.sale_price)}</TableCell>
                          <TableCell className="text-right text-sm">{formatStock(branchProduct.current_stock)}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {branchProduct.shelf_location || "Sin ubicación"}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-wrap justify-center gap-1">
                              {asBoolean(branchProduct.is_sellable) && (
                                <Badge variant="outline" className="text-[10px]">
                                  Vendible
                                </Badge>
                              )}
                              {asBoolean(branchProduct.is_visible_in_pos) && (
                                <Badge variant="outline" className="text-[10px]">
                                  Visible
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={branchProduct.status === "active" ? "outline" : "secondary"}
                              className={branchProduct.status === "active" ? "badge-active text-[10px]" : "text-[10px]"}
                            >
                              {branchProduct.status === "active" ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-2"
                              onClick={() => openEditBranchProductDialog(branchProduct)}
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
          )}
        </div>
      )}

      {isEditMode && (
        <Dialog
          open={isBranchProductDialogOpen}
          onOpenChange={(open) => {
            setIsBranchProductDialogOpen(open);

            if (!open) {
              setBranchProductForm(emptyBranchProductForm);
              setBranchProductFormMode("create");
              setSelectedBranchProductId(null);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {branchProductFormMode === "create" ? "Nueva asignación a sucursal" : "Editar asignación a sucursal"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleBranchProductSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Sucursal</Label>
                  <Select
                    value={branchProductForm.branch_id}
                    onValueChange={(value) => handleBranchProductChange("branch_id", value)}
                    disabled={branchProductFormMode === "edit" || branchesQuery.isLoading || isSavingBranchProduct}
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
                    disabled={isSavingBranchProduct}
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
                    disabled={isSavingBranchProduct}
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
                    disabled={isSavingBranchProduct}
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
                    disabled={isSavingBranchProduct}
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
                    disabled={isSavingBranchProduct}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch-product-shelf">Ubicación en percha</Label>
                  <Input
                    id="branch-product-shelf"
                    value={branchProductForm.shelf_location}
                    onChange={(event) => handleBranchProductChange("shelf_location", event.target.value)}
                    placeholder="A1-03"
                    disabled={isSavingBranchProduct}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={branchProductForm.status}
                    onValueChange={(value) => handleBranchProductChange("status", value as BranchStatus)}
                    disabled={isSavingBranchProduct}
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
                    disabled={isSavingBranchProduct}
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
                    disabled={isSavingBranchProduct}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBranchProductDialogOpen(false)}
                  disabled={isSavingBranchProduct}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={isSavingBranchProduct || (branchesQuery.data?.items.length ?? 0) === 0}
                >
                  {isSavingBranchProduct ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <GitBranch className="h-4 w-4" />
                      {branchProductFormMode === "create" ? "Crear asignación" : "Guardar cambios"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={pendingInitialLoadBranchProduct !== null}
        onOpenChange={(open) => {
          if (!open && !isSavingInitialInventoryLot) {
            setPendingInitialLoadBranchProduct(null);
            setInitialInventoryLotForm(emptyInitialInventoryLotForm());
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carga inicial de inventario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInitialInventoryLotSubmit} className="space-y-4">
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">
                {pendingInitialLoadBranchProduct?.branch_name ||
                  (pendingInitialLoadBranchProduct
                    ? `Sucursal ${pendingInitialLoadBranchProduct.branch_id}`
                    : "Sucursal seleccionada")}
              </p>
              <p className="text-xs text-muted-foreground">
                {productForm.name || pendingInitialLoadBranchProduct?.product_name || "Producto asignado"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initial-lot-number">Número de lote</Label>
                <Input
                  id="initial-lot-number"
                  value={initialInventoryLotForm.lot_number}
                  onChange={(event) => handleInitialInventoryLotChange("lot_number", event.target.value)}
                  placeholder="LOT-2026-001"
                  disabled={isSavingInitialInventoryLot}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial-expiration-date">Fecha de vencimiento</Label>
                <Input
                  id="initial-expiration-date"
                  type="date"
                  value={initialInventoryLotForm.expiration_date}
                  onChange={(event) => handleInitialInventoryLotChange("expiration_date", event.target.value)}
                  disabled={isSavingInitialInventoryLot}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial-purchase-price">Precio de compra</Label>
                <Input
                  id="initial-purchase-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={initialInventoryLotForm.purchase_price}
                  onChange={(event) => handleInitialInventoryLotChange("purchase_price", event.target.value)}
                  disabled={isSavingInitialInventoryLot}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial-quantity">Cantidad inicial</Label>
                <Input
                  id="initial-quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={initialInventoryLotForm.initial_quantity}
                  onChange={(event) => handleInitialInventoryLotChange("initial_quantity", event.target.value)}
                  disabled={isSavingInitialInventoryLot}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial-received-at">Fecha de recepción</Label>
                <Input
                  id="initial-received-at"
                  type="date"
                  value={initialInventoryLotForm.received_at}
                  onChange={(event) => handleInitialInventoryLotChange("received_at", event.target.value)}
                  disabled={isSavingInitialInventoryLot}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={initialInventoryLotForm.status}
                  onValueChange={(value) => handleInitialInventoryLotChange("status", value)}
                  disabled={isSavingInitialInventoryLot}
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
                <Label htmlFor="initial-supplier-name">Proveedor</Label>
                <Input
                  id="initial-supplier-name"
                  value={initialInventoryLotForm.supplier_name}
                  onChange={(event) => handleInitialInventoryLotChange("supplier_name", event.target.value)}
                  placeholder="Distribuidora Salud"
                  disabled={isSavingInitialInventoryLot}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial-invoice-reference">Factura</Label>
                <Input
                  id="initial-invoice-reference"
                  value={initialInventoryLotForm.invoice_reference}
                  onChange={(event) => handleInitialInventoryLotChange("invoice_reference", event.target.value)}
                  placeholder="FAC-001-001-000123"
                  disabled={isSavingInitialInventoryLot}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPendingInitialLoadBranchProduct(null);
                  setInitialInventoryLotForm(emptyInitialInventoryLotForm());
                }}
                disabled={isSavingInitialInventoryLot}
              >
                Omitir
              </Button>
              <Button type="submit" className="gap-2" disabled={isSavingInitialInventoryLot}>
                {isSavingInitialInventoryLot ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4" />
                    Cargar inventario
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

export default ProductCreate;
