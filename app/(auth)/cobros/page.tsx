'use client'

import { useEffect, useState } from 'react'
import { cobrosService, clientesService } from '@/lib/services'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Cobro {
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

export default function CobrosPage() {
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    numero: '',
    fecha: new Date().toISOString().split('T')[0],
    cod_farmacia: '',
    cliente_id: '',
    descripcion: '',
    total: 0,
    visitador: '',
    fecha_cheque: '',
    banco: '',
    numero_cheque: '',
    valor_cheque: 0
  })

  const loadCobros = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await cobrosService.getCobros()
      setCobros(data)
    } catch (error) {
      console.error('Error al cargar cobros:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar los cobros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCobros()
  }, [])

  useEffect(() => {
    const loadClientes = async () => {
      try {
        const data = await clientesService.getClientes()
        setClientes(data)
      } catch (error) {
        console.error('Error al cargar clientes:', error)
      }
    }
    loadClientes()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const nuevoCobro = await cobrosService.createCobro(formData)
      setCobros([...cobros, nuevoCobro])
      setFormData({
        numero: '',
        fecha: new Date().toISOString().split('T')[0],
        cod_farmacia: '',
        cliente_id: '',
        descripcion: '',
        total: 0,
        visitador: '',
        fecha_cheque: '',
        banco: '',
        numero_cheque: '',
        valor_cheque: 0
      })
      setIsDialogOpen(false)
      toast({
        title: 'Cobro creado',
        description: 'El cobro se ha creado correctamente'
      })
      loadCobros()
    } catch (err) {
      console.error('Error al crear cobro:', err)
      toast({
        title: 'Error',
        description: 'No se pudo crear el cobro',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando cobros...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error al cargar los cobros</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadCobros}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cobros</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Nuevo Cobro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Cobro</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    required
                  />
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
                <Label htmlFor="total">Total</Label>
                <Input
                  id="total"
                  type="number"
                  step="0.01"
                  value={formData.total}
                  onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="visitador">Visitador</Label>
                <Input
                  id="visitador"
                  value={formData.visitador}
                  onChange={(e) => setFormData({ ...formData, visitador: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-4 border-t pt-4 mt-4">
                <h3 className="font-medium">Información de Cheque (Opcional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fecha_cheque">Fecha Cheque</Label>
                    <Input
                      id="fecha_cheque"
                      type="date"
                      value={formData.fecha_cheque}
                      onChange={(e) => setFormData({ ...formData, fecha_cheque: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="banco">Banco</Label>
                    <Input
                      id="banco"
                      value={formData.banco}
                      onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="numero_cheque">Número Cheque</Label>
                    <Input
                      id="numero_cheque"
                      value={formData.numero_cheque}
                      onChange={(e) => setFormData({ ...formData, numero_cheque: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="valor_cheque">Valor Cheque</Label>
                    <Input
                      id="valor_cheque"
                      type="number"
                      step="0.01"
                      value={formData.valor_cheque}
                      onChange={(e) => setFormData({ ...formData, valor_cheque: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full">Crear Cobro</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {cobros.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No hay cobros registrados</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cobros.map((cobro) => (
            <div
              key={cobro.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  {cobro.clientes.nombre}
                  <span className="text-sm text-gray-500 ml-2">({cobro.clientes.codigo})</span>
                </h2>
                <p className="text-gray-600">{cobro.clientes.direccion}</p>
                <p className="text-gray-600">{cobro.clientes.telefono}</p>
                {cobro.clientes.nit && (
                  <p className="text-gray-600">NIT: {cobro.clientes.nit}</p>
                )}
                <p className="text-gray-600">
                  Saldo pendiente: ${cobro.clientes.saldo_pendiente.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500">Número de cobro</p>
                <p className="text-lg font-semibold">{cobro.numero}</p>
                
                <p className="text-sm text-gray-500 mt-2">Total</p>
                <p className="text-lg font-semibold">
                  ${cobro.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
                
                {cobro.descripcion && (
                  <>
                    <p className="text-sm text-gray-500 mt-2">Descripción</p>
                    <p className="text-gray-600">{cobro.descripcion}</p>
                  </>
                )}
              </div>
              
              <div className="text-sm text-gray-500">
                <p>
                  Fecha: {format(new Date(cobro.fecha), "PPP", { locale: es })}
                </p>
                {cobro.fecha_cheque && (
                  <p>
                    Fecha cheque: {format(new Date(cobro.fecha_cheque), "PPP", { locale: es })}
                  </p>
                )}
                {cobro.banco && (
                  <p>Banco: {cobro.banco}</p>
                )}
                {cobro.numero_cheque && (
                  <p>Número de cheque: {cobro.numero_cheque}</p>
                )}
                {cobro.valor_cheque && (
                  <p>
                    Valor cheque: ${cobro.valor_cheque.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 