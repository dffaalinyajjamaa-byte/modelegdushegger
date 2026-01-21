import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  selectedLanguage: 'om' | 'am' | 'en';
  onLanguageChange: (language: 'om' | 'am' | 'en') => void;
  disabled?: boolean;
}

const languages = [
  { id: 'om' as const, name: 'Afaan Oromoo', flag: '🇪🇹', color: 'from-green-500/20 to-emerald-500/20 border-green-500' },
  { id: 'am' as const, name: 'Amharic', flag: '🇪🇹', color: 'from-yellow-500/20 to-orange-500/20 border-yellow-500' },
  { id: 'en' as const, name: 'English', flag: '🇬🇧', color: 'from-blue-500/20 to-indigo-500/20 border-blue-500' },
];

export default function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  disabled
}: LanguageSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Choose Language</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {languages.map((lang, index) => (
          <motion.button
            key={lang.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onLanguageChange(lang.id)}
            disabled={disabled}
            className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
              selectedLanguage === lang.id
                ? `bg-gradient-to-br ${lang.color} border-opacity-100 scale-105 shadow-lg`
                : 'bg-muted/30 border-transparent hover:border-muted-foreground/30 hover:bg-muted/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="text-2xl block mb-1">{lang.flag}</span>
            <span className="text-xs font-medium">{lang.name}</span>
            {selectedLanguage === lang.id && (
              <motion.div
                layoutId="language-indicator"
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
              >
                <span className="text-[10px] text-primary-foreground">✓</span>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}