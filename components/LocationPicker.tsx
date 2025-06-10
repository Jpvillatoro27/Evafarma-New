'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Importar el mapa dinámicamente para evitar el error de window is not defined
const MapComponent = dynamic(
  () => import('./MapComponent'),
  { ssr: false }
)

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number }) => void
  initialLocation?: { lat: number; lng: number }
  readOnly?: boolean
}

export function LocationPicker({ onLocationSelect, initialLocation, readOnly = false }: LocationPickerProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="h-[400px] bg-gray-100 animate-pulse rounded-lg" />
  }

  return (
    <div className="h-[400px] rounded-lg overflow-hidden">
      <MapComponent
        onLocationSelect={onLocationSelect}
        initialLocation={initialLocation}
        readOnly={readOnly}
      />
    </div>
  )
} 