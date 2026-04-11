import { useState, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Download, Award, ArrowLeft, Share2 } from 'lucide-react';

interface CertificateViewProps {
  user: User;
  grade: string;
  subjectsCompleted: string[];
  issuedAt: string;
  onBack: () => void;
}

export default function CertificateView({
  user, grade, subjectsCompleted, issuedAt, onBack
}: CertificateViewProps) {
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student';
  const formattedDate = new Date(issuedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const handleDownload = useCallback(() => {
    setDownloading(true);
    try {
      window.print();
    } finally {
      setDownloading(false);
    }
  }, []);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Actions */}
      <div className="flex gap-3 print:hidden">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button onClick={handleDownload} disabled={downloading} className="ml-auto">
          <Download className="w-4 h-4 mr-2" />
          {downloading ? 'Preparing...' : 'Download Certificate'}
        </Button>
      </div>

      {/* Certificate */}
      <div
        ref={certRef}
        className="relative overflow-hidden rounded-2xl mx-auto"
        style={{
          background: 'linear-gradient(145deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 100%)',
          padding: '3px',
          maxWidth: '800px',
        }}
      >
        {/* Gold border effect */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #c9a84c 0%, #f0d78c 25%, #c9a84c 50%, #f0d78c 75%, #c9a84c 100%)',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'xor',
            WebkitMaskComposite: 'xor',
            padding: '3px',
          }}
        />

        <div
          className="relative rounded-2xl p-8 md:p-12"
          style={{
            background: 'linear-gradient(145deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 100%)',
          }}
        >
          {/* Corner ornaments */}
          {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => (
            <div
              key={pos}
              className="absolute w-16 h-16"
              style={{
                ...(pos.includes('top') ? { top: 16 } : { bottom: 16 }),
                ...(pos.includes('left') ? { left: 16 } : { right: 16 }),
                borderColor: '#c9a84c',
                ...(pos === 'top-left' && { borderTop: '2px solid', borderLeft: '2px solid' }),
                ...(pos === 'top-right' && { borderTop: '2px solid', borderRight: '2px solid' }),
                ...(pos === 'bottom-left' && { borderBottom: '2px solid', borderLeft: '2px solid' }),
                ...(pos === 'bottom-right' && { borderBottom: '2px solid', borderRight: '2px solid' }),
              }}
            />
          ))}

          {/* Logo + Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #c9a84c, #f0d78c)',
                boxShadow: '0 4px 20px rgba(201, 168, 76, 0.3)',
              }}
            >
              <Award className="w-8 h-8 text-black" />
            </div>
            <div>
              <h3
                className="text-lg font-bold tracking-wider"
                style={{ color: '#c9a84c' }}
              >
                J-HOPE TECHNOLOGIES
              </h3>
              <p className="text-xs tracking-widest" style={{ color: '#f0d78c80' }}>
                MODEL EGDU LEARNING PLATFORM
              </p>
            </div>
          </div>

          {/* Divider */}
          <div
            className="h-px w-full mb-8"
            style={{
              background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)',
            }}
          />

          {/* Title */}
          <div className="text-center mb-8">
            <p
              className="text-sm tracking-[0.4em] uppercase mb-2"
              style={{ color: '#f0d78c80' }}
            >
              This is to certify that
            </p>
            <h1
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{
                background: 'linear-gradient(135deg, #c9a84c, #f0d78c, #c9a84c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: 'Georgia, serif',
              }}
            >
              CERTIFICATE
            </h1>
            <p
              className="text-xl tracking-widest"
              style={{ color: '#c9a84c' }}
            >
              OF EXCELLENCE
            </p>
          </div>

          {/* Student Name */}
          <div className="text-center mb-6">
            <p className="text-sm mb-2" style={{ color: '#a0aec0' }}>
              Awarded to
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold mb-2"
              style={{
                color: '#ffffff',
                fontFamily: 'Georgia, serif',
                textShadow: '0 2px 10px rgba(201, 168, 76, 0.2)',
              }}
            >
              {userName}
            </h2>
            <div
              className="h-px w-48 mx-auto"
              style={{ background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)' }}
            />
          </div>

          {/* Details */}
          <div className="text-center mb-8">
            <p className="text-sm mb-4" style={{ color: '#a0aec0' }}>
              For successfully completing all required subjects in
            </p>
            <div
              className="inline-block px-6 py-2 rounded-full mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.15), rgba(240, 215, 140, 0.1))',
                border: '1px solid rgba(201, 168, 76, 0.3)',
              }}
            >
              <span
                className="text-xl font-bold tracking-wider"
                style={{ color: '#f0d78c' }}
              >
                {grade}
              </span>
            </div>

            {/* Subjects */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {subjectsCompleted.map((subject) => (
                <span
                  key={subject}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: 'rgba(201, 168, 76, 0.1)',
                    border: '1px solid rgba(201, 168, 76, 0.2)',
                    color: '#f0d78c',
                  }}
                >
                  ✓ {subject}
                </span>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div
            className="h-px w-full mb-8"
            style={{
              background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)',
            }}
          />

          {/* Footer: Date + Signature */}
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs mb-1" style={{ color: '#a0aec080' }}>
                Date of Completion
              </p>
              <p className="text-sm font-medium" style={{ color: '#f0d78c' }}>
                {formattedDate}
              </p>
            </div>

            <div className="text-right">
              <p
                className="text-2xl mb-1"
                style={{
                  fontFamily: "'Dancing Script', 'Brush Script MT', cursive",
                  color: '#c9a84c',
                  fontStyle: 'italic',
                }}
              >
                Hope
              </p>
              <div
                className="h-px w-32 mb-1"
                style={{ background: '#c9a84c' }}
              />
              <p className="text-xs" style={{ color: '#a0aec0' }}>
                Hope, CEO
              </p>
              <p className="text-xs" style={{ color: '#a0aec080' }}>
                J-Hope Technologies
              </p>
            </div>
          </div>

          {/* Watermark */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]"
          >
            <Award className="w-64 h-64" style={{ color: '#c9a84c' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
