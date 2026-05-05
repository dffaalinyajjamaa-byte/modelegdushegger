import {
  ThumbsUp, Heart, Flame, Hand, Smile, Frown,
  Landmark, Swords, Theater, Music, FlaskConical, Globe2, Leaf, Sparkles,
  BookOpen, Calculator, Atom, FlaskRound, Languages, Pencil,
  CheckCircle2, AlertTriangle, XCircle, Info,
  Edit, Trash2, Share2, Upload, Download, Plus, Search, Settings,
  File, FileText, Folder, Image as ImageIcon, Mail, MessageSquare,
  Trophy, Medal, Award, Star, Crown,
  Play, Pause, Volume2, Mic, Camera, Video,
  type LucideIcon,
} from 'lucide-react';

export const iconMap = {
  // Reactions
  like: ThumbsUp,
  love: Heart,
  fire: Flame,
  clap: Hand,
  laugh: Smile,
  sad: Frown,

  // Relax / categories
  history: Landmark,
  war: Swords,
  drama: Theater,
  music: Music,
  science: FlaskConical,
  geography: Globe2,
  nature: Leaf,
  magic: Sparkles,

  // Subjects
  reading: BookOpen,
  math: Calculator,
  physics: Atom,
  chemistry: FlaskRound,
  language: Languages,
  writing: Pencil,

  // Status
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,

  // Actions
  edit: Edit,
  delete: Trash2,
  share: Share2,
  upload: Upload,
  download: Download,
  add: Plus,
  search: Search,
  settings: Settings,

  // Files
  file: File,
  document: FileText,
  folder: Folder,
  image: ImageIcon,
  mail: Mail,
  message: MessageSquare,

  // Achievements
  trophy: Trophy,
  medal: Medal,
  award: Award,
  star: Star,
  crown: Crown,

  // Media
  play: Play,
  pause: Pause,
  volume: Volume2,
  mic: Mic,
  camera: Camera,
  video: Video,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof iconMap;
