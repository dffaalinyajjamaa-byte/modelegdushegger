import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, MapPin, MessageCircle, Star, ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProductDetailProps {
  user: User;
  productId: string;
  onBack: () => void;
}

interface Product {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  type: string;
  price: number;
  condition: string | null;
  images: string[] | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  rent_duration_days: number | null;
  created_at: string;
}

export default function ProductDetail({ user, productId, onBack }: ProductDetailProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [sellerName, setSellerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('marketplace_products').select('*').eq('id', productId).single();
      if (data) {
        setProduct(data as Product);
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', data.user_id).single();
        if (profile) setSellerName(profile.full_name);
      }
      setLoading(false);
    };
    fetch();
  }, [productId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!product) return <p className="text-center py-20 text-muted-foreground">Product not found</p>;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>

      {/* Image Slider */}
      <div className="aspect-square rounded-xl bg-muted overflow-hidden relative">
        {product.images && product.images.length > 0 ? (
          <>
            <img src={product.images[activeImage]} className="w-full h-full object-cover" alt={product.title} />
            {product.images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {product.images.map((_, i) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === activeImage ? 'bg-white scale-125' : 'bg-white/50'}`} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-16 h-16 text-muted-foreground" /></div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold">{product.title}</h2>
        <p className="text-2xl font-bold text-primary mt-1">ETB {product.price}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Badge>{product.category}</Badge>
        <Badge variant="outline">{product.type}</Badge>
        {product.condition && <Badge variant="secondary">{product.condition}</Badge>}
        {product.rent_duration_days && <Badge variant="secondary">{product.rent_duration_days} days rental</Badge>}
      </div>

      {product.description && (
        <Card><CardContent className="p-3"><p className="text-sm">{product.description}</p></CardContent></Card>
      )}

      {/* Seller Info */}
      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {sellerName.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{sellerName || 'Unknown Seller'}</p>
            {product.address && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{product.address}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {product.user_id !== user.id && (
        <Button className="w-full h-12 text-base" size="lg">
          <MessageCircle className="w-5 h-5 mr-2" /> Contact Seller
        </Button>
      )}
    </div>
  );
}
