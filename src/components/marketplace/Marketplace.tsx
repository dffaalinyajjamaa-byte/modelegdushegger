import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import MarketplaceHome from './MarketplaceHome';
import ProductUpload from './ProductUpload';
import ProductDetail from './ProductDetail';

interface MarketplaceProps {
  user: User;
  onBack: () => void;
}

export default function Marketplace({ user, onBack }: MarketplaceProps) {
  const [view, setView] = useState<'home' | 'upload' | 'detail'>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {view === 'home' && (
        <MarketplaceHome
          user={user}
          onBack={onBack}
          onUpload={() => setView('upload')}
          onProductClick={(id) => { setSelectedProductId(id); setView('detail'); }}
        />
      )}
      {view === 'upload' && (
        <ProductUpload user={user} onBack={() => setView('home')} onSuccess={() => setView('home')} />
      )}
      {view === 'detail' && selectedProductId && (
        <ProductDetail user={user} productId={selectedProductId} onBack={() => setView('home')} />
      )}
    </div>
  );
}
