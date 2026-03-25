// Mock data for the pharmacy system

export interface Product {
  id: string;
  nombreComercial: string;
  nombreGenerico: string;
  codigoInterno: string;
  codigoBarras: string;
  categoria: string;
  laboratorio: string;
  presentacion: string;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  fechaVencimiento: string;
  lote: string;
  requiereReceta: boolean;
  estado: "activo" | "inactivo";
}

export interface Client {
  id: string;
  nombre: string;
  telefono: string;
  correo: string;
  direccion: string;
  observaciones: string;
  totalCompras: number;
}

export interface Sale {
  id: string;
  fecha: string;
  cliente: string;
  productos: { nombre: string; cantidad: number; precio: number }[];
  subtotal: number;
  impuesto: number;
  total: number;
  metodoPago: "efectivo" | "tarjeta" | "transferencia";
  vendedor: string;
}

export interface Supplier {
  id: string;
  nombre: string;
  contacto: string;
  telefono: string;
  correo: string;
  direccion: string;
}

export const products: Product[] = [
  { id: "P001", nombreComercial: "Paracetamol 500mg", nombreGenerico: "Acetaminofén", codigoInterno: "MED-001", codigoBarras: "7501234567890", categoria: "Analgésicos", laboratorio: "Bayer", presentacion: "Caja x 20 tabletas", precioCompra: 2.50, precioVenta: 4.50, stock: 150, stockMinimo: 30, fechaVencimiento: "2026-08-15", lote: "L2024-A1", requiereReceta: false, estado: "activo" },
  { id: "P002", nombreComercial: "Amoxicilina 500mg", nombreGenerico: "Amoxicilina", codigoInterno: "MED-002", codigoBarras: "7501234567891", categoria: "Antibióticos", laboratorio: "Pfizer", presentacion: "Caja x 21 cápsulas", precioCompra: 5.00, precioVenta: 9.50, stock: 8, stockMinimo: 15, fechaVencimiento: "2025-12-20", lote: "L2024-B2", requiereReceta: true, estado: "activo" },
  { id: "P003", nombreComercial: "Omeprazol 20mg", nombreGenerico: "Omeprazol", codigoInterno: "MED-003", codigoBarras: "7501234567892", categoria: "Gastrointestinal", laboratorio: "AstraZeneca", presentacion: "Caja x 14 cápsulas", precioCompra: 3.00, precioVenta: 6.00, stock: 45, stockMinimo: 20, fechaVencimiento: "2026-03-10", lote: "L2024-C3", requiereReceta: false, estado: "activo" },
  { id: "P004", nombreComercial: "Losartán 50mg", nombreGenerico: "Losartán potásico", codigoInterno: "MED-004", codigoBarras: "7501234567893", categoria: "Cardiovascular", laboratorio: "MSD", presentacion: "Caja x 30 tabletas", precioCompra: 4.50, precioVenta: 8.50, stock: 5, stockMinimo: 10, fechaVencimiento: "2025-06-30", lote: "L2024-D4", requiereReceta: true, estado: "activo" },
  { id: "P005", nombreComercial: "Loratadina 10mg", nombreGenerico: "Loratadina", codigoInterno: "MED-005", codigoBarras: "7501234567894", categoria: "Antialérgicos", laboratorio: "Schering", presentacion: "Caja x 10 tabletas", precioCompra: 1.80, precioVenta: 3.50, stock: 60, stockMinimo: 15, fechaVencimiento: "2027-01-15", lote: "L2024-E5", requiereReceta: false, estado: "activo" },
  { id: "P006", nombreComercial: "Metformina 850mg", nombreGenerico: "Metformina", codigoInterno: "MED-006", codigoBarras: "7501234567895", categoria: "Antidiabéticos", laboratorio: "Merck", presentacion: "Caja x 30 tabletas", precioCompra: 3.20, precioVenta: 6.80, stock: 25, stockMinimo: 10, fechaVencimiento: "2026-09-01", lote: "L2024-F6", requiereReceta: true, estado: "activo" },
  { id: "P007", nombreComercial: "Ibuprofeno 400mg", nombreGenerico: "Ibuprofeno", codigoInterno: "MED-007", codigoBarras: "7501234567896", categoria: "Analgésicos", laboratorio: "Abbott", presentacion: "Caja x 20 tabletas", precioCompra: 2.00, precioVenta: 4.00, stock: 3, stockMinimo: 20, fechaVencimiento: "2025-04-10", lote: "L2024-G7", requiereReceta: false, estado: "activo" },
  { id: "P008", nombreComercial: "Cetirizina 10mg", nombreGenerico: "Cetirizina", codigoInterno: "MED-008", codigoBarras: "7501234567897", categoria: "Antialérgicos", laboratorio: "UCB", presentacion: "Caja x 10 tabletas", precioCompra: 1.50, precioVenta: 3.00, stock: 40, stockMinimo: 10, fechaVencimiento: "2026-11-20", lote: "L2024-H8", requiereReceta: false, estado: "activo" },
  { id: "P009", nombreComercial: "Diclofenaco 50mg", nombreGenerico: "Diclofenaco sódico", codigoInterno: "MED-009", codigoBarras: "7501234567898", categoria: "Antiinflamatorios", laboratorio: "Novartis", presentacion: "Caja x 20 tabletas", precioCompra: 2.30, precioVenta: 4.80, stock: 0, stockMinimo: 15, fechaVencimiento: "2025-07-25", lote: "L2024-I9", requiereReceta: false, estado: "inactivo" },
  { id: "P010", nombreComercial: "Vitamina C 1000mg", nombreGenerico: "Ácido ascórbico", codigoInterno: "MED-010", codigoBarras: "7501234567899", categoria: "Vitaminas", laboratorio: "Bayer", presentacion: "Tubo x 10 efervescentes", precioCompra: 3.50, precioVenta: 7.00, stock: 80, stockMinimo: 20, fechaVencimiento: "2027-05-30", lote: "L2024-J10", requiereReceta: false, estado: "activo" },
];

