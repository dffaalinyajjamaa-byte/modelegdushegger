import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Trash2, Eye, ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  status: string;
  address: string | null;
  created_at: string;
}

export default function AdminMarketplace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const { toast } = useToast();

  useEffect(() => { fetchProducts(); }, [filter]);

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase.from('marketplace_products').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    setProducts((data || []) as Product[]);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('marketplace_products').update({ status }).eq('id', id);
    if (!error) {
      toast({ title: `Product ${status}` });
      fetchProducts();
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this listing?')) return;
    await supabase.from('marketplace_products').delete().eq('id', id);
    fetchProducts();
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-600',
    approved: 'bg-green-500/10 text-green-600',
    rejected: 'bg-red-500/10 text-red-600'
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="capitalize text-xs">
            {f}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : products.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No {filter} listings</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {products.map(product => (
            <Card key={product.id}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{product.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[product.status] || ''}`}>
                        {product.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{product.category} · {product.type} · ETB {product.price}</p>
                    {product.address && <p className="text-[10px] text-muted-foreground mt-0.5">📍 {product.address}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {product.status === 'pending' && (
                    <>
                      <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => updateStatus(product.id, 'approved')}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => updateStatus(product.id, 'rejected')}>
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteProduct(product.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
