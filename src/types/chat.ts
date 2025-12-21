export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  image?: string;
  isError?: boolean;
  groundingUrls?: Array<{
    uri: string;
    title: string;
  }>;
}

export interface UserProfile {
  id: string;
  preferredLanguage?: string;
  grade?: string;
  name?: string;
}

export interface LiveSessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  audioData?: string;
}
