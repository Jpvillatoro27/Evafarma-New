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
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener clientes:', error)
      throw error
    }
  },

  async getUltimoCodigoPorDepartamento(departamento: string, codigoISO: string) {
    try {
      // Consulta específica que solo selecciona el código
      const { data, error } = await supabase
        .from('clientes')
        .select('codigo')
        .like('codigo', `${codigoISO}%`)
        .order('codigo', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      
      if (!data) {
        return `${codigoISO}0001` // Primer cliente para este departamento
      }

      const ultimoCodigo = data.codigo
      const numeroActual = parseInt(ultimoCodigo.slice(2))
      const siguienteNumero = (numeroActual + 1).toString().padStart(4, '0')
      return `${codigoISO}${siguienteNumero}`
    } catch (error) {
      console.error('Error al obtener último código:', error)
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
    Departamento: string
    latitud?: number
    longitud?: number
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
    latitud?: number
    longitud?: number
    saldo_pendiente?: number
    propietario?: string
    nit?: string
    Departamento?: string
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
  },

  async actualizarSaldo(id: string, monto: number) {
    try {
      const { data: cliente, error: selectError } = await supabase
        .from('clientes')
        .select('saldo_pendiente')
        .eq('id', id)
        .single()

      if (selectError) throw selectError

      const nuevoSaldo = (cliente.saldo_pendiente || 0) + monto

      const { data, error: updateError } = await supabase
        .from('clientes')
        .update({ saldo_pendiente: nuevoSaldo })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      return data
    } catch (error) {
      console.error('Error al actualizar saldo:', error)
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
          Estado,
          created_at,
          venta_id,
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
      // Sumar un día a la fecha
      const fechaOriginal = new Date(cobroData.fecha)
      fechaOriginal.setDate(fechaOriginal.getDate() + 1)
      const fechaAjustada = fechaOriginal.toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('cobros')
        .insert([{ ...cobroData, fecha: fechaAjustada, Estado: 'Pendiente' }])
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
  },

  async confirmarCobro(id: string) {
    try {
      const { data, error } = await supabase
        .from('cobros')
        .update({ Estado: 'Confirmado' })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error al confirmar cobro:', error)
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
  async getUltimoCodigoVenta() {
    try {
      const { data, error } = await supabase
        .from('ventas_mensuales')
        .select('codigo')
        .order('codigo', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error al obtener último código:', error)
        throw error
      }

      if (!data) {
        return 'V00000001'
      }

      // Extraer el número del código (V00000001 -> 1)
      const numeroActual = parseInt(data.codigo.replace('V', ''))
      const siguienteNumero = numeroActual + 1
      
      // Formatear el nuevo código con 8 dígitos
      return `V${siguienteNumero.toString().padStart(8, '0')}`
    } catch (error) {
      console.error('Error al generar código de venta:', error)
      throw error
    }
  },

  async getVentas() {
    try {
      // Obtener el usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      // Obtener el rol del usuario
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user?.id)
        .single()

      if (usuarioError) throw usuarioError

      // Construir la consulta base
      let query = supabase
        .from('ventas_mensuales')
        .select(`
          id,
          codigo,
          fecha,
          cliente_id,
          visitador,
          total,
          created_at,
          estado,
          rastreo,
          saldo_venta,
          comentario,
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
          productos:productos_venta!productos_venta_venta_id_fkey (
            id,
            nombre,
            cantidad,
            precio_unitario,
            total
          )
        `)

      // Si es visitador, filtrar solo sus ventas
      if (usuarioData.rol === 'visitador') {
        query = query.eq('visitador', user?.id)
      }

      // Ordenar por fecha de creación
      const { data, error } = await query.order('created_at', { ascending: false })

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
    comentario?: string
    productos: Array<{
      nombre: string
      cantidad: number
      precio_unitario: number
      total: number
    }>
  }) {
    try {
      // Obtener el código
      const codigo = await this.getUltimoCodigoVenta()
      // Sumar un día a la fecha (formato DD/MM/AAAA)
      let fechaOriginal: Date
      if (/\d{2}\/\d{2}\/\d{4}/.test(ventaData.fecha)) {
        const [dia, mes, anio] = ventaData.fecha.split('/')
        fechaOriginal = new Date(Number(anio), Number(mes) - 1, Number(dia))
      } else {
        fechaOriginal = new Date(ventaData.fecha)
      }
      fechaOriginal.setDate(fechaOriginal.getDate() + 1)
      const fechaAjustada = fechaOriginal.toISOString().split('T')[0]

      // Validación de duplicados: buscar ventas del mismo cliente, en un rango de 5 minutos y mismos productos
      const ahora = new Date()
      const cincoMinAntes = new Date(ahora.getTime() - 5 * 60 * 1000)
      const cincoMinDespues = new Date(ahora.getTime() + 5 * 60 * 1000)

      // Buscar ventas del mismo cliente y created_at en el rango de 5 minutos
      const { data: ventasSimilares, error: errorBusqueda } = await supabase
        .from('ventas_mensuales')
        .select('id, created_at, cliente_id')
        .eq('cliente_id', ventaData.cliente_id)
        .gte('created_at', cincoMinAntes.toISOString())
        .lte('created_at', cincoMinDespues.toISOString())

      if (errorBusqueda) throw errorBusqueda

      if (ventasSimilares && ventasSimilares.length > 0) {
        for (const venta of ventasSimilares) {
          const { data: productosVenta, error: errorProd } = await supabase
            .from('productos_venta')
            .select('nombre, cantidad, precio_unitario')
            .eq('venta_id', venta.id)

          if (errorProd) continue

          const productosA = [...ventaData.productos].sort((a, b) => a.nombre.localeCompare(b.nombre))
          const productosB = [...(productosVenta || [])].sort((a, b) => a.nombre.localeCompare(b.nombre))
          const iguales = productosA.length === productosB.length && productosA.every((p, i) =>
            p.nombre === productosB[i].nombre &&
            p.cantidad === productosB[i].cantidad &&
            p.precio_unitario === productosB[i].precio_unitario
          )
          if (iguales) {
            throw new Error('Ya existe una venta igual creada recientemente. No se creará otra vez. (Si es una venta nueva por favor espere 5 minutos e intente de nuevo)')
          }
        }
      }

      // 1. Crear la venta
      const { data: venta, error: ventaError } = await supabase
        .from('ventas_mensuales')
        .insert([{
          codigo,
          fecha: fechaAjustada,
          cliente_id: ventaData.cliente_id,
          visitador: ventaData.visitador,
          total: ventaData.total,
          saldo_venta: ventaData.total,
          estado: 'pendiente', // Estado por defecto
          comentario: ventaData.comentario || null
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
      console.log('Iniciando registro para:', email)
      
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
        throw new Error(`Error en autenticación: ${authError.message}`)
      }

      if (!authData?.user) {
        console.error('No se pudo crear el usuario en auth')
        throw new Error('No se pudo crear el usuario en el sistema de autenticación')
      }

      console.log('Usuario creado en auth:', authData.user.id)

      // 2. Crear en la tabla usuarios
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
        // Si hay error al crear en la base de datos, eliminamos el usuario de auth
        await supabase.auth.signOut()
        throw new Error(`Error al crear el usuario en la base de datos: ${dbError.message}`)
      }

      console.log('Usuario creado exitosamente en la base de datos')
      return {
        success: true,
        user: authData.user
      }
    } catch (error) {
      console.error('Error completo en el registro:', error)
      if (error instanceof Error) {
        throw new Error(`Error al registrar: ${error.message}`)
      }
      throw new Error('Error desconocido al registrar usuario')
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
  },

  async getVisitadores() {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, email, rol, giras')
        .eq('rol', 'visitador')
        .order('nombre')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener visitadores:', error)
      throw error
    }
  },

  async updateUsuario(id: string, data: { giras?: string }) {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update(data)
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error al actualizar usuario:', error)
      throw error
    }
  },

  async getUsuarios() {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, email, rol')
        .order('nombre')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error al obtener usuarios:', error)
      throw error
    }
  }
} 