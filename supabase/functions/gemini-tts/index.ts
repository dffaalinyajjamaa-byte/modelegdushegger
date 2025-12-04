import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gemini voices available for TTS
const GEMINI_VOICES = ['Puck', 'Zephyr', 'Kore', 'Charon', 'Fenrir'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice, outputLanguage } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log("Gemini TTS request received");
    console.log("Text length:", text.length);
    console.log("Voice:", voice || 'Puck');
    console.log("Output language:", outputLanguage || 'oromo');

    // Use specified voice or default to Puck
    const selectedVoice = voice && GEMINI_VOICES.includes(voice) ? voice : 'Puck';
    
    // Prepare system instruction based on output language
    const languageInstruction = outputLanguage === 'english' 
      ? 'Respond in English only. Translate any non-English input to English before speaking.'
      : 'Respond in Oromo (Afaan Oromoo) only. Translate any non-Oromo input to Oromo before speaking.';

    // Use Gemini to generate speech-optimized text first
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${languageInstruction}\n\nConvert this text to natural speech-ready format in the target language. Keep it natural and conversational:\n\n${text}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", response.status, error);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const processedText = data.candidates?.[0]?.content?.parts?.[0]?.text || text;

    console.log("Text processed for TTS, length:", processedText.length);

    // For now, return the processed text - browser's Web Speech API will handle TTS
    // In future, we can integrate with Gemini's native audio when available
    return new Response(
      JSON.stringify({ 
        text: processedText,
        voice: selectedVoice,
        language: outputLanguage || 'oromo'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error("Error in gemini-tts function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});