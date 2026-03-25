import { Shield, User, Edit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const users = [
  { id: "U001", nombre: "Administrador General", correo: "admin@farmacia.com", rol: "admin", estado: "activo", ultimoAcceso: "2026-03-25 08:00" },
  { id: "U002", nombre: "Ana Vendedor", correo: "cajero@farmacia.com", rol: "vendedor", estado: "activo", ultimoAcceso: "2026-03-25 09:00" },
];

const UsersManagement = () => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Usuarios y Roles</h1>
        <p className="page-description">Gestión de accesos al sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Roles del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">Administrador</p>
              <p className="text-xs text-muted-foreground mt-1">Acceso total: Dashboard, Productos, Inventario, POS, Clientes, Compras, Reportes, Alertas, Usuarios</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">Cajero / Vendedor</p>
              <p className="text-xs text-muted-foreground mt-1">Acceso limitado: POS, Clientes, Consulta de productos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Usuarios</span>
              <span className="font-bold">{users.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Administradores</span>
              <span className="font-bold">{users.filter(u => u.rol === "admin").length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Vendedores</span>
              <span className="font-bold">{users.filter(u => u.rol === "vendedor").length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead className="text-center">Rol</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="hidden md:table-cell">Último Acceso</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm">{u.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.correo}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={u.rol === "admin" ? "default" : "secondary"} className="text-[10px] capitalize">{u.rol}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="badge-active text-[10px]">{u.estado}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{u.ultimoAcceso}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Edit2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersManagement;
