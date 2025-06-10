'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Corregir el problema con los íconos de Leaflet
const icon = L.icon({
  iconUrl: '/marker-icon.png',
  iconRetinaUrl: '/marker-icon-2x.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

interface MapComponentProps {
  onLocationSelect: (location: { lat: number; lng: number }) => void
  initialLocation?: { lat: number; lng: number }
  readOnly?: boolean
}

function MapEvents({ onLocationSelect, readOnly }: { onLocationSelect: (location: { lat: number; lng: number }) => void, readOnly?: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (!readOnly) {
      map.on('click', (e) => {
        onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng })
      })
    }
  }, [map, onLocationSelect, readOnly])

  return null
}

export default function MapComponent({ onLocationSelect, initialLocation, readOnly = false }: MapComponentProps) {
  const defaultCenter = { lat: 14.6349, lng: -90.5069 } // Guatemala City
  const center = initialLocation || defaultCenter

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {initialLocation && (
        <Marker
          position={[initialLocation.lat, initialLocation.lng]}
          icon={icon}
        />
      )}
      <MapEvents onLocationSelect={onLocationSelect} readOnly={readOnly} />
    </MapContainer>
  )
} 