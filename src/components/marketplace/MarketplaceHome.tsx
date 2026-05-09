import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plus, Search, MapPin, ImageIcon, Navigation } from 'lucide-react';
import NearbyMap from './NearbyMap';

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  type: string;
  condition: string | null;
  images: string[] | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  distance?: number;
}

interface MarketplaceHomeProps {
  user: User;
  onBack: () => void;
  onUpload: () => void;
  onProductClick: (id: string) => void;
}

const categories = ['All', 'Books', 'Worksheets', 'Rentals', 'Digital'];

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export default function MarketplaceHome({ user, onBack, onUpload, onProductClick }: MarketplaceHomeProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showMap, setShowMap] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
      () => {}
    );
  }, []);

  useEffect(() => { fetchProducts(); }, [activeCategory]);

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase.from('marketplace_products').select('id, title, price, category, type, condition, images, address, latitude, longitude, created_at')
      .eq('status', 'approved').order('created_at', { ascending: false }).limit(50);
    if (activeCategory !== 'All') query = query.eq('category', activeCategory.toLowerCase());
    const { data } = await query;
    let items = (data || []) as Product[];
    // Calc distance
    if (userLat && userLng) {
      items = items.map(p => ({
        ...p,
        distance: p.latitude && p.longitude ? haversine(userLat, userLng, p.latitude, p.longitude) : undefined,
      }));
    }
    setProducts(items);
    setLoading(false);
  };

  const filtered = products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 pb-28">
      {/* Floating island header */}
      <div className="lg-island sticky top-2 z-30 mx-1 flex items-center justify-between px-2 py-2 rounded-3xl">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="lg-press rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold tracking-tight">Marketplace</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowMap(!showMap)} className="rounded-full lg-press">
            <Navigation className="w-4 h-4 mr-1" /> Nearby
          </Button>
          <Button size="sm" onClick={onUpload} className="rounded-full lg-press">
            <Plus className="w-4 h-4 mr-1" /> Sell
          </Button>
        </div>
      </div>

      {showMap && (
        <NearbyMap
          products={products}
          userLat={userLat}
          userLng={userLng}
          onProductClick={onProductClick}
          onClose={() => setShowMap(false)}
        />
      )}

      <div className="relative px-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <Input
          placeholder="Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 h-11 rounded-2xl lg-glass border-white/30 dark:border-white/10"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-hide">
        {categories.map(c => (
          <Button
            key={c}
            size="sm"
            variant={activeCategory === c ? 'default' : 'outline'}
            onClick={() => setActiveCategory(c)}
            className="text-xs shrink-0 rounded-full lg-press"
          >
            {c}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 px-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="overflow-hidden lg-glass rounded-3xl border border-white/30 dark:border-white/10">
              <div className="aspect-square w-full lg-skeleton" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 w-3/4 lg-skeleton rounded-full" />
                <div className="h-3.5 w-1/2 lg-skeleton rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="lg-glass rounded-3xl border-white/30 dark:border-white/10">
          <CardContent className="py-16 text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full lg-glass flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No items found</p>
            <Button onClick={onUpload} className="rounded-full">Be the first to sell</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-1">
          {filtered.map(product => (
            <button
              key={product.id}
              type="button"
              onClick={() => onProductClick(product.id)}
              className="text-left overflow-hidden lg-glass lg-press rounded-3xl border border-white/30 dark:border-white/10 hover:border-primary/30 transition-all"
            >
              <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
                {product.images?.[0] ? (
                  <img src={product.images[0]} className="w-full h-full object-cover" alt={product.title} />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate">{product.title}</p>
                <p className="text-primary font-bold text-sm mt-0.5">ETB {product.price}</p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[9px] py-0 rounded-full">{product.type}</Badge>
                  {product.distance !== undefined && (
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      {product.distance < 1 ? `${Math.round(product.distance * 1000)}m` : `${product.distance.toFixed(1)}km`}
                    </span>
                  )}
                  {!product.distance && product.address && (
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />{product.address.split(',')[0]}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
