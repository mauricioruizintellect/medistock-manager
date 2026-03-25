import { useState } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, ArrowRightLeft, Printer, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { products, type Product } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  product: Product;
  quantity: number;
}

const POS = () => {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const { toast } = useToast();

  const searchResults = search.length > 1
    ? products.filter(
        (p) =>
          p.estado === "activo" &&
          p.stock > 0 &&
          (p.nombreComercial.toLowerCase().includes(search.toLowerCase()) ||
            p.codigoBarras.includes(search) ||
            p.codigoInterno.toLowerCase().includes(search.toLowerCase()))
      )
    : [];

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast({ title: "Stock insuficiente", variant: "destructive" });
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSearch("");
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== id) return item;
          const newQty = item.quantity + delta;
          if (newQty > item.product.stock) {
            toast({ title: "Stock insuficiente", variant: "destructive" });
            return item;
          }
          return { ...item, quantity: newQty };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.product.id !== id));

  const subtotal = cart.reduce((sum, item) => sum + item.product.precioVenta * item.quantity, 0);
  const discountAmount = subtotal * (discount / 100);
  const taxableAmount = subtotal - discountAmount;
  const tax = taxableAmount * 0.16;
  const total = taxableAmount + tax;

  const completeSale = () => {
    if (cart.length === 0) {
      toast({ title: "Agrega productos al carrito", variant: "destructive" });
      return;
    }
    toast({ title: "¡Venta registrada!", description: `Total: $${total.toFixed(2)} · ${paymentMethod}` });
    setCart([]);
    setDiscount(0);
  };

  const payMethods = [
    { key: "efectivo" as const, icon: Banknote, label: "Efectivo" },
    { key: "tarjeta" as const, icon: CreditCard, label: "Tarjeta" },
    { key: "transferencia" as const, icon: ArrowRightLeft, label: "Transferencia" },
  ];

  return (
    <div className="animate-fade-in h-[calc(100vh-7rem)] flex flex-col lg:flex-row gap-4">
      {/* Left: Search & Products */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="page-header">
          <h1 className="page-title">Punto de Venta</h1>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto por nombre, código o código de barras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-12 text-base"
            autoFocus
          />
        </div>

        {searchResults.length > 0 && (
          <Card className="mb-4">
            <CardContent className="p-2 max-h-64 overflow-y-auto">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div>
                    <p className="font-medium text-sm">{p.nombreComercial}</p>
                    <p className="text-xs text-muted-foreground">{p.presentacion} · Stock: {p.stock}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">${p.precioVenta.toFixed(2)}</span>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Cart Table */}
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
                Busca y agrega productos para iniciar la venta
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.nombreComercial}</p>
                      <p className="text-xs text-muted-foreground">${item.product.precioVenta.toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product.id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product.id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-bold text-sm w-20 text-right">
                      ${(item.product.precioVenta * item.quantity).toFixed(2)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.product.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Summary */}
      <Card className="w-full lg:w-80 shrink-0 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resumen de Venta</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Descuento %</span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="h-8 w-20 text-right ml-auto"
                />
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Descuento</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA (16%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Método de Pago</p>
              <div className="grid grid-cols-3 gap-2">
                {payMethods.map((m) => (
                  <Button
                    key={m.key}
                    variant={paymentMethod === m.key ? "default" : "outline"}
                    size="sm"
                    className="flex-col h-16 gap-1 text-xs"
                    onClick={() => setPaymentMethod(m.key)}
                  >
                    <m.icon className="h-4 w-4" />
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button className="w-full h-12 text-base font-semibold gap-2" onClick={completeSale}>
              Cobrar ${total.toFixed(2)}
            </Button>
            <Button variant="outline" className="w-full gap-2" size="sm">
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
