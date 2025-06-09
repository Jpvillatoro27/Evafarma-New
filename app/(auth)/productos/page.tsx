'use client'

import { useEffect, useState } from 'react'
import { Producto } from '@/types'
import { productosService } from '@/services/productosService'
import { usuariosService } from '@/lib/services'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [showCargaStockDialog, setShowCargaStockDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [filtroStock, setFiltroStock] = useState<'todos' | 'normal' | 'bajo'>('todos')
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    costo_produccion: '',
    precio_venta: '',
    stock: '',
    stock_minimo: '',
  })
  const [formCargaStock, setFormCargaStock] = useState({
    producto_id: '',
    cantidad: '',
  })
  const router = useRouter()

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const usuario = await usuariosService.getUsuarioActual()
        const esAdmin = usuario?.rol === 'admin'
        setIsAdmin(esAdmin)
        
        if (!esAdmin) {
          router.push('/')
        }
      } catch (error) {
        console.error('Error al verificar rol:', error)
        router.push('/')
      }
    }
    checkAdmin()
  }, [])

  useEffect(() => {
    loadProductos()
  }, [])

  useEffect(() => {
    // Filtrar productos según el estado del stock
    let productosFiltrados = [...productos]
    
    if (filtroStock === 'normal') {
      productosFiltrados = productos.filter(p => p.stock > p.stock_minimo)
    } else if (filtroStock === 'bajo') {
      productosFiltrados = productos.filter(p => p.stock <= p.stock_minimo)
    }
    
    setProductosFiltrados(productosFiltrados)
  }, [filtroStock, productos])

  const loadProductos = async () => {
    try {
      const data = await productosService.getProductos()
      setProductos(data)
    } catch (error) {
      console.error('Error al cargar productos:', error)
      toast.error('Error al cargar los productos')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await productosService.createProducto({
        ...nuevoProducto,
        costo_produccion: nuevoProducto.costo_produccion ? parseFloat(nuevoProducto.costo_produccion) : null,
        precio_venta: parseFloat(nuevoProducto.precio_venta),
        stock: parseInt(nuevoProducto.stock),
        stock_minimo: parseInt(nuevoProducto.stock_minimo),
        alerta_stock: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      toast.success('Producto creado exitosamente')
      setShowDialog(false)
      setNuevoProducto({
        nombre: '',
        costo_produccion: '',
        precio_venta: '',
        stock: '',
        stock_minimo: '',
      })
      loadProductos()
    } catch (error) {
      console.error('Error al crear producto:', error)
      toast.error('Error al crear el producto')
    }
  }

  const handleCargaStock = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!formCargaStock.producto_id) {
        toast.error('Debe seleccionar un producto')
        return
      }

      const cantidad = parseInt(formCargaStock.cantidad)
      if (cantidad <= 0) {
        toast.error('La cantidad debe ser mayor a 0')
        return
      }

      await productosService.ajustarStock(
        formCargaStock.producto_id,
        cantidad,
        'entrada'
      )
      
      toast.success('Stock actualizado exitosamente')
      setShowCargaStockDialog(false)
      setFormCargaStock({
        producto_id: '',
        cantidad: '',
      })
      loadProductos()
    } catch (error) {
      console.error('Error al actualizar stock:', error)
      toast.error('Error al actualizar el stock')
    }
  }

  const handleEditarProducto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productoSeleccionado) return

    try {
      await productosService.updateProducto(productoSeleccionado.id, {
        nombre: productoSeleccionado.nombre,
        costo_produccion: productoSeleccionado.costo_produccion,
        precio_venta: productoSeleccionado.precio_venta,
        stock: productoSeleccionado.stock,
        stock_minimo: productoSeleccionado.stock_minimo,
        updated_at: new Date().toISOString()
      })
      toast.success('Producto actualizado exitosamente')
      setShowEditDialog(false)
      setProductoSeleccionado(null)
      loadProductos()
    } catch (error) {
      console.error('Error al actualizar producto:', error)
      toast.error('Error al actualizar el producto')
    }
  }

  const handleCerrarDialog = () => {
    setShowCargaStockDialog(false)
    setFormCargaStock({
      producto_id: '',
      cantidad: '',
    })
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Productos</h1>
        <div className="flex gap-2">
          <Select value={filtroStock} onValueChange={(value: 'todos' | 'normal' | 'bajo') => setFiltroStock(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los productos</SelectItem>
              <SelectItem value="normal">Stock normal</SelectItem>
              <SelectItem value="bajo">Stock bajo</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <>
              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild>
                  <Button>Nuevo Producto</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo Producto</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="nombre">Nombre</Label>
                      <Input
                        id="nombre"
                        value={nuevoProducto.nombre}
                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                        required
                      />
                    </div>
                    {isAdmin && (
                      <div>
                        <Label htmlFor="costo_produccion">Costo de Producción</Label>
                        <Input
                          id="costo_produccion"
                          type="number"
                          step="0.01"
                          value={nuevoProducto.costo_produccion}
                          onChange={(e) => setNuevoProducto({ ...nuevoProducto, costo_produccion: e.target.value })}
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="precio_venta">Precio de Venta</Label>
                      <Input
                        id="precio_venta"
                        type="number"
                        step="0.01"
                        value={nuevoProducto.precio_venta}
                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio_venta: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="stock">Stock Inicial</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={nuevoProducto.stock}
                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, stock: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="stock_minimo">Stock Mínimo</Label>
                      <Input
                        id="stock_minimo"
                        type="number"
                        value={nuevoProducto.stock_minimo}
                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, stock_minimo: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit">Crear Producto</Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog open={showCargaStockDialog} onOpenChange={setShowCargaStockDialog}>
                <DialogTrigger asChild>
                  <Button>Cargar Stock</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cargar Stock</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCargaStock} className="space-y-4">
                    <div>
                      <Label>Producto</Label>
                      <Select 
                        value={formCargaStock.producto_id} 
                        onValueChange={(value) => setFormCargaStock({ ...formCargaStock, producto_id: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar producto">
                            {productoSeleccionado ? `${productoSeleccionado.nombre} - Stock actual: ${productoSeleccionado.stock}` : 'Seleccionar producto'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {productos.map((producto) => (
                            <SelectItem key={producto.id} value={producto.id}>
                              {producto.nombre} - Stock actual: {producto.stock}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Cantidad a agregar</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formCargaStock.cantidad}
                        onChange={(e) => setFormCargaStock({ ...formCargaStock, cantidad: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleCerrarDialog}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit">Actualizar Stock</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Diálogo de edición */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditarProducto} className="space-y-4">
            <div>
              <Label htmlFor="edit-nombre">Nombre</Label>
              <Input
                id="edit-nombre"
                value={productoSeleccionado?.nombre || ''}
                onChange={(e) => setProductoSeleccionado(prev => prev ? { ...prev, nombre: e.target.value } : null)}
                required
              />
            </div>
            {isAdmin && (
              <div>
                <Label htmlFor="edit-costo_produccion">Costo de Producción</Label>
                <Input
                  id="edit-costo_produccion"
                  type="number"
                  step="0.01"
                  value={productoSeleccionado?.costo_produccion || ''}
                  onChange={(e) => setProductoSeleccionado(prev => prev ? { ...prev, costo_produccion: parseFloat(e.target.value) } : null)}
                />
              </div>
            )}
            <div>
              <Label htmlFor="edit-precio_venta">Precio de Venta</Label>
              <Input
                id="edit-precio_venta"
                type="number"
                step="0.01"
                value={productoSeleccionado?.precio_venta || ''}
                onChange={(e) => setProductoSeleccionado(prev => prev ? { ...prev, precio_venta: parseFloat(e.target.value) } : null)}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-stock">Stock</Label>
              <Input
                id="edit-stock"
                type="number"
                value={productoSeleccionado?.stock || ''}
                onChange={(e) => setProductoSeleccionado(prev => prev ? { ...prev, stock: parseInt(e.target.value) } : null)}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-stock_minimo">Stock Mínimo</Label>
              <Input
                id="edit-stock_minimo"
                type="number"
                value={productoSeleccionado?.stock_minimo || ''}
                onChange={(e) => setProductoSeleccionado(prev => prev ? { ...prev, stock_minimo: parseInt(e.target.value) } : null)}
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowEditDialog(false)
                  setProductoSeleccionado(null)
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar Cambios</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div>Cargando...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Código</th>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-right">Costo Producción</th>
                <th className="px-4 py-2 text-right">Precio Venta</th>
                <th className="px-4 py-2 text-right">Stock</th>
                <th className="px-4 py-2 text-right">Stock Mínimo</th>
                <th className="px-4 py-2 text-center">Estado</th>
                <th className="px-4 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((producto) => (
                <tr key={producto.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{producto.codigo}</td>
                  <td className="px-4 py-2">{producto.nombre}</td>
                  <td className="px-4 py-2 text-right">
                    {producto.costo_produccion ? formatCurrency(producto.costo_produccion) : '-'}
                  </td>
                  <td className="px-4 py-2 text-right">{formatCurrency(producto.precio_venta)}</td>
                  <td className="px-4 py-2 text-right">{producto.stock}</td>
                  <td className="px-4 py-2 text-right">{producto.stock_minimo}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      producto.stock <= producto.stock_minimo
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {producto.stock <= producto.stock_minimo ? 'Stock Bajo' : 'Normal'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProductoSeleccionado(producto)
                          setShowEditDialog(true)
                        }}
                      >
                        Editar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 