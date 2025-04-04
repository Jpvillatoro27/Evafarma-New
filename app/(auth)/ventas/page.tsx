'use client'

import { useEffect, useState } from 'react'
import { ventasService, clientesService } from '@/lib/services'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/hooks/useAuth'

interface Producto {
  nombre: string
  cantidad: number
  precio_unitario: number
  total: number
}

interface Venta {
  id: string
  cliente_id: string
  total: number
  fecha: string
  created_at: string
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const { toast } = useToast()
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    cliente_id: '',
    fecha: new Date().toISOString().split('T')[0],
    productos: [{ nombre: '', cantidad: 1, precio_unitario: 0, total: 0 }] as Producto[],
    total: 0
  })

  const loadVentas = async () => {
    try {
      setLoading(true)
      const data = await ventasService.getVentas()
      setVentas(data)
    } catch (err) {
      console.error('Error al cargar ventas:', err)
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
    }
  }

  useEffect(() => {
    loadVentas()
    loadClientes()
  }, [])

  const calcularTotalProducto = (producto: Producto) => {
    return producto.cantidad * producto.precio_unitario
  }

  const actualizarProducto = (index: number, campo: keyof Producto, valor: string | number) => {
    const nuevosProductos = [...formData.productos]
    nuevosProductos[index] = {
      ...nuevosProductos[index],
      [campo]: valor,
      total: campo === 'cantidad' || campo === 'precio_unitario' 
        ? (campo === 'cantidad' ? Number(valor) : nuevosProductos[index].cantidad) * 
          (campo === 'precio_unitario' ? Number(valor) : nuevosProductos[index].precio_unitario)
        : nuevosProductos[index].total
    }
    
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
      productos: [...formData.productos, { nombre: '', cantidad: 1, precio_unitario: 0, total: 0 }]
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

    if (formData.productos.some(p => !p.nombre || p.cantidad <= 0 || p.precio_unitario <= 0)) {
      toast({
        title: 'Error',
        description: 'Por favor complete todos los campos de productos correctamente',
        variant: 'destructive'
      })
      return
    }

    try {
      const nuevaVenta = await ventasService.createVenta({
        cliente_id: formData.cliente_id,
        fecha: formData.fecha,
        productos: formData.productos,
        total: formData.total,
        visitador: user.id
      })
      setVentas([...ventas, nuevaVenta])
      setFormData({
        cliente_id: '',
        fecha: new Date().toISOString().split('T')[0],
        productos: [{ nombre: '', cantidad: 1, precio_unitario: 0, total: 0 }],
        total: 0
      })
      setIsDialogOpen(false)
      toast({
        title: 'Venta creada',
        description: 'La venta se ha creado correctamente'
      })
      loadVentas()
    } catch (err) {
      console.error('Error al crear venta:', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo crear la venta',
        variant: 'destructive'
      })
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Nueva Venta</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Crear Nueva Venta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                      <Label>Nombre</Label>
                      <Input
                        value={producto.nombre}
                        onChange={(e) => actualizarProducto(index, 'nombre', e.target.value)}
                        required
                      />
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
                        step="0.01"
                        min="0"
                        value={producto.precio_unitario}
                        onChange={(e) => actualizarProducto(index, 'precio_unitario', e.target.value)}
                        required
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
                    ${formData.total.toFixed(2)}
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full">Crear Venta</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ventas.map((venta) => (
          <div key={venta.id} className="border p-4 rounded-lg">
            <h2 className="text-xl font-semibold">{venta.clientes.nombre}</h2>
            <p>Total: ${venta.total.toFixed(2)}</p>
            <p>Saldo Pendiente: ${venta.clientes.saldo_pendiente.toFixed(2)}</p>
            <p className="text-sm text-gray-500">
              Fecha: {new Date(venta.fecha).toLocaleDateString()}
            </p>
            {venta.productos && venta.productos.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Productos:</p>
                <ul className="list-disc list-inside">
                  {venta.productos.map((producto, index) => (
                    <li key={index}>
                      {producto.nombre} - {producto.cantidad} x ${producto.precio_unitario.toFixed(2)} = ${producto.total.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 