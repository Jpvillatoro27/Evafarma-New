'use client'

import { useEffect, useState } from 'react'
import { Producto } from '@/types'
import { productosService } from '@/services/productosService'
import { catalogoService, ProductoCatalogo } from '@/services/catalogoService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table'
import { Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function CatalogoPage() {
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const [productos, setProductos] = useState<Producto[]>([])
  const [catalogo, setCatalogo] = useState<ProductoCatalogo[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [nuevoProductoCatalogo, setNuevoProductoCatalogo] = useState({
    principio_activo: '',
    cantidad_capsulas: '',
    peso: '',
    tipo: 'capsulas' as 'capsulas' | 'liquido',
    imagen_url: ''
  })
  const [imagen, setImagen] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadProductos()
    loadCatalogo()
  }, [])

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

  const loadCatalogo = async () => {
    try {
      const data = await catalogoService.getCatalogo()
      setCatalogo(data)
    } catch (error) {
      console.error('Error al cargar catálogo:', error)
      toast.error('Error al cargar el catálogo')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productoSeleccionado) {
      toast.error('Por favor, selecciona un producto')
      return
    }

    try {
      let imagenUrl = ''
      if (imagen) {
        try {
          imagenUrl = await catalogoService.uploadImagen(imagen)
        } catch (error) {
          console.error('Error al subir imagen:', error)
          toast.error('Error al subir la imagen')
          return
        }
      }

      const nuevoProducto = {
        producto_id: productoSeleccionado.id.toString(),
        principio_activo: nuevoProductoCatalogo.principio_activo,
        cantidad_capsulas: nuevoProductoCatalogo.tipo === 'capsulas' ? Number(nuevoProductoCatalogo.cantidad_capsulas) : null,
        peso: Number(nuevoProductoCatalogo.peso),
        tipo: nuevoProductoCatalogo.tipo,
        imagen_url: imagenUrl
      }

      console.log('Creando producto:', nuevoProducto)

      const resultado = await catalogoService.createProductoCatalogo(nuevoProducto)
      console.log('Resultado:', resultado)

      toast.success('Producto agregado al catálogo exitosamente')
      setShowDialog(false)
      resetForm()
      loadCatalogo()
    } catch (error) {
      console.error('Error al crear producto:', error)
      toast.error('Error al crear el producto en el catálogo')
    }
  }

  const resetForm = () => {
    setNuevoProductoCatalogo({
      principio_activo: '',
      cantidad_capsulas: '',
      peso: '',
      tipo: 'capsulas' as 'capsulas' | 'liquido',
      imagen_url: ''
    })
    setImagen(null)
    setError(null)
  }

  const handleEliminarProducto = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto del catálogo?')) {
      return
    }

    try {
      console.log('Intentando eliminar producto:', id)
      const { error } = await supabase
        .from('catalogo')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      console.log('Producto eliminado exitosamente')
      setCatalogo(prevCatalogo => prevCatalogo.filter(item => item.id !== id))
      toast.success('Producto eliminado del catálogo')
    } catch (error) {
      console.error('Error al eliminar producto:', error)
      toast.error('Error al eliminar el producto del catálogo')
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Catálogo de Productos</h1>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowDialog(true)}>Agregar al Catálogo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Producto al Catálogo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Producto</Label>
                <Select
                  value={productoSeleccionado?.id?.toString() || ''}
                  onValueChange={(value) => {
                    const producto = productos.find(p => p.id.toString() === value)
                    if (producto) {
                      setProductoSeleccionado(producto)
                      setNuevoProductoCatalogo(prev => ({
                        ...prev,
                        principio_activo: '',
                        cantidad_capsulas: '',
                        peso: ''
                      }))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un producto">
                      {productoSeleccionado?.nombre}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {productos.map((producto) => (
                      <SelectItem key={producto.id} value={producto.id.toString()}>
                        {producto.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {productoSeleccionado && (
                <>
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={nuevoProductoCatalogo.tipo}
                      onValueChange={(value: 'capsulas' | 'liquido') => {
                        setNuevoProductoCatalogo(prev => ({
                          ...prev,
                          tipo: value,
                          cantidad_capsulas: value === 'liquido' ? '' : prev.cantidad_capsulas
                        }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="capsulas">Cápsulas</SelectItem>
                        <SelectItem value="liquido">Líquido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Principio Activo</Label>
                    <Input
                      value={nuevoProductoCatalogo.principio_activo}
                      onChange={(e) => setNuevoProductoCatalogo(prev => ({
                        ...prev,
                        principio_activo: e.target.value
                      }))}
                      required
                    />
                  </div>

                  {nuevoProductoCatalogo.tipo === 'capsulas' && (
                    <div>
                      <Label>Cantidad de Cápsulas</Label>
                      <Input
                        type="number"
                        value={nuevoProductoCatalogo.cantidad_capsulas}
                        onChange={(e) => setNuevoProductoCatalogo(prev => ({
                          ...prev,
                          cantidad_capsulas: e.target.value
                        }))}
                        required
                      />
                    </div>
                  )}

                  <div>
                    <Label>Peso ({nuevoProductoCatalogo.tipo === 'capsulas' ? 'mg' : 'ml'})</Label>
                    <Input
                      type="number"
                      value={nuevoProductoCatalogo.peso}
                      onChange={(e) => setNuevoProductoCatalogo(prev => ({
                        ...prev,
                        peso: e.target.value
                      }))}
                      required
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Imagen
                    </label>
                    <div className="mt-1 flex items-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImagen(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Stock Disponible</Label>
                    <Input
                      value={productoSeleccionado.stock}
                      disabled
                    />
                  </div>

                  <Button type="submit" className="w-full" onClick={(e) => {
                    e.preventDefault()
                    handleSubmit(e)
                  }}>
                    Agregar al Catálogo
                  </Button>
                </>
              )}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {catalogo.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative aspect-square">
              {item.imagen_url ? (
                <img
                  src={item.imagen_url}
                  alt={item.producto?.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400">Sin imagen</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2">{item.producto?.nombre}</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="font-medium">Principio Activo:</span> {item.principio_activo}</p>
                {item.tipo === 'capsulas' && (
                  <p><span className="font-medium">Cápsulas:</span> {item.cantidad_capsulas}</p>
                )}
                <p><span className="font-medium">Peso:</span> {item.peso} {item.tipo === 'capsulas' ? 'mg' : 'ml'}</p>
              </div>
              <div className="mt-4 flex justify-end">
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleEliminarProducto(item.id)
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 