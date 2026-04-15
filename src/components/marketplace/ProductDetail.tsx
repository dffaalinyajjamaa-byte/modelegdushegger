import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, MapPin, MessageCircle, Star, ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

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
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [rentDays, setRentDays] = useState(7);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase.from('marketplace_products').select('*').eq('id', productId).single();
      if (data) {
        setProduct(data as Product);
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', data.user_id).single();
        if (profile) setSellerName(profile.full_name);
        // Fetch reviews
        const { data: revs } = await supabase.from('marketplace_reviews').select('*').eq('seller_id', data.user_id).order('created_at', { ascending: false }).limit(10);
        setReviews(revs || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [productId]);

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  const handleContactSeller = async () => {
    if (!product) return;
    // Create or find existing chat
    const chatId = [user.id, product.user_id].sort().join('_');
    const { data: existing } = await supabase.from('chats').select('id').eq('chat_id', chatId).maybeSingle();
    if (!existing) {
      await supabase.from('chats').insert({
        chat_id: chatId,
        members: [user.id, product.user_id],
        is_group: false,
      });
    }
    // Send initial message
    await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: user.id,
      type: 'text',
      content: `Hi! I'm interested in "${product.title}" (ETB ${product.price})`,
    });
    toast({ title: '💬 Message sent to seller!' });
  };

  const submitReview = async () => {
    if (!product) return;
    setSubmittingReview(true);
    const { error } = await supabase.from('marketplace_reviews').insert({
      product_id: product.id,
      seller_id: product.user_id,
      buyer_id: user.id,
      rating,
      comment: comment || null,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: '⭐ Review submitted!' });
      setComment('');
      const { data: revs } = await supabase.from('marketplace_reviews').select('*').eq('seller_id', product.user_id).order('created_at', { ascending: false }).limit(10);
      setReviews(revs || []);
    }
    setSubmittingReview(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!product) return <p className="text-center py-20 text-muted-foreground">Product not found</p>;

  const returnDate = product.type === 'rent' ? new Date(Date.now() + rentDays * 86400000).toLocaleDateString() : null;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>

      {/* Image Slider */}
      <div className="aspect-square rounded-xl overflow-hidden relative backdrop-blur-xl bg-card/50 border border-border/30">
        {product.images && product.images.length > 0 ? (
          <>
            <img src={product.images[activeImage]} className="w-full h-full object-cover" alt={product.title} />
            {product.images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {product.images.map((_, i) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${i === activeImage ? 'bg-primary scale-125' : 'bg-white/50'}`} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted"><ImageIcon className="w-16 h-16 text-muted-foreground" /></div>
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
        <Card className="backdrop-blur-xl bg-card/50 border-border/30"><CardContent className="p-3"><p className="text-sm">{product.description}</p></CardContent></Card>
      )}

      {/* Rent Duration Selector */}
      {product.type === 'rent' && (
        <Card className="backdrop-blur-xl bg-card/50 border-border/30">
          <CardContent className="p-3 space-y-2">
            <p className="text-sm font-medium">Rental Duration</p>
            <div className="flex gap-2">
              {[7, 14, 30].map(d => (
                <Button key={d} size="sm" variant={rentDays === d ? 'default' : 'outline'} onClick={() => setRentDays(d)}>
                  {d} days
                </Button>
              ))}
            </div>
            {returnDate && <p className="text-xs text-muted-foreground">Return by: {returnDate}</p>}
          </CardContent>
        </Card>
      )}

      {/* Seller Info */}
      <Card className="backdrop-blur-xl bg-card/50 border-border/30">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {sellerName.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{sellerName || 'Unknown Seller'}</p>
            {avgRating && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {avgRating} ({reviews.length} reviews)
              </p>
            )}
            {product.address && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{product.address}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {product.user_id !== user.id && (
        <Button className="w-full h-12 text-base backdrop-blur-xl" size="lg" onClick={handleContactSeller}>
          <MessageCircle className="w-5 h-5 mr-2" /> Contact Seller
        </Button>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold">Reviews</h3>
          {reviews.map(r => (
            <Card key={r.id} className="backdrop-blur-xl bg-card/50 border-border/30">
              <CardContent className="p-2.5">
                <div className="flex items-center gap-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                  ))}
                </div>
                {r.comment && <p className="text-xs">{r.comment}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submit Review */}
      {product.user_id !== user.id && (
        <Card className="backdrop-blur-xl bg-card/50 border-border/30">
          <CardContent className="p-3 space-y-2">
            <p className="text-sm font-medium">Rate this seller</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star className={`w-5 h-5 ${s <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                </button>
              ))}
            </div>
            <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="Optional comment..." />
            <Button size="sm" onClick={submitReview} disabled={submittingReview} className="w-full">
              {submittingReview ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Submit Review
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
