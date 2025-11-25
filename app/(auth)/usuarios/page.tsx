'use client'

import { useEffect, useState } from 'react'
import { usuariosService, clientesService } from '@/lib/services'
import { useToast } from '@/components/ui/use-toast'
import { MapPinIcon } from '@heroicons/react/24/outline'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Usuario {
  id: string
  email: string
  nombre: string
  rol: 'admin' | 'visitador'
  giras?: string
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isGirasDialogOpen, setIsGirasDialogOpen] = useState(false)
  const [isMunicipiosDialogOpen, setIsMunicipiosDialogOpen] = useState(false)
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null)
  const [giras, setGiras] = useState('')
  const [municipios, setMunicipios] = useState<Array<{ municipio: string; cantidad: number }>>([])
  const [municipioSeleccionado, setMunicipioSeleccionado] = useState<string | null>(null)
  const [nuevoVisitadorId, setNuevoVisitadorId] = useState<string>('')
  const [todosVisitadores, setTodosVisitadores] = useState<Usuario[]>([])
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: ''
  })
  const { toast } = useToast()

  const loadUsuarios = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await usuariosService.getVisitadores()
      setUsuarios(data)
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar los usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsuarios()
    loadTodosVisitadores()
  }, [])

  const loadTodosVisitadores = async () => {
    try {
      const data = await usuariosService.getVisitadores()
      setTodosVisitadores(data)
    } catch (error) {
      console.error('Error al cargar visitadores:', error)
    }
  }

  const handleOpenMunicipiosDialog = async (usuario: Usuario) => {
    setSelectedUsuario(usuario)
    try {
      // Obtener todos los clientes del visitador
      const clientes = await clientesService.getClientesPorVisitador(usuario.id)
      
      // Agrupar por municipio y contar
      const municipiosMap = new Map<string, number>()
      clientes.forEach(cliente => {
        if (cliente.municipio) {
          const count = municipiosMap.get(cliente.municipio) || 0
          municipiosMap.set(cliente.municipio, count + 1)
        }
      })
      
      // Convertir a array y ordenar
      const municipiosArray = Array.from(municipiosMap.entries())
        .map(([municipio, cantidad]) => ({ municipio, cantidad }))
        .sort((a, b) => a.municipio.localeCompare(b.municipio))
      
      setMunicipios(municipiosArray)
      setIsMunicipiosDialogOpen(true)
    } catch (error) {
      console.error('Error al cargar municipios:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los municipios',
        variant: 'destructive'
      })
    }
  }

  const handleCambiarVisitador = async (municipio: string) => {
    if (!selectedUsuario || !nuevoVisitadorId) {
      toast({
        title: 'Error',
        description: 'Por favor seleccione un visitador',
        variant: 'destructive'
      })
      return
    }

    if (nuevoVisitadorId === selectedUsuario.id) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un visitador diferente',
        variant: 'destructive'
      })
      return
    }

    if (!window.confirm(`¿Está seguro de cambiar todos los clientes del municipio "${municipio}" del visitador "${selectedUsuario.nombre}" al nuevo visitador seleccionado?`)) {
      return
    }

    try {
      const clientesActualizados = await clientesService.cambiarVisitadorPorMunicipio(
        municipio,
        selectedUsuario.id,
        nuevoVisitadorId
      )

      toast({
        title: 'Éxito',
        description: `Se cambiaron ${clientesActualizados.length} cliente(s) del municipio "${municipio}" al nuevo visitador`,
      })

      // Recargar los municipios para actualizar la lista
      await handleOpenMunicipiosDialog(selectedUsuario)
      setNuevoVisitadorId('')
      setMunicipioSeleccionado(null)
    } catch (error) {
      console.error('Error al cambiar visitador:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el visitador',
        variant: 'destructive'
      })
    }
  }

  const handleOpenGirasDialog = (usuario: Usuario) => {
    setSelectedUsuario(usuario)
    setGiras(usuario.giras || '')
    setIsGirasDialogOpen(true)
  }

  const handleSaveGiras = async () => {
    if (!selectedUsuario) return

    try {
      await usuariosService.updateUsuario(selectedUsuario.id, { giras })
      toast({
        title: 'Giras actualizadas',
        description: 'Las giras se han actualizado correctamente',
      })
      loadUsuarios()
      setIsGirasDialogOpen(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron actualizar las giras',
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password || !formData.nombre) {
      toast({
        title: 'Error',
        description: 'Todos los campos son requeridos',
        variant: 'destructive'
      })
      return
    }

    try {
      const data = await usuariosService.register(formData.email, formData.password, formData.nombre)
      if (data) {
        loadUsuarios()
        setFormData({
          email: '',
          password: '',
          nombre: ''
        })
        setIsDialogOpen(false)
        toast({
          title: 'Visitador creado',
          description: 'El visitador se ha creado correctamente'
        })
      }
    } catch (err) {
      console.error('Error al crear visitador:', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo crear el visitador',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Visitadores</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Nuevo Visitador</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Visitador</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Contraseña *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">Crear Visitador</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giras</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {usuario.giras
                      ? usuario.giras.split(',').map((gira, idx) => (
                          <div key={idx}>{gira.trim()}</div>
                        ))
                      : 'Sin giras asignadas'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenMunicipiosDialog(usuario)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        title="Ver giras (municipios)"
                      >
                        <MapPinIcon className="h-5 w-5" />
                        <span>Giras</span>
                      </button>
                      <button
                        onClick={() => handleOpenGirasDialog(usuario)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                        title="Editar giras"
                      >
                        <MapPinIcon className="h-5 w-5" />
                        <span>Agregar gira</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isGirasDialogOpen} onOpenChange={setIsGirasDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Giras</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="giras">Giras</Label>
              <Input
                id="giras"
                value={giras}
                onChange={(e) => setGiras(e.target.value)}
                placeholder="Ingrese las giras del visitador"
              />
              <p className="text-xs text-gray-500 mt-1">Ingrese las giras separadas por coma. Ejemplo: Huehue, Retaluleu, El Progreso</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsGirasDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveGiras}>
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isMunicipiosDialogOpen} onOpenChange={setIsMunicipiosDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Giras de {selectedUsuario?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {municipios.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Este visitador no tiene clientes asignados</p>
            ) : (
              <div className="space-y-3">
                {municipios.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.municipio}</p>
                      <p className="text-sm text-gray-500">{item.cantidad} cliente(s)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {municipioSeleccionado === item.municipio ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={nuevoVisitadorId}
                            onValueChange={setNuevoVisitadorId}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Seleccionar visitador" />
                            </SelectTrigger>
                            <SelectContent>
                              {todosVisitadores
                                .filter(v => v.id !== selectedUsuario?.id)
                                .map((visitador) => (
                                  <SelectItem key={visitador.id} value={visitador.id}>
                                    {visitador.nombre}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={() => handleCambiarVisitador(item.municipio)}
                            disabled={!nuevoVisitadorId}
                            size="sm"
                          >
                            Confirmar
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setMunicipioSeleccionado(null)
                              setNuevoVisitadorId('')
                            }}
                            size="sm"
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setMunicipioSeleccionado(item.municipio)
                            setNuevoVisitadorId('')
                          }}
                          size="sm"
                        >
                          Cambiar de visitador
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsMunicipiosDialogOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 