import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, language = 'om' } = await req.json();

    if (!audio) {
      throw new Error('Audio data is required');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Language-specific prompts for better transcription
    const languagePrompts: Record<string, string> = {
      'om': 'Transcribe this audio accurately in Oromo (Afaan Oromoo). Return only the transcribed text without any additional commentary.',
      'en': 'Transcribe this audio accurately in English. Return only the transcribed text without any additional commentary.',
      'am': 'Transcribe this audio accurately in Amharic (አማርኛ). Return only the transcribed text without any additional commentary.',
    };

    const prompt = languagePrompts[language] || languagePrompts['om'];

    console.log(`[Gemini STT] Processing audio for language: ${language}`);

    // Use Gemini's multimodal capabilities for speech-to-text
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                },
                {
                  inline_data: {
                    mime_type: 'audio/webm',
                    data: audio
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini STT] API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const transcribedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log(`[Gemini STT] Transcription successful: ${transcribedText.substring(0, 100)}...`);

    return new Response(
      JSON.stringify({ text: transcribedText.trim() }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Gemini STT] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
