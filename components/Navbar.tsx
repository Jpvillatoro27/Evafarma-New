'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { usuariosService } from '@/lib/services'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HomeIcon, UserGroupIcon, ShoppingCartIcon, BanknotesIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'

export default function Navbar() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const usuario = await usuariosService.getUsuarioActual()
        if (!usuario) {
          return
        }
        setIsAdmin(usuario.rol === 'admin')
      } catch (err) {
        console.error('Error al verificar autenticación:', err)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  if (loading) {
    return null
  }

  const navigation = [
    { name: 'Inicio', href: '/' },
    { name: 'Clientes', href: '/clientes' },
    { name: 'Ventas', href: '/ventas' },
    { name: 'Cobros', href: '/cobros' },
    ...(isAdmin ? [
      { name: 'Comisiones', href: '/comisiones' },
      { name: 'Ventas Mensuales', href: '/ventas-mensuales' },
      { name: 'Productos', href: '/productos' },
      { name: 'Visitadores', href: '/usuarios' }
    ] : []),
  ]

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <img
                  src="/sin-titulo.png"
                  alt="EvaFarma Logo"
                  className="h-8 w-auto"
                />
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${
                    pathname === item.href
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={async () => {
                await usuariosService.logout()
                router.push('/login')
              }}
              className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
} 