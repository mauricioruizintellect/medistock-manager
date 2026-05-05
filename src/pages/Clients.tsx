import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Loader2, Mail, Phone, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  createClient,
  getClients,
  updateClient,
  type Client,
  type ClientStatus,
  type CreateClientPayload,
  type UpdateClientPayload,
} from "@/services/clients.service";

interface ClientFormState {
  first_name: string;
  last_name: string;
  document_number: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  status: ClientStatus;
}

const emptyClientForm = (): ClientFormState => ({
  first_name: "",
  last_name: "",
  document_number: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  status: "active",
});

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "—";

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const Clients = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formState, setFormState] = useState<ClientFormState>(emptyClientForm);
  const deferredSearch = useDeferredValue(search.trim());
  const pharmacyId = user?.pharmacy_id ?? null;

  const clientsQuery = useQuery({
    queryKey: ["clients", { pharmacyId, search: deferredSearch }],
    queryFn: () =>
      getClients({
        ...(pharmacyId !== null ? { pharmacy_id: pharmacyId } : {}),
        search: deferredSearch || undefined,
        limit: 100,
      }),
    enabled: pharmacyId !== null,
  });

  const createClientMutation = useMutation({
    mutationFn: (payload: CreateClientPayload) => createClient(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDialogOpen(false);
      setEditingClient(null);
      setFormState(emptyClientForm());
      toast({
        title: "Cliente creado",
        description: "El cliente se registró correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "No se pudo crear el cliente",
        description: error instanceof Error ? error.message : "Ocurrió un error al crear el cliente.",
        variant: "destructive",
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ clientId, payload }: { clientId: number; payload: UpdateClientPayload }) =>
      updateClient(clientId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDialogOpen(false);
      setEditingClient(null);
      setFormState(emptyClientForm());
      toast({
        title: "Cliente actualizado",
        description: "Los datos del cliente se actualizaron correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "No se pudo actualizar el cliente",
        description: error instanceof Error ? error.message : "Ocurrió un error al actualizar el cliente.",
        variant: "destructive",
      });
    },
  });

  const isSubmitting = createClientMutation.isPending || updateClientMutation.isPending;
  const clients = clientsQuery.data?.items ?? [];

  const activeClientsCount = useMemo(
    () => clients.filter((client) => client.status === "active").length,
    [clients],
  );

  const openCreateDialog = () => {
    setEditingClient(null);
    setFormState(emptyClientForm());
    setDialogOpen(true);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormState({
      first_name: client.first_name ?? "",
      last_name: client.last_name ?? "",
      document_number: client.document_number ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
      address: client.address ?? "",
      notes: client.notes ?? "",
      status: client.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formState.first_name.trim()) {
      toast({
        title: "Falta el nombre",
        description: "Ingresa al menos el nombre del cliente.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      ...(pharmacyId !== null ? { pharmacy_id: pharmacyId } : {}),
      first_name: formState.first_name.trim(),
      last_name: formState.last_name.trim() || undefined,
      document_number: formState.document_number.trim() || undefined,
      phone: formState.phone.trim() || undefined,
      email: formState.email.trim() || undefined,
      address: formState.address.trim() || undefined,
      notes: formState.notes.trim() || undefined,
      status: formState.status,
    };

    if (editingClient) {
      updateClientMutation.mutate({
        clientId: editingClient.id,
        payload,
      });
      return;
    }

    createClientMutation.mutate(payload);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Clientes / Pacientes</h1>
          <p className="page-description">
            {clientsQuery.data?.total ?? 0} clientes cargados · {activeClientsCount} activos
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(nextOpen) => {
            setDialogOpen(nextOpen);
            if (!nextOpen) {
              setEditingClient(null);
              setFormState(emptyClientForm());
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    placeholder="Nombre del cliente"
                    value={formState.first_name}
                    onChange={(event) => setFormState((current) => ({ ...current, first_name: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Apellido</Label>
                  <Input
                    placeholder="Apellido del cliente"
                    value={formState.last_name}
                    onChange={(event) => setFormState((current) => ({ ...current, last_name: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Documento</Label>
                  <Input
                    placeholder="Cédula o identificación"
                    value={formState.document_number}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, document_number: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={formState.status}
                    onValueChange={(value: ClientStatus) => setFormState((current) => ({ ...current, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    placeholder="0999999999"
                    value={formState.phone}
                    onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Correo</Label>
                  <Input
                    type="email"
                    placeholder="correo@email.com"
                    value={formState.email}
                    onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  placeholder="Dirección"
                  value={formState.address}
                  onChange={(event) => setFormState((current) => ({ ...current, address: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  placeholder="Alergias, condiciones, etc."
                  value={formState.notes}
                  onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingClient ? "Guardar cambios" : "Crear cliente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, documento, teléfono o correo..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {pharmacyId === null ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Tu usuario no tiene farmacia asignada, así que no puede administrar clientes.
          </CardContent>
        </Card>
      ) : null}

      {clientsQuery.isError ? (
        <Card className="border-destructive/40">
          <CardContent className="p-6 text-sm text-destructive">
            {clientsQuery.error instanceof Error
              ? clientsQuery.error.message
              : "No se pudieron cargar los clientes."}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {clientsQuery.isLoading ? (
            <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando clientes...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Contacto</TableHead>
                  <TableHead className="hidden lg:table-cell">Documento</TableHead>
                  <TableHead className="text-center">Compras</TableHead>
                  <TableHead className="hidden md:table-cell">Última compra</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No hay clientes registrados para esta búsqueda.
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{client.full_name}</p>
                          <p className="text-xs text-muted-foreground">{client.status === "active" ? "Activo" : "Inactivo"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {client.phone || "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {client.email || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {client.document_number || "—"}
                      </TableCell>
                      <TableCell className="text-center font-medium">{client.total_purchases}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatDateTime(client.last_purchase_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(client)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Clients;
