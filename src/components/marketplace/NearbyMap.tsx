import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { X, Navigation } from 'lucide-react';

// Fix default marker icons for Leaflet in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'hue-rotate-180 brightness-150',
});

interface Product {
  id: string;
  title: string;
  price: number;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

interface NearbyMapProps {
  products: Product[];
  userLat: number | null;
  userLng: number | null;
  onProductClick: (id: string) => void;
  onClose: () => void;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 13); }, [lat, lng, map]);
  return null;
}

export default function NearbyMap({ products, userLat, userLng, onProductClick, onClose }: NearbyMapProps) {
  const center: [number, number] = userLat && userLng ? [userLat, userLng] : [9.02, 38.75]; // Default: Addis Ababa
  const geoProducts = products.filter(p => p.latitude && p.longitude);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/50 backdrop-blur-xl bg-card/50" style={{ height: '350px' }}>
      <Button size="icon" variant="ghost" className="absolute top-2 right-2 z-[1000] bg-card/80 backdrop-blur-sm h-8 w-8" onClick={onClose}>
        <X className="w-4 h-4" />
      </Button>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {userLat && userLng && (
          <>
            <RecenterMap lat={userLat} lng={userLng} />
            <Marker position={[userLat, userLng]} icon={userIcon}>
              <Popup>📍 You are here</Popup>
            </Marker>
          </>
        )}
        {geoProducts.map(p => (
          <Marker key={p.id} position={[p.latitude!, p.longitude!]}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold">{p.title}</p>
                <p className="text-primary font-bold">ETB {p.price}</p>
                <button className="text-blue-500 underline mt-1" onClick={() => onProductClick(p.id)}>View</button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
