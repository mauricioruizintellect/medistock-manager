import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Banknote,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getBranchProducts, type BranchProduct } from "@/services/branch-products.service";
import { createSale, type PaymentMethod, type SaleSummary } from "@/services/sales.service";
import { getUserBranchRoles, type UserBranchRole } from "@/services/user-branch-roles.service";

interface CartItem {
  product: BranchProduct;
  quantity: number;
}

interface ReceiptSnapshot {
  sale: SaleSummary;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  branchName: string;
  cashierName: string;
}

const MIN_SEARCH_LENGTH = 2;

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const formatCurrency = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(toNumber(value));

const formatStock = (value: string | number | null | undefined) => {
  const stock = toNumber(value);
  return Number.isInteger(stock) ? String(stock) : stock.toFixed(2);
};

const dedupeBranches = (branches: UserBranchRole[]) => {
  const uniqueBranches = new Map<number, UserBranchRole>();

  for (const branch of branches) {
    const existing = uniqueBranches.get(branch.branch_id);

    if (!existing || (!Boolean(existing.is_default) && Boolean(branch.is_default))) {
      uniqueBranches.set(branch.branch_id, branch);
    }
  }

  return Array.from(uniqueBranches.values());
};

const getDefaultBranch = (branches: UserBranchRole[], defaultBranchId?: number | null) => {
  return (
    branches.find((branch) => branch.branch_id === defaultBranchId) ||
    branches.find((branch) => Boolean(branch.is_default)) ||
    branches[0] ||
    null
  );
};

