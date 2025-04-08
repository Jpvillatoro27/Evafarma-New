'use client'

import { useEffect, useState } from 'react'
import { usuariosService } from '@/lib/services'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

interface Usuario {
  id: string
  email: string
  nombre: string
  rol: 'admin' | 'visitador'
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: ''
  })

  useEffect(() => {
    async function loadUsuarios() {
      try {
        setLoading(true)
        const data = await usuariosService.getVisitadores()
        setUsuarios(data)
      } catch (err) {
        console.error('Error al cargar visitadores:', err)
        setError('Error al cargar los visitadores')
      } finally {
        setLoading(false)
      }
    }

    loadUsuarios()
  }, [])

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
        // Recargar la lista de usuarios
        const updatedData = await usuariosService.getVisitadores()
        setUsuarios(updatedData)
        
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

  if (loading) {
    return <div>Cargando visitadores...</div>
  }

  if (error) {
    return <div className="text-red-600">{error}</div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Visitadores</h1>
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

      {usuarios.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No hay visitadores registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Email</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{usuario.nombre}</td>
                  <td className="px-4 py-2">{usuario.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 