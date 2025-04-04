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
  cod_farmacia: string
  cliente_id: string
  descripcion: string
  total: number
  visitador: string
  fecha_cheque?: string
  banco?: string
  numero_cheque?: string
  valor_cheque?: number
  otros?: string
  otros2?: string
  otros3?: string
  abonos: Abono[]
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
  rol: 'admin' | 'visitador'
  nombre: string
} 