const buildReceiptHtml = (receipt: ReceiptSnapshot) => {
  const itemsRows = receipt.items
    .map(
      (item) => `
        <tr>
          <td>${item.name}</td>
          <td style="text-align:center;">${item.quantity}</td>
          <td style="text-align:right;">${formatCurrency(item.unitPrice)}</td>
          <td style="text-align:right;">${formatCurrency(item.total)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Ticket ${receipt.sale.ticket_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
          h1, h2, p { margin: 0; }
          .header { margin-bottom: 16px; }
          .meta { margin-top: 8px; color: #4b5563; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 0; }
          th { text-align: left; font-size: 12px; color: #6b7280; }
          .totals { margin-top: 16px; margin-left: auto; width: 220px; font-size: 13px; }
          .totals div { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .grand-total { font-size: 16px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Ticket de Venta</h1>
          <div class="meta">
            <p><strong>Ticket:</strong> ${receipt.sale.ticket_number}</p>
            <p><strong>Sucursal:</strong> ${receipt.branchName}</p>
            <p><strong>Cajero:</strong> ${receipt.cashierName}</p>
            <p><strong>Fecha:</strong> ${new Intl.DateTimeFormat("es-EC", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(receipt.sale.created_at))}</p>
            <p><strong>Pago:</strong> ${receipt.sale.payment_method ?? "N/D"}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th style="text-align:center;">Cant.</th>
              <th style="text-align:right;">P. Unit.</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>

        <div class="totals">
          <div><span>Subtotal</span><span>${formatCurrency(receipt.sale.subtotal)}</span></div>
          <div><span>Descuento</span><span>${formatCurrency(receipt.sale.discount_amount)}</span></div>
          <div><span>Impuesto</span><span>${formatCurrency(receipt.sale.tax_amount)}</span></div>
          <div class="grand-total"><span>Total</span><span>${formatCurrency(receipt.sale.total)}</span></div>
        </div>
      </body>
    </html>
  `;
};

const POS = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercentInput, setDiscountPercentInput] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [lastReceipt, setLastReceipt] = useState<ReceiptSnapshot | null>(null);

  const deferredSearch = useDeferredValue(search.trim());
  const cashierName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || user?.email || "Cajero";

  const branchRolesQuery = useQuery({
    queryKey: ["user-branch-roles", "pos"],
    queryFn: () => getUserBranchRoles({ status: "active" }),
    enabled: Boolean(user?.id),
  });

  const branchOptions = useMemo(() => dedupeBranches(branchRolesQuery.data?.items ?? []), [branchRolesQuery.data?.items]);

  useEffect(() => {
    if (selectedBranchId || branchOptions.length === 0) {
      return;
    }

    const defaultBranch = getDefaultBranch(branchOptions, user?.default_branch_id);
    if (defaultBranch) {
      setSelectedBranchId(String(defaultBranch.branch_id));
    }
  }, [branchOptions, selectedBranchId, user?.default_branch_id]);

  useEffect(() => {
    setCart([]);
    setSearch("");
  }, [selectedBranchId]);

  const selectedBranch = useMemo(
    () => branchOptions.find((branch) => String(branch.branch_id) === selectedBranchId) ?? null,
    [branchOptions, selectedBranchId],
  );

  const searchResultsQuery = useQuery({
    queryKey: [
      "pos-branch-products",
      {
        branchId: selectedBranchId,
        search: deferredSearch,
      },
    ],
    queryFn: () =>
      getBranchProducts({
        branch_id: Number(selectedBranchId),
        search: deferredSearch,
        status: "active",
        is_visible_in_pos: true,
        is_sellable: true,
        has_stock: true,
      }),
    enabled: Number(selectedBranchId) > 0 && deferredSearch.length >= MIN_SEARCH_LENGTH,
  });

  const createSaleMutation = useMutation({
    mutationFn: createSale,
  });

  const searchResults = searchResultsQuery.data?.items ?? [];
  const discountPercent = Math.min(100, Math.max(0, toNumber(discountPercentInput)));

  const subtotal = useMemo(
    () => roundCurrency(cart.reduce((sum, item) => sum + toNumber(item.product.sale_price) * item.quantity, 0)),
    [cart],
  );

  const discountAmount = useMemo(() => roundCurrency((subtotal * discountPercent) / 100), [discountPercent, subtotal]);

  const tax = useMemo(() => {
    if (subtotal <= 0) {
      return 0;
    }

    return roundCurrency(
      cart.reduce((sum, item) => {
        const lineSubtotal = toNumber(item.product.sale_price) * item.quantity;
        const proportionalDiscount = roundCurrency((lineSubtotal * discountPercent) / 100);
        const taxableBase = roundCurrency(lineSubtotal - proportionalDiscount);
        const lineTax = roundCurrency((taxableBase * toNumber(item.product.tax_rate)) / 100);
        return sum + lineTax;
      }, 0),
    );
  }, [cart, discountPercent, subtotal]);

  const total = useMemo(() => roundCurrency(subtotal - discountAmount + tax), [discountAmount, subtotal, tax]);

  const addToCart = (product: BranchProduct) => {
    const availableStock = toNumber(product.current_stock);

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.product.id === product.id);

      if (existingItem) {
        if (existingItem.quantity >= availableStock) {
          toast({ title: "Stock insuficiente", variant: "destructive" });
          return currentCart;
        }

        return currentCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      if (availableStock <= 0) {
        toast({ title: "Producto sin existencias", variant: "destructive" });
        return currentCart;
      }

      return [...currentCart, { product, quantity: 1 }];
    });

    setSearch("");
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.product.id !== productId) {
            return item;
          }

          const nextQuantity = item.quantity + delta;
          const availableStock = toNumber(item.product.current_stock);

          if (nextQuantity > availableStock) {
            toast({ title: "Stock insuficiente", variant: "destructive" });
            return item;
          }

          return {
            ...item,
            quantity: nextQuantity,
          };
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (productId: number) => {
    setCart((currentCart) => currentCart.filter((item) => item.product.id !== productId));
  };

  const completeSale = () => {
    if (!selectedBranch) {
      toast({ title: "Selecciona una sucursal", variant: "destructive" });
      return;
    }

    if (cart.length === 0) {
      toast({ title: "Agrega productos al carrito", variant: "destructive" });
      return;
    }

    const receiptItems = cart.map((item) => ({
      name: item.product.product_name ?? "Producto",
      quantity: item.quantity,
      unitPrice: toNumber(item.product.sale_price),
      total: roundCurrency(toNumber(item.product.sale_price) * item.quantity),
    }));

    createSaleMutation.mutate(
      {
        branch_id: selectedBranch.branch_id,
        payment_method: paymentMethod,
        discount_type: discountPercent > 0 ? "percentage" : undefined,
        discount_value: discountPercent > 0 ? discountPercent : 0,
        items: cart.map((item) => ({
          branch_product_id: item.product.id,
          quantity: item.quantity,
          unit_price: toNumber(item.product.sale_price),
        })),
      },
      {
        onSuccess: async (sale) => {
          await queryClient.invalidateQueries({ queryKey: ["pos-branch-products"] });
          await queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
          await queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });

          setLastReceipt({
            sale,
            items: receiptItems,
            branchName: selectedBranch.branch_name,
            cashierName,
          });
          setCart([]);
          setDiscountPercentInput("0");
          setSearch("");

          toast({
            title: "Venta registrada",
            description: `${sale.ticket_number} · ${formatCurrency(sale.total)}`,
          });
        },
        onError: (error) => {
          toast({
            title: "No se pudo registrar la venta",
            description: error instanceof Error ? error.message : "Ocurrió un error al registrar la venta.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const printLastReceipt = () => {
    if (!lastReceipt) {
      toast({
        title: "No hay ticket para imprimir",
        description: "Registra una venta para habilitar la impresión del ticket.",
        variant: "destructive",
      });
      return;
    }

    const receiptWindow = window.open("", "_blank", "width=720,height=840");

    if (!receiptWindow) {
      toast({
        title: "No se pudo abrir la ventana de impresión",
        description: "Revisa si el navegador está bloqueando ventanas emergentes.",
        variant: "destructive",
      });
      return;
    }

    receiptWindow.document.open();
    receiptWindow.document.write(buildReceiptHtml(lastReceipt));
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
  };

  const paymentMethods = [
    { key: "cash" as const, icon: Banknote, label: "Efectivo" },
    { key: "card" as const, icon: CreditCard, label: "Tarjeta" },
    { key: "transfer" as const, icon: ArrowRightLeft, label: "Transferencia" },
  ];

  const canSearchProducts = Number(selectedBranchId) > 0;
  const showSearchResults = deferredSearch.length >= MIN_SEARCH_LENGTH;

  return (
    <div className="animate-fade-in h-[calc(100vh-7rem)] flex flex-col lg:flex-row gap-4">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="page-header mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="page-title">Punto de Venta</h1>
            <p className="text-sm text-muted-foreground">
              {selectedBranch ? `Sucursal activa: ${selectedBranch.branch_name}` : "Selecciona una sucursal para vender"}
            </p>
          </div>

          <div className="w-full md:w-72">
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona sucursal" />
              </SelectTrigger>
              <SelectContent>
                {branchOptions.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.branch_id)}>
                    {branch.branch_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary">{cashierName}</Badge>
          {selectedBranch?.role_name ? <Badge variant="outline">{selectedBranch.role_name}</Badge> : null}
          {lastReceipt ? <Badge>{lastReceipt.sale.ticket_number}</Badge> : null}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto por nombre, código o código de barras..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9 h-12 text-base"
            autoFocus
            disabled={!canSearchProducts || createSaleMutation.isPending}
          />
        </div>

        {branchRolesQuery.isLoading ? (
          <Card className="mb-4">
            <CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando sucursales asignadas...
            </CardContent>
          </Card>
        ) : null}

        {branchRolesQuery.isError ? (
          <Card className="mb-4 border-destructive/40">
            <CardContent className="p-4 text-sm text-destructive">
              {branchRolesQuery.error instanceof Error
                ? branchRolesQuery.error.message
                : "No se pudieron obtener las sucursales asignadas."}
            </CardContent>
          </Card>
        ) : null}

        {branchRolesQuery.data && branchOptions.length === 0 ? (
          <Card className="mb-4 border-destructive/40">
            <CardContent className="p-4 text-sm text-muted-foreground">
              El usuario no tiene sucursales activas asignadas para operar en POS.
            </CardContent>
          </Card>
        ) : null}

        {showSearchResults ? (
          <Card className="mb-4">
            <CardContent className="p-2 max-h-64 overflow-y-auto">
              {searchResultsQuery.isLoading ? (
                <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando productos...
                </div>
              ) : null}

              {searchResultsQuery.isError ? (
                <div className="p-4 text-sm text-destructive">
                  {searchResultsQuery.error instanceof Error
                    ? searchResultsQuery.error.message
                    : "No se pudo cargar el catálogo POS."}
                </div>
              ) : null}

              {!searchResultsQuery.isLoading && !searchResultsQuery.isError && searchResults.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No se encontraron productos visibles en POS para esa búsqueda.
                </div>
              ) : null}

              {!searchResultsQuery.isLoading && !searchResultsQuery.isError
                ? searchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div>
                        <p className="font-medium text-sm">{product.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.presentation ?? product.sku ?? "Sin presentación"} · Stock:{" "}
                          {formatStock(product.current_stock)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{formatCurrency(product.sale_price)}</span>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))
                : null}
            </CardContent>
          </Card>
        ) : null}

        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Carrito ({cart.length} productos)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 pt-0">
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                {canSearchProducts
                  ? "Busca y agrega productos para iniciar la venta"
                  : "Selecciona una sucursal para cargar el catálogo"}
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.product.sale_price)} c/u · Stock: {formatStock(item.product.current_stock)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQty(item.product.id, -1)}
                        disabled={createSaleMutation.isPending}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQty(item.product.id, 1)}
                        disabled={createSaleMutation.isPending}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-bold text-sm w-20 text-right">
                      {formatCurrency(toNumber(item.product.sale_price) * item.quantity)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeItem(item.product.id)}
                      disabled={createSaleMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="w-full lg:w-80 shrink-0 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resumen de Venta</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Descuento %</span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercentInput}
                  onChange={(event) => setDiscountPercentInput(event.target.value)}
                  className="h-8 w-20 text-right ml-auto"
                  disabled={createSaleMutation.isPending}
                />
              </div>
              {discountPercent > 0 ? (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Descuento</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Impuestos</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Método de Pago</p>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((method) => (
                  <Button
                    key={method.key}
                    variant={paymentMethod === method.key ? "default" : "outline"}
                    size="sm"
                    className="flex-col h-16 gap-1 text-xs"
                    onClick={() => setPaymentMethod(method.key)}
                    disabled={createSaleMutation.isPending}
                  >
                    <method.icon className="h-4 w-4" />
                    {method.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              className="w-full h-12 text-base font-semibold gap-2"
              onClick={completeSale}
              disabled={createSaleMutation.isPending || cart.length === 0 || !selectedBranch}
            >
              {createSaleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {createSaleMutation.isPending ? "Procesando venta..." : `Cobrar ${formatCurrency(total)}`}
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              size="sm"
              onClick={printLastReceipt}
              disabled={!lastReceipt}
            >
              <Printer className="h-4 w-4" />
              Imprimir Ticket
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default POS;
