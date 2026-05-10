import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

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
  category?: string;
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

const PRICE_RANGES = [
  { id: 'all', label: 'All', min: 0, max: Infinity },
  { id: 'lt100', label: '< 100', min: 0, max: 100 },
  { id: '100-500', label: '100–500', min: 100, max: 500 },
  { id: '500-1500', label: '500–1500', min: 500, max: 1500 },
  { id: 'gt1500', label: '> 1500', min: 1500, max: Infinity },
];

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 13); }, [lat, lng, map]);
  return null;
}

// Fix Leaflet's blank/white tile bug when mounted inside a freshly-shown container.
function InvalidateOnMount() {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 60);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [map]);
  return null;
}

function makeProductIcon(imageUrl?: string | null) {
  const inner = imageUrl
    ? `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;display:block" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.6);color:#666;font-size:18px">·</div>`;
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

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => { if (p.category) set.add(p.category); });
    return ['all', ...Array.from(set)];
  }, [products]);

  const [activeCat, setActiveCat] = useState<string>('all');
  const [activePrice, setActivePrice] = useState<string>('all');

  const geoProducts = useMemo(() => {
    const range = PRICE_RANGES.find(r => r.id === activePrice)!;
    return products.filter(p =>
      p.latitude && p.longitude &&
      (activeCat === 'all' || p.category === activeCat) &&
      p.price >= range.min && p.price <= range.max
    );
  }, [products, activeCat, activePrice]);

  return (
    <div className="space-y-2">
      {/* Filter chips island */}
      <div className="lg-island rounded-2xl mx-1 px-2 py-2 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {allCategories.map(c => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full lg-press capitalize ${
                activeCat === c ? 'bg-foreground text-background' : 'lg-glass'
              }`}
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {PRICE_RANGES.map(r => (
            <button
              key={r.id}
              onClick={() => setActivePrice(r.id)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full lg-press ${
                activePrice === r.id ? 'bg-primary text-primary-foreground' : 'lg-glass'
              }`}
            >
              ETB {r.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="relative rounded-3xl overflow-hidden lg-glass border border-white/30 dark:border-white/10"
        style={{ height: '380px', background: '#dfe6ec' }}
      >
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 z-[1000] lg-glass h-9 w-9 rounded-full"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <InvalidateOnMount />
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
    </div>
  );
}
