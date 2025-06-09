'use client'

import { useEffect, useState } from 'react'
import { usuariosService } from '@/lib/services'
import { useToast } from '@/components/ui/use-toast'
import { MapPinIcon } from '@heroicons/react/24/outline'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null)
  const [giras, setGiras] = useState('')
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
  }, [])

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
                    <button
                      onClick={() => handleOpenGirasDialog(usuario)}
                      className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                      title="Editar giras"
                    >
                      <MapPinIcon className="h-5 w-5" />
                      <span>Agregar gira</span>
                    </button>
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
    </div>
  )
} 