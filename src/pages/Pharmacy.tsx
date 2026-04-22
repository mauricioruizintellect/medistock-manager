import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Edit2,
  GitBranch,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  createBranch,
  getBranches,
  updateBranch,
  type Branch,
  type BranchStatus,
  type CreateBranchPayload,
  type UpdateBranchPayload,
} from "@/services/branches.service";
import { getPharmacyById, updatePharmacyById, type UpdatePharmacyPayload } from "@/services/pharmacy.service";

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "No disponible";
  }

  return String(value);
};

const formatDate = (value: unknown) => {
  if (!value) {
    return "No disponible";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatStatus = (value: unknown) => {
  const normalized = String(value ?? "").toLowerCase();

  if (normalized === "active") {
    return "Activa";
  }

  if (normalized === "inactive") {
    return "Inactiva";
  }

  return formatValue(value);
};

const emptyForm: UpdatePharmacyPayload = {
  name: "",
  legal_name: "",
  tax_id: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  country: "",
  status: "active",
};

interface BranchFormState {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  status: BranchStatus;
  is_main: boolean;
}

type BranchFormMode = "create" | "edit";

const emptyBranchForm: BranchFormState = {
  id: "",
  code: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  status: "active",
  is_main: false,
};

const buildBranchPayload = (form: BranchFormState) => ({
  ...(form.code.trim() ? { code: form.code.trim() } : {}),
  name: form.name.trim(),
  ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
  ...(form.email.trim() ? { email: form.email.trim() } : {}),
  ...(form.address.trim() ? { address: form.address.trim() } : {}),
  ...(form.city.trim() ? { city: form.city.trim() } : {}),
  status: form.status,
  is_main: form.is_main,
});

const isMainBranch = (value: Branch["is_main"]) => value === true || value === 1;

const branchToForm = (branch: Branch): BranchFormState => ({
  id: String(branch.id),
  code: branch.code ?? "",
  name: branch.name,
  phone: branch.phone ?? "",
  email: branch.email ?? "",
  address: branch.address ?? "",
  city: branch.city ?? "",
  status: branch.status,
  is_main: isMainBranch(branch.is_main),
});

const Pharmacy = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pharmacyId = user?.pharmacy_id ?? null;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState<UpdatePharmacyPayload>(emptyForm);
  const [isBranchFormOpen, setIsBranchFormOpen] = useState(false);
  const [branchFormMode, setBranchFormMode] = useState<BranchFormMode>("create");
  const [branchForm, setBranchForm] = useState<BranchFormState>(emptyBranchForm);
  const [branchStatusFilter, setBranchStatusFilter] = useState<BranchStatus | "all">("all");
  const [branchSearch, setBranchSearch] = useState("");
  const canListBranches = Boolean(user) && (pharmacyId !== null || user?.is_super_admin);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["pharmacy", pharmacyId],
    queryFn: () => getPharmacyById(pharmacyId as number),
    enabled: pharmacyId !== null,
  });

  const branchesQuery = useQuery({
    queryKey: ["branches", { pharmacyId, status: branchStatusFilter, search: branchSearch }],
    queryFn: () =>
      getBranches({
        ...(pharmacyId !== null ? { pharmacy_id: pharmacyId } : {}),
        ...(branchStatusFilter !== "all" ? { status: branchStatusFilter } : {}),
        ...(branchSearch.trim() ? { search: branchSearch.trim() } : {}),
      }),
    enabled: canListBranches,
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    setForm({
      name: data.name,
      legal_name: data.legal_name,
      tax_id: data.tax_id,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      country: data.country,
      status: data.status,
    });
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePharmacyPayload) => updatePharmacyById(pharmacyId as number, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", pharmacyId] });
      setIsEditOpen(false);
      toast({
        title: "Farmacia actualizada",
        description: "Los datos de la farmacia se guardaron correctamente.",
      });
    },
    onError: (mutationError) => {
      toast({
        title: "No se pudo actualizar",
        description: mutationError instanceof Error ? mutationError.message : "Ocurrió un error al guardar la farmacia.",
        variant: "destructive",
      });
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: (payload: CreateBranchPayload) => createBranch(payload),
    onSuccess: async (branch) => {
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
      setBranchForm(branchToForm(branch));
      setBranchFormMode("edit");
      setIsBranchFormOpen(false);
      toast({
        title: "Sucursal creada",
        description: "La sucursal fue registrada correctamente.",
      });
    },
    onError: (mutationError) => {
      toast({
        title: "No se pudo crear",
        description: mutationError instanceof Error ? mutationError.message : "Ocurrió un error al crear la sucursal.",
        variant: "destructive",
      });
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: ({ branchId, payload }: { branchId: number; payload: UpdateBranchPayload }) => updateBranch(branchId, payload),
    onSuccess: async (branch) => {
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
      setBranchForm(branchToForm(branch));
      setIsBranchFormOpen(false);
      toast({
        title: "Sucursal actualizada",
        description: "Los cambios de la sucursal fueron guardados correctamente.",
      });
    },
    onError: (mutationError) => {
      toast({
        title: "No se pudo actualizar",
        description: mutationError instanceof Error ? mutationError.message : "Ocurrió un error al actualizar la sucursal.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (field: keyof UpdatePharmacyPayload, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleBranchChange = (field: keyof BranchFormState, value: string | boolean) => {
    setBranchForm((current) => ({ ...current, [field]: value }));
  };

  const openCreateBranchForm = () => {
    setBranchFormMode("create");
    setBranchForm(emptyBranchForm);
    setIsBranchFormOpen(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setBranchFormMode("edit");
    setBranchForm(branchToForm(branch));
    setIsBranchFormOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pharmacyId === null) {
      return;
    }

    updateMutation.mutate(form);
  };

  const handleBranchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (branchFormMode === "edit") {
      const branchId = Number(branchForm.id);

      if (!Number.isInteger(branchId) || branchId <= 0) {
        toast({
          title: "ID requerido",
          description: "Selecciona una sucursal válida para actualizar.",
          variant: "destructive",
        });
        return;
      }

      updateBranchMutation.mutate({
        branchId,
        payload: buildBranchPayload(branchForm),
      });
      return;
    }

    if (pharmacyId === null) {
      toast({
        title: "Pharmacy ID requerido",
        description: "El usuario autenticado no tiene una farmacia asignada para crear sucursales.",
        variant: "destructive",
      });
      return;
    }

    createBranchMutation.mutate({
      pharmacy_id: pharmacyId,
      ...buildBranchPayload(branchForm),
    });
  };

  const isBranchSaving = createBranchMutation.isPending || updateBranchMutation.isPending;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Farmacia</h1>
          <p className="page-description">Información general de la farmacia asociada al usuario autenticado</p>
        </div>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button disabled={pharmacyId === null || isLoading || isError} className="gap-2 self-start">
              <Edit2 className="h-4 w-4" />
              Editar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar farmacia</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre comercial</Label>
                  <Input id="name" value={form.name} onChange={(event) => handleChange("name", event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_name">Razón social</Label>
                  <Input id="legal_name" value={form.legal_name} onChange={(event) => handleChange("legal_name", event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_id">RUC / Tax ID</Label>
                  <Input id="tax_id" value={form.tax_id} onChange={(event) => handleChange("tax_id", event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" value={form.phone} onChange={(event) => handleChange("phone", event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo</Label>
                  <Input id="email" type="email" value={form.email} onChange={(event) => handleChange("email", event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={form.status} onValueChange={(value) => handleChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" value={form.address} onChange={(event) => handleChange("address", event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input id="city" value={form.city} onChange={(event) => handleChange("city", event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input id="country" value={form.country} onChange={(event) => handleChange("country", event.target.value)} required />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={updateMutation.isPending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branches">Sucursales</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              Identificación
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pharmacyId === null ? (
              <p className="text-sm text-muted-foreground">El usuario autenticado no tiene `pharmacy_id` asignado.</p>
            ) : isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando datos de la farmacia...
              </div>
            ) : isError ? (
              <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Ocurrió un error al consultar la farmacia."}</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-bold">{formatValue(data?.name)}</p>
                  <p className="text-sm text-muted-foreground">{formatValue(data?.legal_name)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">ID {formatValue(data?.id)}</Badge>
                  <Badge variant={String(data?.status).toLowerCase() === "active" ? "default" : "secondary"}>
                    {formatStatus(data?.status)}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
            </Card>

            <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Consulta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pharmacy ID</p>
              <p className="text-lg font-semibold">{pharmacyId ?? "Sin asignar"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Estado</p>
              {pharmacyId === null ? (
                <Badge variant="secondary">Sin pharmacy_id</Badge>
              ) : isLoading ? (
                <Badge variant="secondary">Cargando</Badge>
              ) : isError ? (
                <Badge variant="destructive">Error</Badge>
              ) : (
                <Badge variant="default">Cargado</Badge>
              )}
            </div>
          </CardContent>
            </Card>
          </div>

          {!isLoading && !isError && pharmacyId !== null && data && (
            <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  Datos fiscales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4 bg-muted/20">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Razón social</p>
                  <p className="text-sm font-medium mt-1">{formatValue(data.legal_name)}</p>
                </div>
                <div className="rounded-lg border p-4 bg-muted/20">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">RUC / Tax ID</p>
                  <p className="text-sm font-medium mt-1">{formatValue(data.tax_id)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Estado general
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Estado</p>
                  </div>
                  <p className="text-sm font-medium mt-2">{formatStatus(data.status)}</p>
                </div>
                <div className="rounded-lg border p-4 bg-muted/20">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Nombre comercial</p>
                  <p className="text-sm font-medium mt-1">{formatValue(data.name)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Teléfono</p>
                      <p className="text-sm font-medium mt-1">{formatValue(data.phone)}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border p-4 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Correo</p>
                      <p className="text-sm font-medium mt-1 break-all">{formatValue(data.email)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Ubicación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4 bg-muted/20">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Dirección</p>
                  <p className="text-sm font-medium mt-1">{formatValue(data.address)}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4 bg-muted/20">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Ciudad</p>
                    <p className="text-sm font-medium mt-1">{formatValue(data.city)}</p>
                  </div>
                  <div className="rounded-lg border p-4 bg-muted/20">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">País</p>
                    <p className="text-sm font-medium mt-1">{formatValue(data.country)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-primary" />
                Auditoría
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-lg border p-4 bg-muted/20">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Creado por</p>
                <div className="flex items-center gap-2 mt-2">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{formatValue(data.created_by_name)}</p>
                    <p className="text-xs text-muted-foreground">ID {formatValue(data.created_by)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4 bg-muted/20">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Actualizado por</p>
                <div className="flex items-center gap-2 mt-2">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{formatValue(data.updated_by_name)}</p>
                    <p className="text-xs text-muted-foreground">ID {formatValue(data.updated_by)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4 bg-muted/20">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Fecha de creación</p>
                <p className="text-sm font-medium mt-2">{formatDate(data.created_at)}</p>
              </div>
              <div className="rounded-lg border p-4 bg-muted/20">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Última actualización</p>
                <p className="text-sm font-medium mt-2">{formatDate(data.updated_at)}</p>
              </div>
            </CardContent>
          </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="branches" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Sucursales
                </CardTitle>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8 sm:w-64"
                      value={branchSearch}
                      onChange={(event) => setBranchSearch(event.target.value)}
                      placeholder="Buscar"
                    />
                  </div>
                  <Select
                    value={branchStatusFilter}
                    onValueChange={(value) => setBranchStatusFilter(value as BranchStatus | "all")}
                  >
                    <SelectTrigger className="sm:w-40">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="gap-2" onClick={openCreateBranchForm} disabled={pharmacyId === null}>
                    <Plus className="h-4 w-4" />
                    Nueva sucursal
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!canListBranches ? (
                <div className="p-6 text-sm text-muted-foreground">El usuario autenticado no tiene farmacia asignada.</div>
              ) : branchesQuery.isLoading ? (
                <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando sucursales...
                </div>
              ) : branchesQuery.isError ? (
                <div className="p-6 text-sm text-destructive">
                  {branchesQuery.error instanceof Error ? branchesQuery.error.message : "Ocurrió un error al consultar sucursales."}
                </div>
              ) : branchesQuery.data?.items.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No hay sucursales registradas con los filtros actuales.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sucursal</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="hidden lg:table-cell">Actualizada</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branchesQuery.data?.items.map((branch) => (
                      <TableRow key={branch.id}>
                        <TableCell>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-sm">{branch.name}</p>
                              {isMainBranch(branch.is_main) && (
                                <Badge variant="outline" className="text-[10px]">
                                  Principal
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {branch.code || "Sin código"} · ID {branch.id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm break-all">{branch.email || "Sin correo"}</p>
                          <p className="text-xs text-muted-foreground">{branch.phone || "Sin teléfono"}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{branch.city || "Sin ciudad"}</p>
                          <p className="text-xs text-muted-foreground">{branch.address || "Sin dirección"}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={branch.status === "active" ? "outline" : "secondary"}
                            className={branch.status === "active" ? "badge-active text-[10px]" : "text-[10px]"}
                          >
                            {branch.status === "active" ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {formatDate(branch.updated_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditBranch(branch)}>
                            <Edit2 className="h-3.5 w-3.5" />
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
      </Tabs>

      <Dialog open={isBranchFormOpen} onOpenChange={setIsBranchFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{branchFormMode === "create" ? "Nueva sucursal" : "Editar sucursal"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBranchSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {branchFormMode === "edit" && (
                <div className="space-y-2">
                  <Label htmlFor="branch-id">ID de sucursal</Label>
                  <Input id="branch-id" value={branchForm.id} disabled />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="branch-name">Nombre</Label>
                <Input
                  id="branch-name"
                  value={branchForm.name}
                  onChange={(event) => handleBranchChange("name", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-code">Código</Label>
                <Input
                  id="branch-code"
                  value={branchForm.code}
                  onChange={(event) => handleBranchChange("code", event.target.value)}
                  placeholder="SUC-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-phone">Teléfono</Label>
                <Input
                  id="branch-phone"
                  value={branchForm.phone}
                  onChange={(event) => handleBranchChange("phone", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-email">Correo</Label>
                <Input
                  id="branch-email"
                  type="email"
                  value={branchForm.email}
                  onChange={(event) => handleBranchChange("email", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-city">Ciudad</Label>
                <Input
                  id="branch-city"
                  value={branchForm.city}
                  onChange={(event) => handleBranchChange("city", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={branchForm.status} onValueChange={(value) => handleBranchChange("status", value as BranchStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="branch-address">Dirección</Label>
                <Textarea
                  id="branch-address"
                  value={branchForm.address}
                  onChange={(event) => handleBranchChange("address", event.target.value)}
                />
              </div>
              <div className="md:col-span-2 flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="branch-is-main" className="font-medium">
                  Sucursal principal
                </Label>
                <Switch
                  id="branch-is-main"
                  checked={branchForm.is_main}
                  onCheckedChange={(checked) => handleBranchChange("is_main", checked)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsBranchFormOpen(false)} disabled={isBranchSaving}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2" disabled={isBranchSaving}>
                {isBranchSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : branchFormMode === "create" ? (
                  <>
                    <Plus className="h-4 w-4" />
                    Crear sucursal
                  </>
                ) : (
                  <>
                    <GitBranch className="h-4 w-4" />
                    Guardar cambios
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

export default Pharmacy;
