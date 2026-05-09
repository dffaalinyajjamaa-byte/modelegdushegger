import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { X, ImageIcon } from 'lucide-react';

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
  images?: string[] | null;
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

// Build a circular pin showing the product image at its exact lat/lng.
function makeProductIcon(imageUrl?: string | null) {
  const inner = imageUrl
    ? `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;display:block" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.6);color:#666;font-size:18px">🛍</div>`;
  const html = `
    <div style="position:relative;width:46px;height:56px;transform:translate(-23px,-56px);filter:drop-shadow(0 4px 8px rgba(0,0,0,0.3))">
      <div style="position:absolute;inset:0;background:white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white"></div>
      <div style="position:absolute;left:5px;top:5px;width:36px;height:36px;border-radius:50%;overflow:hidden;background:#eee;border:2px solid white">
        ${inner}
      </div>
    </div>`;
  return L.divIcon({
    html,
    className: 'product-pin-icon',
    iconSize: [46, 56],
    iconAnchor: [23, 56],
    popupAnchor: [0, -52],
  });
}

export default function NearbyMap({ products, userLat, userLng, onProductClick, onClose }: NearbyMapProps) {
  const center: [number, number] = userLat && userLng ? [userLat, userLng] : [9.02, 38.75];
  const geoProducts = useMemo(() => products.filter(p => p.latitude && p.longitude), [products]);

  return (
    <div className="relative rounded-3xl overflow-hidden lg-glass border border-white/30 dark:border-white/10" style={{ height: '380px' }}>
      <Button size="icon" variant="ghost" className="absolute top-2 right-2 z-[1000] lg-glass h-9 w-9 rounded-full" onClick={onClose}>
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
              <Popup>You are here</Popup>
            </Marker>
          </>
        )}
        {geoProducts.map(p => (
          <Marker
            key={p.id}
            position={[p.latitude!, p.longitude!]}
            icon={makeProductIcon(p.images?.[0])}
          >
            <Popup>
              <div style={{ width: 180 }}>
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.title} style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 12, marginBottom: 8 }} />
                ) : (
                  <div style={{ width: '100%', height: 80, background: '#eee', borderRadius: 12, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#888', fontSize: 12 }}>No image</span>
                  </div>
                )}
                <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{p.title}</p>
                <p style={{ color: '#0A84FF', fontWeight: 700, fontSize: 13, margin: '2px 0 6px' }}>ETB {p.price}</p>
                {p.address && <p style={{ fontSize: 10, color: '#666', margin: 0 }}>{p.address}</p>}
                <button
                  onClick={() => onProductClick(p.id)}
                  style={{
                    marginTop: 8, width: '100%', padding: '6px 10px', borderRadius: 999,
                    background: '#0A84FF', color: 'white', fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer'
                  }}
                >
                  View item
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
