'use client'

import { supabase } from './supabase'
import { Cliente, Cobro, Abono, Recibo, VentaMensual, Usuario } from '@/types'

// Servicios de Clientes
export const clientesService = {
  async getClientes() {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener clientes:', error)
      throw error
    }
  },

  async createCliente(cliente: {
    codigo: string
    nombre: string
    direccion?: string
    telefono?: string
    nit?: string
    visitador: string
    propietario?: string
    saldo_pendiente?: number
  }) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert([cliente])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al crear cliente:', error)
      throw error
    }
  },

  async updateCliente(id: string, cliente: {
    nombre?: string
    direccion?: string
    telefono?: string
    email?: string
  }) {
    try {
      console.log('Actualizando cliente:', { id, ...cliente })
      const { data, error } = await supabase
        .from('clientes')
        .update(cliente)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error en la actualización:', error)
        throw error
      }

      console.log('Cliente actualizado:', data)
      return data
    } catch (error) {
      console.error('Error al actualizar cliente:', error)
      throw error
    }
  },

  async deleteCliente(id: string) {
    try {
      console.log('Eliminando cliente:', id)
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error en la eliminación:', error)
        throw error
      }

      console.log('Cliente eliminado')
    } catch (error) {
      console.error('Error al eliminar cliente:', error)
      throw error
    }
  }
}

// Servicios de Cobros
export const cobrosService = {
  async getCobros() {
    try {
      const { data, error } = await supabase
        .from('cobros')
        .select(`
          *,
          clientes:cliente_id (
            id,
            codigo,
            nombre,
            direccion,
            telefono,
            nit,
            propietario,
            saldo_pendiente
          )
        `)
        .order('fecha', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener cobros:', error)
      throw error
    }
  },

  async createCobro(cobroData: {
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
  }) {
    try {
      const { data, error } = await supabase
        .from('cobros')
        .insert([cobroData])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al crear cobro:', error)
      throw error
    }
  },

  async updateCobro(id: string, cobroData: {
    numero?: string
    fecha?: string
    cod_farmacia?: string
    cliente_id?: string
    descripcion?: string
    total?: number
    visitador?: string
    fecha_cheque?: string
    banco?: string
    numero_cheque?: string
    valor_cheque?: number
    otros?: string
    otros2?: string
    otros3?: string
  }) {
    try {
      console.log('Actualizando cobro:', { id, ...cobroData })
      const { data, error } = await supabase
        .from('cobros')
        .update(cobroData)
        .eq('id', id)
        .select(`
          id,
          numero,
          fecha,
          cod_farmacia,
          cliente_id,
          descripcion,
          total,
          visitador,
          fecha_cheque,
          banco,
          numero_cheque,
          valor_cheque,
          otros,
          otros2,
          otros3,
          created_at,
          clientes (
            id,
            codigo,
            nombre,
            direccion,
            telefono,
            nit,
            visitador,
            propietario,
            saldo_pendiente
          )
        `)
        .single()

      if (error) {
        console.error('Error al actualizar cobro:', error)
        throw new Error(error.message)
      }

      console.log('Cobro actualizado:', data)
      return data
    } catch (error) {
      console.error('Error al actualizar cobro:', error)
      throw error
    }
  },

  async deleteCobro(id: string) {
    try {
      console.log('Eliminando cobro:', id)
      const { error } = await supabase
        .from('cobros')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error al eliminar cobro:', error)
        throw new Error(error.message)
      }

      console.log('Cobro eliminado correctamente')
      return true
    } catch (error) {
      console.error('Error al eliminar cobro:', error)
      throw error
    }
  }
}

