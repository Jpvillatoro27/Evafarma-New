export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string
          codigo: string
          nombre: string
          direccion: string | null
          telefono: string | null
          nit: string | null
          propietario: string | null
          saldo_pendiente: number
          created_at: string
          Departamento: string | null
        }
        Insert: {
          id?: string
          codigo: string
          nombre: string
          direccion?: string | null
          telefono?: string | null
          nit?: string | null
          propietario?: string | null
          saldo_pendiente: number
          created_at?: string
          Departamento?: string | null
        }
        Update: {
          id?: string
          codigo?: string
          nombre?: string
          direccion?: string | null
          telefono?: string | null
          nit?: string | null
          propietario?: string | null
          saldo_pendiente?: number
          created_at?: string
          Departamento?: string | null
        }
      }
      ventas_mensuales: {
        Row: {
          id: string
          codigo: string
          cliente_id: string
          total: number
          fecha: string
          created_at: string
          visitador: string
          rastreo: string | null
          estado: string | null
          saldo_venta: number | null
          comentario: string | null
        }
        Insert: {
          id?: string
          codigo: string
          cliente_id: string
          total: number
          fecha: string
          created_at?: string
          visitador: string
          rastreo?: string | null
          estado?: string | null
          saldo_venta?: number | null
          comentario?: string | null
        }
        Update: {
          id?: string
          codigo?: string
          cliente_id?: string
          total?: number
          fecha?: string
          created_at?: string
          visitador?: string
          rastreo?: string | null
          estado?: string | null
          saldo_venta?: number | null
          comentario?: string | null
        }
      }
      usuarios: {
        Row: {
          id: string
          email: string | null
          nombre: string
          rol: string
          created_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          nombre: string
          rol: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          nombre?: string
          rol?: string
          created_at?: string
        }
      }
      cobros: {
        Row: {
          id: string
          venta_id: string
          total: number
          fecha: string
          created_at: string
          visitador: string
          Estado: string | null
        }
        Insert: {
          id?: string
          venta_id: string
          total: number
          fecha: string
          created_at?: string
          visitador: string
          Estado?: string | null
        }
        Update: {
          id?: string
          venta_id?: string
          total?: number
          fecha?: string
          created_at?: string
          visitador?: string
          Estado?: string | null
        }
      }
      productos: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          precio: number
          stock: number
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          precio: number
          stock: number
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          precio?: number
          stock?: number
          created_at?: string
        }
      }
      productos_venta: {
        Row: {
          id: string
          venta_id: string
          nombre: string
          cantidad: number
          precio_unitario: number
          total: number
        }
        Insert: {
          id?: string
          venta_id: string
          nombre: string
          cantidad: number
          precio_unitario: number
          total: number
        }
        Update: {
          id?: string
          venta_id?: string
          nombre?: string
          cantidad?: number
          precio_unitario?: number
          total?: number
        }
      }
      comisiones: {
        Row: {
          id: string
          visitador: string
          venta_id: string
          monto: number
          porcentaje: number
          dias_venta: number
          fecha_cobro: string
          estado: string
          created_at: string
        }
        Insert: {
          id?: string
          visitador: string
          venta_id: string
          monto: number
          porcentaje: number
          dias_venta: number
          fecha_cobro: string
          estado?: string
          created_at?: string
        }
        Update: {
          id?: string
          visitador?: string
          venta_id?: string
          monto?: number
          porcentaje?: number
          dias_venta?: number
          fecha_cobro?: string
          estado?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}