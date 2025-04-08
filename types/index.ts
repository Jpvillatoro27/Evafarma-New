export interface Cliente {
  id: string
  codigo: string
  nombre: string
  direccion: string
  telefono: string
  nit: string
  visitador: string
  propietario: string
  saldo_pendiente: number
}

export interface Cobro {
  id: string
  numero: string
  fecha: string
  cod_farmacia?: string
  cliente_id: string
  descripcion?: string
  total: number
  visitador: string
  fecha_cheque?: string
  banco?: string
  numero_cheque?: string
  valor_cheque?: number
  otros?: string
  otros2?: string
  otros3?: string
  created_at: string
  Estado: string
  clientes: {
    id: string
    codigo: string
    nombre: string
    direccion: string
    telefono: string
    nit?: string
    visitador: string
    propietario?: string
    saldo_pendiente: number
  }
}

export interface Abono {
  id: string
  cobro_id: string
  fecha: string
  efectivo_cheque: 'EFECTIVO' | 'CHEQUE'
  valor: number
  saldo: number
  numero_recibo: string
}

export interface Recibo {
  id: string
  numero: string
  cliente_id: string
  numero_recibo: string
  visitador: string
  fecha: string
  efectivo_cheque: 'EFECTIVO' | 'CHEQUE'
  valor: number
  total: number
  descripcion: string
}

export interface VentaMensual {
  id: string
  codigo: string
  fecha: string
  cliente_id: string
  visitador: string
  total: number
  productos: ProductoVenta[]
}

export interface ProductoVenta {
  id: string
  venta_id: string
  nombre: string
  cantidad: number
  precio_unitario: number
  total: number
}

export interface Usuario {
  id: string
  email: string
  nombre: string
  rol: 'admin' | 'visitador'
  created_at: string
  updated_at: string
}

export interface Producto {
  id: string
  codigo: string
  nombre: string
  costo_produccion: number | null
  precio_venta: number
  stock: number
  stock_minimo: number
  alerta_stock: boolean
  created_at: string
  updated_at: string
}

export interface HistorialStock {
  id: string
  producto_id: string
  cantidad_anterior: number
  cantidad_nueva: number
  tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE'
  motivo: string | null
  usuario_id: string
  created_at: string
}

export interface PedidoInterno {
  id: string
  producto_id: string
  cantidad_solicitada: number
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'COMPLETADO'
  solicitante_id: string
  aprobador_id: string | null
  fecha_solicitud: string
  fecha_aprobacion: string | null
  fecha_completado: string | null
} 