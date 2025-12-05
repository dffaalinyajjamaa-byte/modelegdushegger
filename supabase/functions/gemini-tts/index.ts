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
    const { text, voice } = await req.json();
    
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

    // Use specified voice or default to Puck (best for Oromo)
    const selectedVoice = voice && GEMINI_VOICES.includes(voice) ? voice : 'Puck';
    
    // Oromo-only instruction with proper pronunciation guide
    const languageInstruction = `Afaan Oromootiin QOFA deebisi fi akka Oromoon dubbatu sirriitti sagalee-si.

SEERA SAGALEE:
- 'dh' = sagalee laafaa (fkn: dhugaa = dhu-gaa)
- Dubbachiiftuu dachaa = dheeraa (aa, ee, ii, oo, uu)
- 'q' = glottal stop
- 'x' = ejective 't'
- 'ny' = akka Spanish 'ñ'

Barreeffama kana gara Afaan Oromoo jijjiiri fi akka OROMOON dubbatu qopheessi.
GONKUMAA akka Ingiliffaa hin sagalee-sin - Oromoo qofa!`;

    // Use Gemini to translate and prepare text for Oromo speech
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
              text: `${languageInstruction}\n\nBarreeffama kana Afaan Oromootiin qopheessi:\n\n${text}`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
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

    console.log("Text processed for TTS (Oromo), length:", processedText.length);

    // Return the processed Oromo text for browser's Web Speech API
    return new Response(
      JSON.stringify({ 
        text: processedText,
        voice: selectedVoice,
        language: 'oromo'
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
