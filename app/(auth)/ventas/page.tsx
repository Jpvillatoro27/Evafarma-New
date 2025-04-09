'use client'

import { useEffect, useState } from 'react'
import { ventasService, clientesService, usuariosService } from '@/lib/services'
import { productosService } from '@/services/productosService'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/hooks/useAuth'
import { Producto } from '@/types'
import { PlusIcon, PencilIcon, TruckIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface ProductoVenta {
  id: string
  nombre: string
  cantidad: number
  precio_unitario: number
  total: number
  stock_disponible: number
}

interface Venta {
  id: string
  codigo: string
  cliente_id: string
  total: number
  fecha: string
  created_at: string
  visitador: string
  rastreo?: string
  estado?: string
  clientes: {
    id: string
    nombre: string
    direccion?: string
    telefono?: string
    nit?: string
    saldo_pendiente: number
  }
  productos?: Array<{
    id: string
    nombre: string
    cantidad: number
    precio_unitario: number
    total: number
  }>
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [ventasFiltradas, setVentasFiltradas] = useState<Venta[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [visitadores, setVisitadores] = useState<{ id: string; nombre: string }[]>([])
  const { toast } = useToast()
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    cliente_id: '',
    fecha: new Date().toISOString().split('T')[0],
    productos: [{ id: '', nombre: '', cantidad: 1, precio_unitario: 0, total: 0, stock_disponible: 0 }] as ProductoVenta[],
    total: 0
  })

  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null)
  const [rastreo, setRastreo] = useState('')
  const [isRastreoDialogOpen, setIsRastreoDialogOpen] = useState(false)
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<'pendiente' | 'enviado' | 'completado' | 'anulado'>('pendiente')
  const [isEstadoDialogOpen, setIsEstadoDialogOpen] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

  useEffect(() => {
    loadVentas()
    loadClientes()
    loadProductos()
    loadVisitadores()
  }, [])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setVentasFiltradas(ventas)
      return
    }

    const termino = searchTerm.toLowerCase()
    const filtered = ventas.filter(venta => 
      venta.clientes.nombre.toLowerCase().includes(termino) ||
      new Date(venta.fecha).toLocaleDateString().includes(termino) ||
      venta.total.toString().includes(termino) ||
      venta.productos?.some(producto => 
        producto.nombre.toLowerCase().includes(termino) ||
        producto.cantidad.toString().includes(termino) ||
        producto.precio_unitario.toString().includes(termino)
      )
    )
    setVentasFiltradas(filtered)
  }, [searchTerm, ventas])

  useEffect(() => {
    let filtrados = ventas

    // Aplicar filtro por estado
    if (filtroEstado !== 'todos') {
      filtrados = filtrados.filter(venta => venta.estado === filtroEstado)
    }

    setVentasFiltradas(filtrados)
  }, [ventas, filtroEstado])

  const loadVentas = async () => {
    try {
      const data = await ventasService.getVentas()
      const ventasFormateadas = data.map(venta => {
        const cliente = Array.isArray(venta.clientes) ? venta.clientes[0] : venta.clientes
        return {
          ...venta,
          clientes: {
            id: cliente.id,
            nombre: cliente.nombre,
            direccion: cliente.direccion,
            telefono: cliente.telefono,
            nit: cliente.nit,
            saldo_pendiente: cliente.saldo_pendiente
          },
          productos: venta.productos || []
        } as Venta
      })
      setVentas(ventasFormateadas)
    } catch (error) {
      console.error('Error al cargar ventas:', error)
      setError('Error al cargar las ventas')
    } finally {
      setLoading(false)
    }
  }

  const loadClientes = async () => {
    try {
      const data = await clientesService.getClientes()
      setClientes(data)
    } catch (error) {
      console.error('Error al cargar clientes:', error)
      toast({
        title: 'Error',
        description: 'Error al cargar los clientes',
        variant: 'destructive'
      })
    }
  }

  const loadProductos = async () => {
    try {
      const data = await productosService.getProductos()
      setProductos(data)
    } catch (error) {
      console.error('Error al cargar productos:', error)
      toast({
        title: 'Error',
        description: 'Error al cargar los productos',
        variant: 'destructive'
      })
    }
  }

  const loadVisitadores = async () => {
    try {
      const data = await usuariosService.getVisitadores()
      setVisitadores(data)
    } catch (error) {
      console.error('Error al cargar visitadores:', error)
    }
  }

  const actualizarProducto = (index: number, campo: keyof ProductoVenta, valor: string | number) => {
    const nuevosProductos = [...formData.productos]
    const producto = nuevosProductos[index]

    if (campo === 'id') {
      const productoSeleccionado = productos.find(p => p.id === valor)
      if (productoSeleccionado) {
        producto.id = valor as string
        producto.nombre = productoSeleccionado.nombre
        producto.precio_unitario = productoSeleccionado.precio_venta
        producto.stock_disponible = productoSeleccionado.stock
      }
    } else if (campo === 'cantidad') {
      producto.cantidad = Number(valor)
    }

    producto.total = producto.cantidad * producto.precio_unitario
    
    const nuevoTotal = nuevosProductos.reduce((sum, prod) => sum + prod.total, 0)
    
    setFormData({
      ...formData,
      productos: nuevosProductos,
      total: nuevoTotal
    })
  }

  const agregarProducto = () => {
    setFormData({
      ...formData,
      productos: [...formData.productos, { id: '', nombre: '', cantidad: 1, precio_unitario: 0, total: 0, stock_disponible: 0 }]
    })
  }

  const eliminarProducto = (index: number) => {
    if (formData.productos.length > 1) {
      const nuevosProductos = formData.productos.filter((_, i) => i !== index)
      const nuevoTotal = nuevosProductos.reduce((sum, prod) => sum + prod.total, 0)
      setFormData({
        ...formData,
        productos: nuevosProductos,
        total: nuevoTotal
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'Debe iniciar sesión para crear una venta',
        variant: 'destructive'
      })
      return
    }

    if (!formData.cliente_id) {
      toast({
        title: 'Error',
        description: 'Por favor seleccione un cliente',
        variant: 'destructive'
      })
      return
    }

    // Validar stock disponible
    for (const producto of formData.productos) {
      if (!producto.id) {
        toast({
          title: 'Error',
          description: 'Por favor seleccione todos los productos',
          variant: 'destructive'
        })
        return
      }

      if (producto.cantidad <= 0) {
        toast({
          title: 'Error',
          description: 'La cantidad debe ser mayor a 0',
          variant: 'destructive'
        })
        return
      }

      if (producto.cantidad > producto.stock_disponible) {
        toast({
          title: 'Error',
          description: `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock_disponible}`,
          variant: 'destructive'
        })
        return
      }
    }

    try {
      const nuevaVenta = await ventasService.createVenta({
        cliente_id: formData.cliente_id,
        fecha: formData.fecha,
        productos: formData.productos.map(p => ({
          nombre: p.nombre,
          cantidad: p.cantidad,
          precio_unitario: p.precio_unitario,
          total: p.total
        })),
        total: formData.total,
        visitador: user.id
      })

      // Actualizar stock
      for (const producto of formData.productos) {
        await productosService.ajustarStock(
          producto.id,
          producto.cantidad,
          'salida'
        )
      }

      setVentas([...ventas, nuevaVenta])
      setFormData({
        cliente_id: '',
        fecha: new Date().toISOString().split('T')[0],
        productos: [{ id: '', nombre: '', cantidad: 1, precio_unitario: 0, total: 0, stock_disponible: 0 }],
        total: 0
      })
      setIsDialogOpen(false)
      toast({
        title: 'Venta creada',
        description: 'La venta se ha creado correctamente'
      })
      loadVentas()
      loadProductos() // Recargar productos para actualizar stock
    } catch (err) {
      console.error('Error al crear venta:', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo crear la venta',
        variant: 'destructive'
      })
    }
  }

  const handleAgregarRastreo = async (venta: Venta) => {
    setVentaSeleccionada(venta)
    setRastreo(venta.rastreo || '')
    setIsRastreoDialogOpen(true)
  }

  const handleGuardarRastreo = async () => {
    if (!ventaSeleccionada) return

    try {
      const { error } = await supabase
        .from('ventas_mensuales')
        .update({ rastreo })
        .eq('id', ventaSeleccionada.id)

      if (error) throw error

      // Actualizar el estado local
      setVentas(ventas.map(v => 
        v.id === ventaSeleccionada.id 
          ? { ...v, rastreo } 
          : v
      ))

      setIsRastreoDialogOpen(false)
      toast({
        title: 'Rastreo actualizado',
        description: 'El número de rastreo se ha actualizado correctamente'
      })
    } catch (error) {
      console.error('Error al actualizar rastreo:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el número de rastreo',
        variant: 'destructive'
      })
    }
  }

  const handleCambiarEstado = async (venta: Venta) => {
    setVentaSeleccionada(venta)
    setEstadoSeleccionado(venta.estado as 'pendiente' | 'enviado' | 'completado' | 'anulado')
    setIsEstadoDialogOpen(true)
  }

  const handleGuardarEstado = async () => {
    if (!ventaSeleccionada) return

    try {
      // Actualizar el estado en la base de datos
      const { error } = await supabase
        .from('ventas_mensuales')
        .update({ estado: estadoSeleccionado })
        .eq('id', ventaSeleccionada.id)

      if (error) throw error

      // Si el estado es "anulado", restar el total del saldo pendiente del cliente
      if (estadoSeleccionado === 'anulado') {
        const nuevoSaldo = ventaSeleccionada.clientes.saldo_pendiente - ventaSeleccionada.total
        
        // Actualizar el saldo del cliente
        const { error: saldoError } = await supabase
          .from('clientes')
          .update({ saldo_pendiente: nuevoSaldo })
          .eq('id', ventaSeleccionada.cliente_id)

        if (saldoError) throw saldoError

        // Actualizar el saldo en la interfaz
        setVentas(ventas.map(v => {
          if (v.id === ventaSeleccionada.id) {
            return {
              ...v,
              estado: estadoSeleccionado,
              clientes: {
                ...v.clientes,
                saldo_pendiente: nuevoSaldo
              }
            }
          }
          return v
        }))
      } else {
        // Actualizar solo el estado si no es "anulado"
        setVentas(ventas.map(v => 
          v.id === ventaSeleccionada.id 
            ? { ...v, estado: estadoSeleccionado } 
            : v
        ))
      }

      setIsEstadoDialogOpen(false)
      toast({
        title: 'Estado actualizado',
        description: estadoSeleccionado === 'anulado' 
          ? 'La venta ha sido anulada y el saldo del cliente ha sido actualizado'
          : 'El estado de la venta se ha actualizado correctamente'
      })
    } catch (error) {
      console.error('Error al actualizar estado:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado de la venta',
        variant: 'destructive'
      })
    }
  }

  const getEstadoColor = (estado?: string) => {
    if (!estado) return 'bg-gray-100 text-gray-800'
    
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800'
      case 'enviado':
        return 'bg-blue-100 text-blue-800'
      case 'completado':
        return 'bg-green-100 text-green-800'
      case 'anulado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div>Cargando ventas...</div>
  }

  if (error) {
    return <div className="text-red-600">{error}</div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Ventas</h1>
        <Dialog 
          open={isDialogOpen} 
          onOpenChange={setIsDialogOpen}
        >
          <DialogTrigger asChild>
            <Button>Nueva Venta</Button>
          </DialogTrigger>
          <DialogContent 
            className="max-w-4xl"
            onPointerDownOutside={(e) => {
              // Prevenir que el diálogo se cierre al hacer clic fuera
              e.preventDefault()
            }}
          >
            <DialogHeader>
              <DialogTitle>Crear Nueva Venta</DialogTitle>
              <DialogDescription>
                Complete el formulario para registrar una nueva venta. Seleccione el cliente, la fecha y los productos a vender.
              </DialogDescription>
            </DialogHeader>
            <form 
              onSubmit={handleSubmit} 
              className="space-y-4"
              onFocus={(e) => {
                // Asegurar que el foco se mantenga dentro del formulario
                const target = e.target as HTMLElement
                if (!target.closest('.dialog-content')) {
                  e.preventDefault()
                }
              }}
            >
              <div className="dialog-content">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cliente">Cliente</Label>
                    <Select 
                      value={formData.cliente_id} 
                      onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="fecha">Fecha</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Productos</h3>
                    <Button type="button" onClick={agregarProducto} variant="outline" size="sm">
                      Agregar Producto
                    </Button>
                  </div>
                  
                  {formData.productos.map((producto, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 items-end border p-4 rounded-lg">
                      <div className="col-span-4">
                        <Label>Producto</Label>
                        <Select
                          value={producto.id}
                          onValueChange={(value) => actualizarProducto(index, 'id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar producto">
                              {producto.id ? `${producto.nombre} - Stock: ${producto.stock_disponible}` : 'Seleccionar producto'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {productos.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nombre} - Stock: {p.stock}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          min="1"
                          value={producto.cantidad}
                          onChange={(e) => actualizarProducto(index, 'cantidad', e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Precio Unit.</Label>
                        <Input
                          type="number"
                          value={producto.precio_unitario}
                          readOnly
                          disabled
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Total</Label>
                        <Input
                          type="number"
                          value={producto.total}
                          readOnly
                          disabled
                        />
                      </div>
                      <div className="col-span-2">
                        <Button
                          type="button"
                          onClick={() => eliminarProducto(index)}
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          disabled={formData.productos.length === 1}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end items-center space-x-4">
                    <Label>Total Venta:</Label>
                    <div className="font-bold text-lg">
                      Q{formData.total.toFixed(2)}
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full">Crear Venta</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6 flex gap-4 items-center">
        <Input
          placeholder="Buscar en ventas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filtrar por estado:</span>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-sm border rounded p-1.5 bg-white"
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="enviado">Enviado</option>
            <option value="completado">Completado</option>
            <option value="anulado">Anulado</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto text-sm">
        <table className="w-full border-collapse table-auto">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-1.5 text-left">Código</th>
              <th className="px-3 py-1.5 text-left">Cliente</th>
              <th className="px-3 py-1.5 text-left">Fecha</th>
              <th className="px-3 py-1.5 text-left">Visitador</th>
              <th className="px-3 py-1.5 text-right">Total</th>
              <th className="px-3 py-1.5 text-right">Saldo Pendiente</th>
              <th className="px-3 py-1.5 text-left">Rastreo</th>
              <th className="px-3 py-1.5 text-left">Estado</th>
              <th className="px-3 py-1.5 text-left">Productos</th>
              <th className="px-3 py-1.5 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ventasFiltradas.map((venta) => (
              <tr key={venta.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-1.5">{venta.codigo}</td>
                <td className="px-3 py-1.5">{venta.clientes.nombre}</td>
                <td className="px-3 py-1.5">
                  {new Date(venta.fecha).toLocaleDateString()}
                </td>
                <td className="px-3 py-1.5">
                  {visitadores.find(v => v.id === venta.visitador)?.nombre || 'N/A'}
                </td>
                <td className="px-3 py-1.5 text-right">
                  Q{venta.total.toFixed(2)}
                </td>
                <td className="px-3 py-1.5 text-right">
                  Q{venta.clientes.saldo_pendiente.toFixed(2)}
                </td>
                <td className="px-3 py-1.5">
                  {venta.rastreo || '-'}
                </td>
                <td className="px-3 py-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${getEstadoColor(venta.estado)}`}>
                    {venta.estado ? venta.estado.charAt(0).toUpperCase() + venta.estado.slice(1) : 'Sin Estado'}
                  </span>
                </td>
                <td className="px-3 py-1.5">
                  {venta.productos && venta.productos.length > 0 && (
                    <ul className="list-disc list-inside text-xs">
                      {venta.productos.map((producto, index) => (
                        <li key={index}>
                          {producto.nombre} - {producto.cantidad} x Q{producto.precio_unitario.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-3 py-1.5 space-x-1">
                  <button
                    onClick={() => handleAgregarRastreo(venta)}
                    className="p-1.5 text-blue-600 hover:text-blue-800 transition-colors"
                    title="Agregar guía de rastreo"
                  >
                    <TruckIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleCambiarEstado(venta)}
                    className="p-1.5 text-green-600 hover:text-green-800 transition-colors"
                    title="Cambiar estado de la venta"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Diálogo para agregar/editar rastreo */}
      <Dialog open={isRastreoDialogOpen} onOpenChange={setIsRastreoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Guía de Rastreo</DialogTitle>
            <DialogDescription>
              Ingrese el número de guía de rastreo para la venta {ventaSeleccionada?.codigo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rastreo">Número de Guía</Label>
              <Input
                id="rastreo"
                value={rastreo}
                onChange={(e) => setRastreo(e.target.value)}
                placeholder="Ingrese el número de guía"
              />
            </div>
            <Button onClick={handleGuardarRastreo} className="w-full">
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para cambiar estado */}
      <Dialog open={isEstadoDialogOpen} onOpenChange={setIsEstadoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estado de la Venta</DialogTitle>
            <DialogDescription>
              Seleccione el nuevo estado para la venta {ventaSeleccionada?.codigo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={estadoSeleccionado}
                onValueChange={(value: 'pendiente' | 'enviado' | 'completado' | 'anulado') => setEstadoSeleccionado(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="anulado">Anulado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGuardarEstado} className="w-full">
              Guardar Estado
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 