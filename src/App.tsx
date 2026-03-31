import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayout } from "@/components/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import POS from "./pages/POS";
import Clients from "./pages/Clients";
import Purchases from "./pages/Purchases";
import Reports from "./pages/Reports";
import Alerts from "./pages/Alerts";
import UsersManagement from "./pages/UsersManagement";
import Pharmacy from "./pages/Pharmacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/pos" element={<POS />} />
                <Route path="/productos" element={<Products />} />
                <Route path="/inventario" element={<Inventory />} />
                <Route path="/compras" element={<Purchases />} />
                <Route path="/clientes" element={<Clients />} />
                <Route path="/reportes" element={<Reports />} />
                <Route path="/alertas" element={<Alerts />} />
                <Route path="/usuarios" element={<UsersManagement />} />
                <Route path="/farmacia" element={<Pharmacy />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
