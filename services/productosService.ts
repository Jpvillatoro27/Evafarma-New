import { supabase } from '@/lib/supabase'
import { Producto, HistorialStock, PedidoInterno } from '@/types'

export const productosService = {
  async getUltimoCodigo() {
    try {
      // Consulta específica que solo selecciona el código
      const { data, error } = await supabase
        .from('productos')
        .select('codigo')
        .like('codigo', 'P%')
        .order('codigo', { ascending: false })
        .limit(10) // Aumentamos el límite para ver más códigos

      if (error) throw error
      
      console.log('Códigos encontrados:', data)
      
      if (!data || data.length === 0) {
        return 'P0001' // Primer producto
      }

      // Encontrar el número más alto
      let maxNumero = 0
      for (const item of data) {
        const numeros = item.codigo.replace(/[^0-9]/g, '')
        const numero = parseInt(numeros)
        if (!isNaN(numero) && numero > maxNumero) {
          maxNumero = numero
        }
      }

      // Generar el siguiente número
      const siguienteNumero = (maxNumero + 1).toString().padStart(4, '0')
      const nuevoCodigo = `P${siguienteNumero}`
      
      console.log('Nuevo código generado:', nuevoCodigo)
      return nuevoCodigo
    } catch (error) {
      console.error('Error al obtener último código:', error)
      return 'P0001' // En caso de error, devolver el primer código
    }
  },

  async getProductos() {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) throw error
    return data as Producto[]
  },

  async getProducto(id: string) {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Producto
  },

  async createProducto(producto: Omit<Producto, 'id' | 'codigo'>) {
    try {
      // Obtener el código
      const codigo = await this.getUltimoCodigo()
      
      // Preparar los datos del producto con solo los campos necesarios
      const productoData = {
        codigo,
        nombre: producto.nombre,
        costo_produccion: producto.costo_produccion,
        precio_venta: producto.precio_venta,
        stock: producto.stock,
        stock_minimo: producto.stock_minimo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Insertar el producto
      const { data, error } = await supabase
        .from('productos')
        .insert([productoData])
        .select()
        .single()

      if (error) {
        console.error('Error al crear producto:', error)
        throw error
      }

      return data as Producto
    } catch (error) {
      console.error('Error al crear producto:', error)
      throw error
    }
  },

  async updateProducto(id: string, producto: Partial<Producto>) {
    const { data, error } = await supabase
      .from('productos')
      .update(producto)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Producto
  },

  async deleteProducto(id: string) {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getHistorialStock(productoId: string) {
    const { data, error } = await supabase
      .from('historial_stock')
      .select(`
        *,
        productos (
          codigo,
          nombre
        )
      `)
      .eq('producto_id', productoId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as (HistorialStock & { productos: { codigo: string; nombre: string } })[]
  },

  async createPedidoInterno(pedido: Omit<PedidoInterno, 'id' | 'fecha_solicitud' | 'estado'>) {
    const { data, error } = await supabase
      .from('pedidos_internos')
      .insert([{ ...pedido, estado: 'PENDIENTE' }])
      .select()
      .single()

    if (error) throw error
    return data as PedidoInterno
  },

  async getPedidosInternos() {
    const { data, error } = await supabase
      .from('pedidos_internos')
      .select(`
        *,
        productos (
          codigo,
          nombre
        ),
        solicitante:usuarios!pedidos_internos_solicitante_id_fkey (
          nombre
        ),
        aprobador:usuarios!pedidos_internos_aprobador_id_fkey (
          nombre
        )
      `)
      .order('fecha_solicitud', { ascending: false })

    if (error) throw error
    return data as (PedidoInterno & {
      productos: { codigo: string; nombre: string }
      solicitante: { nombre: string }
      aprobador: { nombre: string } | null
    })[]
  },

  async updateEstadoPedido(id: string, estado: PedidoInterno['estado'], aprobadorId: string) {
    const { data, error } = await supabase
      .from('pedidos_internos')
      .update({
        estado,
        aprobador_id: aprobadorId,
        fecha_aprobacion: estado === 'COMPLETADO' ? new Date().toISOString() : null,
        fecha_completado: estado === 'COMPLETADO' ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as PedidoInterno
  },

  async ajustarStock(id: string, cantidad: number, tipo: 'entrada' | 'salida') {
    try {
      // 1. Obtener el producto actual
      const { data: producto, error: errorProducto } = await supabase
        .from('productos')
        .select('*')
        .eq('id', id)
        .single()

      if (errorProducto) throw errorProducto
      if (!producto) throw new Error('Producto no encontrado')
      
      // 2. Calcular el nuevo stock
      const nuevoStock = tipo === 'entrada' 
        ? producto.stock + cantidad 
        : producto.stock - cantidad

      if (nuevoStock < 0) {
        throw new Error('Stock insuficiente')
      }

      // 3. Actualizar el stock del producto
      const { error: errorUpdate } = await supabase
        .from('productos')
        .update({ stock: nuevoStock })
        .eq('id', id)

      if (errorUpdate) throw errorUpdate

      return { stock: nuevoStock }
    } catch (error) {
      console.error('Error al ajustar stock:', error)
      if (error instanceof Error) {
        throw new Error(`Error al ajustar stock: ${error.message}`)
      }
      throw error
    }
  },

  async registrarHistorialStock(historial: Omit<HistorialStock, 'id'>) {
    const { data, error } = await supabase
      .from('historial_stock')
      .insert(historial)
      .select()
    if (error) throw error
    return data
  }
} 