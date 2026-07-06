import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit2,
  Loader2,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/api-errors";
import {
  createUser,
  deactivateUser,
  getUserRoles,
  getUsersByPharmacy,
  updateUser,
  type CreateUserPayload,
  type PharmacyUser,
  type UpdateUserPayload,
  type UserRole,
} from "@/services/users.service";

const PHARMACY_ADMIN_ROLE_CODES = ["CASHIER", "PHARMACY_ADMIN", "BRANCH_ADMIN"];

type UserFormMode = "create" | "edit";

interface UserFormState {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  role_id: string;
  status: "active" | "inactive";
}

const emptyForm: UserFormState = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  phone: "",
  role_id: "",
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

const getFullName = (pharmacyUser: PharmacyUser) =>
  `${pharmacyUser.first_name} ${pharmacyUser.last_name}`.trim();

const getRoleLabel = (role: UserRole) => role.name || role.code;

const UsersManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pharmacyId = user?.pharmacy_id ?? null;
  const [formMode, setFormMode] = useState<UserFormMode>("create");
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [selectedUser, setSelectedUser] = useState<PharmacyUser | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<PharmacyUser | null>(null);

  const usersQuery = useQuery({
    queryKey: ["users", "pharmacy", pharmacyId],
    queryFn: () => getUsersByPharmacy(pharmacyId as number),
    enabled: pharmacyId !== null,
  });

  const rolesQuery = useQuery({
    queryKey: ["users", "roles"],
    queryFn: getUserRoles,
  });

  const roles = useMemo(() => {
    const currentRoles = rolesQuery.data ?? [];

    if (user?.role_code === "PHARMACY_ADMIN") {
      return currentRoles.filter((role) => PHARMACY_ADMIN_ROLE_CODES.includes(role.code));
    }

    return currentRoles;
  }, [rolesQuery.data, user?.role_code]);

  useEffect(() => {
    if (form.role_id || roles.length === 0) {
      return;
    }

    const cashierRole = roles.find((role) => role.code === "CASHIER") ?? roles[0];
    setForm((current) => ({ ...current, role_id: String(cashierRole.id) }));
  }, [form.role_id, roles]);

  const invalidateUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: ["users", "pharmacy", pharmacyId] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: async () => {
      await invalidateUsers();
      setIsFormOpen(false);
      toast({
        title: "Usuario creado",
        description: "El usuario fue creado correctamente.",
      });
    },
    onError: (mutationError) => {
      toast({
        title: "No se pudo crear",
        description: mutationError instanceof Error ? mutationError.message : "Ocurrió un error al crear el usuario.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: UpdateUserPayload }) => updateUser(userId, payload),
    onSuccess: async () => {
      await invalidateUsers();
      setIsFormOpen(false);
      setSelectedUser(null);
      toast({
        title: "Usuario actualizado",
        description: "Los cambios fueron guardados correctamente.",
      });
    },
    onError: (mutationError) => {
      toast({
        title: "No se pudo actualizar",
        description: mutationError instanceof Error ? mutationError.message : "Ocurrió un error al actualizar el usuario.",
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: number) => deactivateUser(userId),
    onSuccess: async () => {
      await invalidateUsers();
      setUserToDeactivate(null);
      toast({
        title: "Usuario desactivado",
        description: "El usuario quedó inactivo.",
      });
    },
    onError: (mutationError) => {
      toast({
        title: "No se pudo desactivar",
        description: mutationError instanceof Error ? mutationError.message : "Ocurrió un error al desactivar el usuario.",
        variant: "destructive",
      });
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const activeUsers = usersQuery.data?.filter((pharmacyUser) => pharmacyUser.status === "active").length ?? 0;
  const admins =
    usersQuery.data?.filter((pharmacyUser) => pharmacyUser.role_code.includes("ADMIN")).length ?? 0;
  const usersErrorMessage = getErrorMessage(usersQuery.error, "Ocurrió un error al consultar usuarios.", {
    403: "No tienes permisos para consultar usuarios de otra farmacia.",
  });

  const openCreateForm = () => {
    const cashierRole = roles.find((role) => role.code === "CASHIER") ?? roles[0];
    setFormMode("create");
    setSelectedUser(null);
    setForm({
      ...emptyForm,
      role_id: cashierRole ? String(cashierRole.id) : "",
    });
    setIsFormOpen(true);
  };

  const openEditForm = (pharmacyUser: PharmacyUser) => {
    setFormMode("edit");
    setSelectedUser(pharmacyUser);
    setForm({
      first_name: pharmacyUser.first_name,
      last_name: pharmacyUser.last_name,
      email: pharmacyUser.email,
      password: "",
      phone: pharmacyUser.phone ?? "",
      role_id: String(pharmacyUser.role_id),
      status: pharmacyUser.status,
    });
    setIsFormOpen(true);
  };

  const handleChange = (field: keyof UserFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const roleId = Number(form.role_id);

    if (!roleId) {
      toast({
        title: "Rol requerido",
        description: "Selecciona un rol para guardar el usuario.",
        variant: "destructive",
      });
      return;
    }

    if (formMode === "create" && form.password.length < 6) {
      toast({
        title: "Contraseña inválida",
        description: "La contraseña debe tener al menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (formMode === "edit" && form.password && form.password.length < 6) {
      toast({
        title: "Contraseña inválida",
        description: "La nueva contraseña debe tener al menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    const basePayload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role_id: roleId,
      status: form.status,
    };

    if (formMode === "create") {
      createMutation.mutate({
        ...basePayload,
        password: form.password,
      });
      return;
    }

    if (!selectedUser) {
      return;
    }

    updateMutation.mutate({
      userId: selectedUser.id,
      payload: {
        ...basePayload,
        ...(form.password ? { password: form.password } : {}),
      },
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Usuarios y Roles</h1>
          <p className="page-description">Gestión de accesos de la farmacia</p>
        </div>
        <Button className="gap-2 self-start" onClick={openCreateForm} disabled={pharmacyId === null || rolesQuery.isLoading}>
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Total usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{usersQuery.data?.length ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Registrados en la farmacia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeUsers}</p>
            <p className="text-sm text-muted-foreground mt-1">Con acceso habilitado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Administradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{admins}</p>
            <p className="text-sm text-muted-foreground mt-1">Roles administrativos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog className="h-4 w-4 text-primary" />
            Usuarios de la farmacia
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pharmacyId === null ? (
            <div className="p-6 text-sm text-muted-foreground">El usuario autenticado no tiene `pharmacy_id` asignado.</div>
          ) : usersQuery.isLoading ? (
            <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando usuarios...
            </div>
          ) : usersQuery.isError ? (
            <div className="p-6 text-sm text-destructive">
              {usersErrorMessage}
            </div>
          ) : usersQuery.data?.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No hay usuarios registrados para esta farmacia.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="text-center">Rol</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.data?.map((pharmacyUser) => (
                  <TableRow key={pharmacyUser.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{getFullName(pharmacyUser)}</p>
                          <p className="text-xs text-muted-foreground">ID {pharmacyUser.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{pharmacyUser.email}</p>
                      <p className="text-xs text-muted-foreground">{pharmacyUser.phone || "Sin teléfono"}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={pharmacyUser.role_code.includes("ADMIN") ? "default" : "secondary"} className="text-[10px]">
                        {pharmacyUser.role_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={pharmacyUser.status === "active" ? "outline" : "secondary"}
                        className={pharmacyUser.status === "active" ? "badge-active text-[10px]" : "text-[10px]"}
                      >
                        {pharmacyUser.status === "active" ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {formatDate(pharmacyUser.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(pharmacyUser)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setUserToDeactivate(pharmacyUser)}
                          disabled={pharmacyUser.status === "inactive"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{formMode === "create" ? "Crear usuario" : "Editar usuario"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombres</Label>
                <Input id="first_name" value={form.first_name} onChange={(event) => handleChange("first_name", event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellidos</Label>
                <Input id="last_name" value={form.last_name} onChange={(event) => handleChange("last_name", event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" type="email" value={form.email} onChange={(event) => handleChange("email", event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" value={form.phone} onChange={(event) => handleChange("phone", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{formMode === "create" ? "Contraseña" : "Nueva contraseña"}</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(event) => handleChange("password", event.target.value)}
                  minLength={form.password || formMode === "create" ? 6 : undefined}
                  required={formMode === "create"}
                  placeholder={formMode === "edit" ? "Dejar vacía para no cambiar" : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={form.role_id} onValueChange={(value) => handleChange("role_id", value)} disabled={rolesQuery.isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {getRoleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(value) => handleChange("status", value as UserFormState["status"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving || roles.length === 0}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(userToDeactivate)} onOpenChange={(open) => !open && setUserToDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cambia el estado de {userToDeactivate ? getFullName(userToDeactivate) : "este usuario"} a inactivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deactivateMutation.isPending}
              onClick={(event) => {
                event.preventDefault();

                if (userToDeactivate) {
                  deactivateMutation.mutate(userToDeactivate.id);
                }
              }}
            >
              {deactivateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Desactivando...
                </>
              ) : (
                "Desactivar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Roles permitidos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {rolesQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando roles...
            </div>
          ) : roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay roles disponibles.</p>
          ) : (
            roles.map((role) => (
              <Badge key={role.id} variant="secondary">
                {role.code}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersManagement;
