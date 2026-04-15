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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <h2 className="text-xl font-bold">Marketplace</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowMap(!showMap)}>
            <Navigation className="w-4 h-4 mr-1" /> Nearby
          </Button>
          <Button size="sm" onClick={onUpload}><Plus className="w-4 h-4 mr-1" /> Sell</Button>
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 backdrop-blur-xl bg-card/50 border-border/30" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(c => (
          <Button key={c} size="sm" variant={activeCategory === c ? 'default' : 'outline'} onClick={() => setActiveCategory(c)} className="text-xs shrink-0">
            {c}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden backdrop-blur-xl bg-card/50 border-border/30">
              <Skeleton className="aspect-square w-full" />
              <CardContent className="p-2.5 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="backdrop-blur-xl bg-card/50 border-border/30"><CardContent className="py-16 text-center">
          <p className="text-muted-foreground">No items found</p>
          <Button className="mt-4" onClick={onUpload}>Be the first to sell!</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(product => (
            <Card key={product.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-all backdrop-blur-xl bg-card/50 border-border/30 hover:border-primary/30" onClick={() => onProductClick(product.id)}>
              <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                {product.images?.[0] ? (
                  <img src={product.images[0]} className="w-full h-full object-cover" alt={product.title} />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <CardContent className="p-2.5">
                <p className="text-sm font-medium truncate">{product.title}</p>
                <p className="text-primary font-bold text-sm">ETB {product.price}</p>
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-[9px] py-0">{product.type}</Badge>
                  {product.distance !== undefined && (
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />{product.distance < 1 ? `${Math.round(product.distance * 1000)}m` : `${product.distance.toFixed(1)}km`}
                    </span>
                  )}
                  {!product.distance && product.address && (
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />{product.address.split(',')[0]}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
