'use client'

import { useEffect, useState } from 'react'
import { cobrosService, clientesService, usuariosService } from '@/lib/services'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/hooks/useAuth'

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
  Estado: string
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

interface Visitador {
  id: string
  nombre: string
  email: string
}

export default function CobrosPage() {
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [cobrosFiltrados, setCobrosFiltrados] = useState<Cobro[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [visitadores, setVisitadores] = useState<Visitador[]>([])
  const { toast } = useToast()
  const { user } = useAuth()

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
    valor_cheque: 0,
    otros: '',
    otros2: '',
    otros3: ''
  })

  const [selectedCliente, setSelectedCliente] = useState<any>(null)

  useEffect(() => {
    if (user?.id) {
      setFormData(prev => ({ ...prev, visitador: user.id }))
    }
  }, [user])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setCobrosFiltrados(cobros)
      return
    }

    const termino = searchTerm.toLowerCase()
    const filtered = cobros.filter(cobro => 
      cobro.numero.toLowerCase().includes(termino) ||
      cobro.clientes.nombre.toLowerCase().includes(termino) ||
      cobro.clientes.codigo.toLowerCase().includes(termino) ||
      cobro.descripcion?.toLowerCase().includes(termino) ||
      cobro.total.toString().includes(termino) ||
      new Date(cobro.fecha).toLocaleDateString().includes(termino)
    )
    setCobrosFiltrados(filtered)
  }, [searchTerm, cobros])

  const loadCobros = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await cobrosService.getCobros()
      const usuario = await usuariosService.getUsuarioActual()
      
      // Filtrar los cobros según el rol del usuario
      const cobrosFiltrados = (usuario?.rol === 'admin'
        ? data
        : data.filter(cobro => cobro.visitador === usuario?.id)
      ).map(cobro => {
        const cliente = Array.isArray(cobro.clientes) ? cobro.clientes[0] : cobro.clientes
        return {
          ...cobro,
          Estado: cobro.Estado || 'pendiente',
          clientes: cliente ? {
            id: cliente.id,
            codigo: cliente.codigo,
            nombre: cliente.nombre,
            direccion: cliente.direccion,
            telefono: cliente.telefono,
            nit: cliente.nit,
            visitador: cliente.visitador,
            propietario: cliente.propietario,
            saldo_pendiente: cliente.saldo_pendiente
          } : null
        }
      }) as Cobro[]
      
      setCobros(cobrosFiltrados)
      setCobrosFiltrados(cobrosFiltrados)
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
        const usuario = await usuariosService.getUsuarioActual()
        
        // Filtrar los clientes según el rol del usuario
        const clientesFiltrados = usuario?.rol === 'admin'
          ? data
          : data.filter(cliente => cliente.visitador === usuario?.id)
        
        setClientes(clientesFiltrados)
      } catch (error) {
        console.error('Error al cargar clientes:', error)
      }
    }
    loadClientes()
  }, [])

  useEffect(() => {
    const loadVisitadores = async () => {
      try {
        const data = await usuariosService.getVisitadores()
        setVisitadores(data)
      } catch (error) {
        console.error('Error al cargar visitadores:', error)
      }
    }
    loadVisitadores()
  }, [])

  const handleClienteChange = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId)
    setSelectedCliente(cliente)
    setFormData(prev => ({
      ...prev,
      cliente_id: clienteId,
      cod_farmacia: cliente?.codigo || ''
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!formData.numero.trim()) {
      toast({
        title: "Error",
        description: "El número de cobro es requerido",
        variant: "destructive"
      });
      return;
    }

    if (!formData.fecha) {
      toast({
        title: "Error",
        description: "La fecha es requerida",
        variant: "destructive"
      });
      return;
    }

    if (!formData.cliente_id) {
      toast({
        title: "Error",
        description: "Debe seleccionar un cliente",
        variant: "destructive"
      });
      return;
    }

    if (!formData.visitador) {
      toast({
        title: "Error",
        description: "Debe seleccionar un visitador",
        variant: "destructive"
      });
      return;
    }

    if (formData.total <= 0) {
      toast({
        title: "Error",
        description: "El total debe ser mayor a 0",
        variant: "destructive"
      });
      return;
    }

    // Preparar datos para envío
    const cobroData = {
      ...formData,
      fecha: formData.fecha || new Date().toISOString().split('T')[0],
      fecha_cheque: formData.fecha_cheque || undefined,
      valor_cheque: formData.valor_cheque || undefined,
      banco: formData.banco || undefined,
      numero_cheque: formData.numero_cheque || undefined,
      otros: formData.otros || undefined,
      otros2: formData.otros2 || undefined,
      otros3: formData.otros3 || undefined,
      total: Number(formData.total)
    };

    if (!window.confirm('¿Está seguro de crear este cobro?')) {
      return;
    }

    try {
      const nuevoCobro = await cobrosService.createCobro(cobroData)
      setCobros([...cobros, nuevoCobro as Cobro])
      setFormData({
        numero: '',
        fecha: new Date().toISOString().split('T')[0],
        cod_farmacia: '',
        cliente_id: '',
        descripcion: '',
        total: 0,
        visitador: user?.id || '',
        fecha_cheque: '',
        banco: '',
        numero_cheque: '',
        valor_cheque: 0,
        otros: '',
        otros2: '',
        otros3: ''
      })
      setSelectedCliente(null)
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
        description: err instanceof Error ? err.message : 'No se pudo crear el cobro',
        variant: 'destructive'
      })
    }
  }

  const handleConfirmarCobro = async (cobroId: string, clienteId: string, total: number) => {
    if (!window.confirm('¿Está seguro de confirmar este cobro?')) {
      return;
    }

    try {
      // Confirmar el cobro
      await cobrosService.confirmarCobro(cobroId)
      
      // Actualizar el saldo pendiente del cliente
      await clientesService.actualizarSaldo(clienteId, -total)
      
      toast({
        title: 'Cobro confirmado',
        description: 'El cobro ha sido confirmado y el saldo actualizado',
      })
      
      // Recargar los cobros para actualizar la vista
      loadCobros()
    } catch (error) {
      console.error('Error al confirmar cobro:', error)
      toast({
        title: 'Error',
        description: 'No se pudo confirmar el cobro',
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
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Cobro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="numero">Número *</Label>
                    <Input
                      id="numero"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="fecha">Fecha *</Label>
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
                  <Label htmlFor="cliente_id">Cliente *</Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={handleClienteChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nombre} ({cliente.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="visitador">Visitador</Label>
                  <Input
                    id="visitador"
                    value={visitadores.find(v => v.id === formData.visitador)?.nombre || '-'}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>

                <div>
                  <Label htmlFor="cod_farmacia">Código de Farmacia</Label>
                  <Input
                    id="cod_farmacia"
                    value={formData.cod_farmacia}
                    readOnly
                    className="bg-gray-100"
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
                  <Label htmlFor="total">Total *</Label>
                  <Input
                    id="total"
                    type="number"
                    step="0.01"
                    value={formData.total}
                    onChange={(e) => setFormData({ ...formData, total: Number(e.target.value) })}
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

                <div className="space-y-4 border-t pt-4 mt-4">
                  <h3 className="font-medium">Información Adicional</h3>
                  <div>
                    <Label htmlFor="otros">Comentarios</Label>
                    <Input
                      id="otros"
                      value={formData.otros}
                      onChange={(e) => setFormData({ ...formData, otros: e.target.value })}
                      placeholder="Ingrese sus comentarios aquí..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="otros2">Otros 2</Label>
                    <Input
                      id="otros2"
                      value={formData.otros2}
                      onChange={(e) => setFormData({ ...formData, otros2: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="otros3">Otros 3</Label>
                    <Input
                      id="otros3"
                      value={formData.otros3}
                      onChange={(e) => setFormData({ ...formData, otros3: e.target.value })}
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white pt-4 border-t">
                  <div className="flex gap-4">
                    <Button type="button" variant="outline" className="w-full" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="w-full">
                      Confirmar Cobro
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Buscar en cobros..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>
      
      {cobrosFiltrados.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">
            {searchTerm ? "No se encontraron cobros que coincidan con la búsqueda" : "No hay cobros registrados"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-auto text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-2 text-left w-20">Número</th>
                <th className="px-2 py-2 text-left w-24">Fecha</th>
                <th className="px-2 py-2 text-left w-48">Cliente</th>
                <th className="px-2 py-2 text-left w-24">Código</th>
                <th className="px-2 py-2 text-right w-24">Total</th>
                <th className="px-2 py-2 text-right w-32">Saldo Pend.</th>
                <th className="px-2 py-2 text-left w-48">Descripción</th>
                <th className="px-2 py-2 text-left w-32">Visitador</th>
                <th className="px-2 py-2 text-left w-24">Estado</th>
                <th className="px-2 py-2 text-left w-48">Comentarios</th>
                {user?.rol === 'admin' && <th className="px-2 py-2 text-left w-24">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {cobrosFiltrados.map((cobro) => (
                <tr key={cobro.id} className="border-b hover:bg-gray-50">
                  <td className="px-2 py-2">{cobro.numero}</td>
                  <td className="px-2 py-2">{format(new Date(cobro.fecha), "dd/MM/yyyy")}</td>
                  <td className="px-2 py-2 truncate max-w-[12rem]">{cobro.clientes.nombre}</td>
                  <td className="px-2 py-2">{cobro.clientes.codigo}</td>
                  <td className="px-2 py-2 text-right">Q{cobro.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                  <td className="px-2 py-2 text-right">Q{cobro.clientes.saldo_pendiente.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                  <td className="px-2 py-2 truncate max-w-[12rem]">{cobro.descripcion || '-'}</td>
                  <td className="px-2 py-2 truncate max-w-[8rem]">{visitadores.find(v => v.id === cobro.visitador)?.nombre || '-'}</td>
                  <td className="px-2 py-2">{cobro.Estado}</td>
                  <td className="px-2 py-2 truncate max-w-[12rem]">{cobro.otros || '-'}</td>
                  {user?.rol === 'admin' && cobro.Estado === 'Pendiente' && (
                    <td className="px-2 py-2">
                      <Button variant="outline" size="sm" onClick={() => handleConfirmarCobro(cobro.id, cobro.cliente_id, cobro.total)}>
                        Confirmar
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 