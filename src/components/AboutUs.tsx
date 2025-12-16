import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Instagram, Globe, Heart } from 'lucide-react';
import logo from '@/assets/model-egdu-logo.png';

export default function AboutUs() {
  const socialLinks = {
    telegram: 'https://t.me/modelegdu',
    instagram: 'https://instagram.com/modelegdu',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      {/* Company Info */}
      <Card className="border-primary/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={logo} 
              alt="Model Egdu" 
              className="w-24 h-24 rounded-full shadow-lg border-4 border-primary/20"
            />
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            About Model Egdu
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Model Egdu is an AI-Powered Learning Platform designed specifically for Ethiopian students. 
            Our mission is to make quality education accessible to every student through innovative technology.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Heart className="w-4 h-4 text-red-500" />
            <span>Empowering Ethiopian Youth Through Education</span>
          </div>
        </CardContent>
      </Card>

      {/* Co-Founder Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leadership</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
            <Avatar className="w-20 h-20 border-4 border-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xl font-bold">
                AD
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-lg">Abdi Defalign</h3>
              <p className="text-primary font-medium">Co-Founder & CEO</p>
              <p className="text-sm text-muted-foreground mt-1">
                Passionate about transforming education in Ethiopia through technology
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Media Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connect With Us</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={() => window.open(socialLinks.telegram, '_blank')}
          >
            <MessageCircle className="w-5 h-5 text-blue-500" />
            <span>Follow us on Telegram</span>
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={() => window.open(socialLinks.instagram, '_blank')}
          >
            <Instagram className="w-5 h-5 text-pink-500" />
            <span>Follow us on Instagram</span>
          </Button>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground py-4">
        <p>© 2025 Model Egdu. All rights reserved.</p>
        <p className="mt-1">Made with ❤️ for Ethiopian Students</p>
      </div>
    </div>
  );
}
