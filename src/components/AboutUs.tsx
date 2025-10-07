import { Mail, Phone, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AboutUs() {
  return (
    <footer className="bg-card border-t mt-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">Email</h4>
                  <a href="mailto:milonmax146@gmail.com" className="text-sm text-muted-foreground hover:text-primary transition">
                    milonmax146@gmail.com
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">Phone</h4>
                  <a href="tel:0912208187" className="text-sm text-muted-foreground hover:text-primary transition">
                    0912208187
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Send className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">Telegram</h4>
                  <a 
                    href="https://t.me/model_egdu_community" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary transition"
                  >
                    @model_egdu_community
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>© 2025 Model Egdu. All rights reserved.</p>
          <p className="mt-2">AI-Powered Learning Platform for Ethiopian Students</p>
        </div>
      </div>
    </footer>
  );
}