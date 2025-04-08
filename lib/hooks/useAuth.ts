import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Usuario } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obtener el usuario actual
    const getUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const { data: usuarioData } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', authUser.id)
            .single()
          
          if (usuarioData) {
            setUser(usuarioData as Usuario)
          }
        }
      } catch (error) {
        console.error('Error al obtener el usuario:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Suscribirse a cambios en la sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (usuarioData) {
          setUser(usuarioData as Usuario)
        }
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    loading,
    signOut: () => supabase.auth.signOut()
  }
} 