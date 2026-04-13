import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Loader2, MapPin } from 'lucide-react';

interface ProductUploadProps {
  user: User;
  onBack: () => void;
  onSuccess: () => void;
}

export default function ProductUpload({ user, onBack, onSuccess }: ProductUploadProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('books');
  const [type, setType] = useState('sell');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('good');
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const { toast } = useToast();

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const data = await res.json();
          setAddress(data.display_name?.split(',').slice(0, 3).join(', ') || 'Location detected');
        } catch { setAddress('Location detected'); }
        setLocating(false);
      },
      () => { toast({ title: 'Location access denied' }); setLocating(false); }
    );
  };

  const handleSubmit = async () => {
    if (!title || !price) { toast({ title: 'Title and price required', variant: 'destructive' }); return; }
    setUploading(true);
    try {
      const imageUrls: string[] = [];
      for (const img of images.slice(0, 4)) {
        const fileName = `${user.id}/${Date.now()}_${img.name}`;
        const { error } = await supabase.storage.from('marketplace-images').upload(fileName, img);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('marketplace-images').getPublicUrl(fileName);
          imageUrls.push(publicUrl);
        }
      }

      const { error } = await supabase.from('marketplace_products').insert({
        user_id: user.id,
        title, description: description || null, category, type,
        price: parseFloat(price), condition,
        images: imageUrls.length > 0 ? imageUrls : null,
        latitude: lat, longitude: lng, address: address || null,
        status: 'pending'
      });
      if (error) throw error;

      toast({ title: '✅ Listing submitted!', description: 'Waiting for admin approval.' });
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <h2 className="text-xl font-bold">Sell or Rent</h2>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Grade 8 Math Textbook" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe condition, edition..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="books">Books</SelectItem>
                  <SelectItem value="worksheets">Worksheets</SelectItem>
                  <SelectItem value="rentals">Rentals</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sell">Sell</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price (ETB) *</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="like-new">Like New</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Photos (up to 4)</Label>
            <Input type="file" accept="image/*" multiple onChange={e => setImages(Array.from(e.target.files || []).slice(0, 4))} />
            {images.length > 0 && <p className="text-xs text-muted-foreground mt-1">{images.length} photo(s) selected</p>}
          </div>
          <div>
            <Label>Location</Label>
            <Button variant="outline" size="sm" className="w-full mt-1" onClick={getLocation} disabled={locating}>
              {locating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
              {address || 'Detect my location'}
            </Button>
          </div>
          <Button onClick={handleSubmit} disabled={uploading || !title || !price} className="w-full h-12">
            {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : <><Upload className="w-4 h-4 mr-2" />Submit Listing</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
