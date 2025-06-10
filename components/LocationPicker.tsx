'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { useState, useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Button } from "@/components/ui/button"
import { Navigation, Share2 } from "lucide-react"
import { toast } from "sonner"

// Fix para los íconos de Leaflet en Next.js
const icon = L.icon({
  iconUrl: '/images/marker-icon.png',
  iconRetinaUrl: '/images/marker-icon-2x.png',
  shadowUrl: '/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number }) => void
  initialLocation?: { lat: number; lng: number }
  readOnly?: boolean
}

export function LocationPicker({ onLocationSelect, initialLocation, readOnly = false }: LocationPickerProps) {
  const [position, setPosition] = useState(initialLocation || { lat: 14.6349, lng: -90.5069 })

  useEffect(() => {
    if (initialLocation) {
      setPosition(initialLocation)
    }
  }, [initialLocation])

  const openInWaze = () => {
    const url = `https://waze.com/ul?ll=${position.lat},${position.lng}&navigate=yes`
    window.open(url, '_blank')
  }

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${position.lat},${position.lng}`
    window.open(url, '_blank')
  }

  function LocationMarker() {
    useMapEvents({
      click(e) {
        if (!readOnly) {
          const newPosition = { lat: e.latlng.lat, lng: e.latlng.lng }
          setPosition(newPosition)
          onLocationSelect(newPosition)
        }
      },
    })

    return position ? <Marker position={position} icon={icon} /> : null
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setPosition(newLocation)
          onLocationSelect(newLocation)
        },
        (error) => {
          toast.error('Error al obtener la ubicación actual')
          console.error('Error getting location:', error)
        }
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="h-[400px] w-full rounded-lg overflow-hidden">
        <MapContainer
          center={[position.lat, position.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker />
        </MapContainer>
      </div>

      <div className="flex gap-2 justify-end">
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            className="flex items-center gap-2"
          >
            <Navigation className="h-4 w-4" />
            Usar mi ubicación actual
          </Button>
        )}
        {readOnly && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={openInWaze}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Abrir en Waze
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={openInGoogleMaps}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Abrir en Google Maps
            </Button>
          </>
        )}
      </div>
    </div>
  )
} 