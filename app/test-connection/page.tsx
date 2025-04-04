'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestConnection() {
  const [status, setStatus] = useState('Verificando conexión...')

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('clientes').select('*').limit(1)
        
        if (error) {
          setStatus(`Error: ${error.message}`)
        } else {
          setStatus('¡Conexión exitosa! La configuración de Supabase es correcta.')
        }
      } catch (error) {
        setStatus(`Error inesperado: ${error}`)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Prueba de Conexión</h1>
        <p className="text-gray-700">{status}</p>
      </div>
    </div>
  )
} 