// Servicios de Recibos
export const recibosService = {
  async getRecibos() {
    try {
      const { data, error } = await supabase
        .from('recibos')
        .select(`
          *,
          clientes:cliente_id (
            id,
            codigo,
            nombre,
            direccion,
            telefono,
            nit,
            propietario,
            saldo_pendiente
          )
        `)
        .order('fecha', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener recibos:', error)
      throw error
    }
  },

  async createRecibo(reciboData: {
    numero: string
    cliente_id: string
    numero_recibo?: string
    visitador: string
    fecha: string
    efectivo_cheque: 'EFECTIVO' | 'CHEQUE'
    valor: number
    total: number
    descripcion?: string
  }) {
    try {
      const { data, error } = await supabase
        .from('recibos')
        .insert([reciboData])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al crear recibo:', error)
      throw error
    }
  }
}

// Servicios de Ventas
export const ventasService = {
  async getVentas() {
    try {
      const { data, error } = await supabase
        .from('ventas_mensuales')
        .select(`
          *,
          clientes:cliente_id (
            id,
            codigo,
            nombre,
            direccion,
            telefono,
            nit,
            propietario,
            saldo_pendiente
          ),
          productos:id (
            id,
            nombre,
            cantidad,
            precio_unitario,
            total
          )
        `)
        .order('fecha', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener ventas:', error)
      throw error
    }
  },

  async createVenta(ventaData: {
    fecha: string
    cliente_id: string
    visitador: string
    total: number
    productos: Array<{
      nombre: string
      cantidad: number
      precio_unitario: number
      total: number
    }>
  }) {
    try {
      // 1. Crear la venta
      const { data: venta, error: ventaError } = await supabase
        .from('ventas_mensuales')
        .insert([{
          fecha: ventaData.fecha,
          cliente_id: ventaData.cliente_id,
          visitador: ventaData.visitador,
          total: ventaData.total
        }])
        .select()
        .single()

      if (ventaError) throw ventaError

      // 2. Crear los productos de la venta
      const productosData = ventaData.productos.map(producto => ({
        ...producto,
        venta_id: venta.id
      }))

      const { error: productosError } = await supabase
        .from('productos_venta')
        .insert(productosData)

      if (productosError) throw productosError

      // 3. Actualizar el saldo pendiente del cliente
      const { data: cliente, error: clienteSelectError } = await supabase
        .from('clientes')
        .select('saldo_pendiente')
        .eq('id', ventaData.cliente_id)
        .single()

      if (clienteSelectError) throw clienteSelectError

      const nuevoSaldo = (cliente.saldo_pendiente || 0) + ventaData.total

      const { error: clienteUpdateError } = await supabase
        .from('clientes')
        .update({ saldo_pendiente: nuevoSaldo })
        .eq('id', ventaData.cliente_id)

      if (clienteUpdateError) throw clienteUpdateError

      return {
        ...venta,
        clientes: {
          ...venta.clientes,
          saldo_pendiente: nuevoSaldo
        }
      }
    } catch (error) {
      console.error('Error al crear venta:', error)
      throw error
    }
  },

  async updateVenta(id: string, venta: {
    monto_total?: number
    fecha_venta?: string
  }) {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .update(venta)
        .eq('id', id)
        .select(`
          *,
          clientes (
            id,
            nombre,
            direccion,
            telefono,
            email
          )
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al actualizar venta:', error)
      throw error
    }
  },

  async deleteVenta(id: string) {
    try {
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error al eliminar venta:', error)
      throw error
    }
  }
}

// Servicios de Usuarios (Cliente)
export const usuariosService = {
  async register(email: string, password: string, nombre: string) {
    try {
      // 1. Registrar en auth.users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
            role: 'visitador'
          }
        }
      })

      if (authError) {
        console.error('Error en auth.signUp:', authError)
        throw new Error('Error al crear la cuenta de usuario')
      }

      if (!authData?.user) {
        throw new Error('No se pudo crear el usuario')
      }

      // 2. Crear en la tabla usuarios
      try {
        const { error: dbError } = await supabase
          .from('usuarios')
          .insert({
            id: authData.user.id,
            email: email,
            nombre: nombre,
            rol: 'visitador',
            created_at: new Date().toISOString()
          })

        if (dbError) {
          console.error('Error al crear usuario en la base de datos:', dbError)
          // Verificar si el error es de recursión de políticas
          if (dbError.message.includes('infinite recursion')) {
            // Si el error es de recursión pero el usuario se creó, continuamos
            console.log('Usuario creado a pesar del error de recursión')
            return authData
          }
          // Para otros tipos de errores, cerramos sesión
          await supabase.auth.signOut()
          throw new Error(`Error al crear el usuario en la base de datos: ${dbError.message}`)
        }

        return authData
      } catch (dbError) {
        // Verificar si el usuario realmente se creó a pesar del error
        const { data: checkUser } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', authData.user.id)
          .single()

        if (checkUser) {
          console.log('Usuario encontrado después del error:', checkUser)
          return authData
        }

        // Si no se encontró el usuario, cerramos sesión y lanzamos el error
        await supabase.auth.signOut()
        throw dbError
      }
    } catch (error) {
      console.error('Error en el registro:', error)
      throw error
    }
  },

  async login(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error en el login:', error)
      if (error instanceof Error && error.message.includes('Invalid login credentials')) {
        throw new Error('Credenciales inválidas. Por favor, verifica tu email y contraseña.')
      }
      throw error
    }
  },

  async getUsuarioActual() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Error al obtener usuario de auth:', authError)
        throw authError
      }

      if (!user) {
        throw new Error('No hay usuario autenticado')
      }

      // Obtener información adicional del usuario desde la tabla usuarios
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single()

      if (usuarioError) {
        console.error('Error al obtener datos del usuario:', usuarioError)
        throw usuarioError
      }

      return {
        id: user.id,
        email: user.email,
        nombre: usuarioData.nombre,
        rol: usuarioData.rol
      }
    } catch (error) {
      console.error('Error al obtener usuario actual:', error)
      throw error
    }
  },

  async logout() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      throw error
    }
  }
} 