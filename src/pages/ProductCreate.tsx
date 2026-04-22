import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import type { BranchStatus } from "@/services/branches.service";
import { getProductCategories } from "@/services/product-categories.service";
import { createProduct, type CreateProductPayload } from "@/services/products.service";

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

const ProductCreate = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pharmacyId = user?.pharmacy_id ?? null;
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);

  const categoriesQuery = useQuery({
    queryKey: ["product-categories", { pharmacyId }],
    queryFn: () => getProductCategories({ ...(pharmacyId !== null ? { pharmacy_id: pharmacyId } : {}) }),
    enabled: pharmacyId !== null,
  });

  const createProductMutation = useMutation({
    mutationFn: (payload: CreateProductPayload) => createProduct(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Producto creado",
        description: "El producto maestro fue registrado correctamente.",
      });
      navigate("/productos");
    },
    onError: (mutationError) => {
      toast({
        title: "No se pudo crear",
        description: mutationError instanceof Error ? mutationError.message : "Ocurrió un error al crear el producto.",
        variant: "destructive",
      });
    },
  });

  const handleProductChange = (field: keyof ProductFormState, value: string | boolean) => {
    setProductForm((current) => ({ ...current, [field]: value }));
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

    const taxRate = Number(productForm.tax_rate || 0);

    if (!Number.isFinite(taxRate) || taxRate < 0) {
      toast({
        title: "Impuesto inválido",
        description: "La tasa de impuesto debe ser un número positivo o 0.",
        variant: "destructive",
      });
      return;
    }

    createProductMutation.mutate({
      pharmacy_id: pharmacyId,
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
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Nuevo producto maestro</h1>
          <p className="page-description">Registra la ficha base antes de asignarla a una sucursal.</p>
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
      ) : (
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
            <Button type="button" variant="outline" onClick={() => navigate("/productos")} disabled={createProductMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="gap-2" disabled={createProductMutation.isPending}>
              {createProductMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  Crear producto
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ProductCreate;