export const clients: Client[] = [
  { id: "C001", nombre: "María García López", telefono: "555-0101", correo: "maria.garcia@email.com", direccion: "Av. Principal 123", observaciones: "Paciente diabética", totalCompras: 12 },
  { id: "C002", nombre: "Carlos Rodríguez Pérez", telefono: "555-0102", correo: "carlos.rod@email.com", direccion: "Calle 5 Norte #456", observaciones: "", totalCompras: 8 },
  { id: "C003", nombre: "Ana Martínez Silva", telefono: "555-0103", correo: "ana.mtz@email.com", direccion: "Col. Centro, Av. Juárez 789", observaciones: "Alérgica a penicilina", totalCompras: 23 },
  { id: "C004", nombre: "José Hernández Ruiz", telefono: "555-0104", correo: "jose.hdz@email.com", direccion: "Fracc. Las Flores #12", observaciones: "", totalCompras: 5 },
  { id: "C005", nombre: "Laura Sánchez Mora", telefono: "555-0105", correo: "laura.sm@email.com", direccion: "Blvd. Independencia 321", observaciones: "Hipertensa", totalCompras: 15 },
];

export const suppliers: Supplier[] = [
  { id: "S001", nombre: "Distribuidora Farmacéutica del Norte", contacto: "Roberto Vega", telefono: "555-2001", correo: "ventas@difarnorte.com", direccion: "Zona Industrial #100" },
  { id: "S002", nombre: "MedSupply Internacional", contacto: "Patricia Luna", telefono: "555-2002", correo: "patricia@medsupply.com", direccion: "Av. Comercio 500" },
  { id: "S003", nombre: "Laboratorios Unidos S.A.", contacto: "Fernando Ríos", telefono: "555-2003", correo: "frios@labunidos.com", direccion: "Parque Industrial Km 5" },
];

export const recentSales: Sale[] = [
  { id: "V001", fecha: "2026-03-25 09:15", cliente: "María García López", productos: [{ nombre: "Metformina 850mg", cantidad: 2, precio: 6.80 }, { nombre: "Losartán 50mg", cantidad: 1, precio: 8.50 }], subtotal: 22.10, impuesto: 3.54, total: 25.64, metodoPago: "efectivo", vendedor: "Ana Vendedor" },
  { id: "V002", fecha: "2026-03-25 10:30", cliente: "Carlos Rodríguez Pérez", productos: [{ nombre: "Paracetamol 500mg", cantidad: 1, precio: 4.50 }], subtotal: 4.50, impuesto: 0.72, total: 5.22, metodoPago: "tarjeta", vendedor: "Ana Vendedor" },
  { id: "V003", fecha: "2026-03-25 11:45", cliente: "Ana Martínez Silva", productos: [{ nombre: "Loratadina 10mg", cantidad: 2, precio: 3.50 }, { nombre: "Vitamina C 1000mg", cantidad: 3, precio: 7.00 }], subtotal: 28.00, impuesto: 4.48, total: 32.48, metodoPago: "transferencia", vendedor: "Admin" },
  { id: "V004", fecha: "2026-03-24 14:20", cliente: "José Hernández Ruiz", productos: [{ nombre: "Ibuprofeno 400mg", cantidad: 1, precio: 4.00 }, { nombre: "Omeprazol 20mg", cantidad: 1, precio: 6.00 }], subtotal: 10.00, impuesto: 1.60, total: 11.60, metodoPago: "efectivo", vendedor: "Ana Vendedor" },
  { id: "V005", fecha: "2026-03-24 16:50", cliente: "Laura Sánchez Mora", productos: [{ nombre: "Losartán 50mg", cantidad: 2, precio: 8.50 }, { nombre: "Cetirizina 10mg", cantidad: 1, precio: 3.00 }], subtotal: 20.00, impuesto: 3.20, total: 23.20, metodoPago: "tarjeta", vendedor: "Admin" },
];

export const dailySalesData = [
  { dia: "Lun", ventas: 450 },
  { dia: "Mar", ventas: 380 },
  { dia: "Mié", ventas: 520 },
  { dia: "Jue", ventas: 410 },
  { dia: "Vie", ventas: 680 },
  { dia: "Sáb", ventas: 750 },
  { dia: "Dom", ventas: 320 },
];

export const topProductsData = [
  { nombre: "Paracetamol", ventas: 85 },
  { nombre: "Vitamina C", ventas: 72 },
  { nombre: "Omeprazol", ventas: 58 },
  { nombre: "Loratadina", ventas: 45 },
  { nombre: "Amoxicilina", ventas: 38 },
];

export const categorySalesData = [
  { categoria: "Analgésicos", ventas: 320 },
  { categoria: "Vitaminas", ventas: 280 },
  { categoria: "Antibióticos", ventas: 190 },
  { categoria: "Gastrointestinal", ventas: 150 },
  { categoria: "Antialérgicos", ventas: 120 },
];
