import { supabase } from '@/integrations/supabase/client';

export interface GroundingUrl {
  uri: string;
  title: string;
}

export interface TeacherResponse {
  text: string;
  groundingChunks: Array<{
    web?: { uri: string; title?: string };
    maps?: { uri: string; title?: string };
  }>;
}

export interface ImageResponse {
  imageUrl: string;
}

const getSystemPrompt = (language: string = 'Afaan Oromoo') => `You are Model Egdu, an advanced AI teacher for Ethiopian students.
CORE RULE: You understand ALL input languages (English, Amharic, Oromo, etc.), but you MUST RESPOND ONLY IN ${language.toUpperCase()}.

INSTRUCTIONS:
1. If the user asks in English, Amharic, or any other language, TRANSLATE your reasoning and answer in ${language}.
2. Simplify complex concepts for Grade 8 students.
3. Focus on Math (Herrega) and Science (Saayinsii).
4. Be encouraging and helpful.
5. If you need to use a technical term (like 'Atom' or 'Photosynthesis'), you can keep the English term in brackets but explain it in ${language}.`;

/**
 * Generate an AI teacher response using Lovable AI Gateway
 * Supports Google Search grounding for real-time information
 */
export const generateTeacherResponse = async (
  prompt: string,
  language: string = 'Afaan Oromoo',
  useSearch: boolean = false,
  useMaps: boolean = false,
  location?: { lat: number; lng: number }
): Promise<TeacherResponse> => {
  try {
    const systemInstruction = getSystemPrompt(language);
    
    // Call the ai-teacher-oromo edge function which uses Lovable AI
    const { data, error } = await supabase.functions.invoke('ai-teacher-oromo', {
      body: {
        message: prompt,
        language: language.toLowerCase().includes('oromo') ? 'oromo' : 
                  language.toLowerCase().includes('amharic') ? 'amharic' : 'english',
        useSearch,
        useMaps,
        location,
        systemPrompt: systemInstruction,
      }
    });

    if (error) {
      console.error('Gemini service error:', error);
      throw new Error(error.message || 'Failed to generate response');
    }

    return {
      text: data?.response || 'Sorry, I could not generate a response.',
      groundingChunks: data?.groundingChunks || []
    };
  } catch (e) {
    console.error("Teacher Response Error", e);
    throw e;
  }
};

/**
 * Generate an educational image using Lovable AI Gateway
 */
export const generateEducationalImage = async (prompt: string): Promise<string> => {
  try {
    // Call edge function for image generation
    const { data, error } = await supabase.functions.invoke('ai-teacher-oromo', {
      body: {
        message: prompt,
        generateImage: true,
      }
    });

    if (error) {
      console.error('Image generation error:', error);
      throw new Error(error.message || 'Failed to generate image');
    }

    if (data?.imageUrl) {
      return data.imageUrl;
    }

    throw new Error("No image generated");
  } catch (e) {
    console.error("Image Gen Error", e);
    throw e;
  }
};
