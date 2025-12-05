import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use Gemini 2.5 native audio model for true Oromo pronunciation
const MODEL = "gemini-2.5-flash-preview-native-audio-dialog";

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

    console.log("Gemini Native Audio TTS request");
    console.log("Text length:", text.length);
    console.log("Voice:", voice || 'Puck');

    const selectedVoice = voice || 'Puck';
    
    // System instruction for native Oromo pronunciation
    const systemInstruction = `You are an Oromo language speaker generating SPEECH ONLY.

CRITICAL PRONUNCIATION RULES FOR OROMO:
- 'dh' = soft d sound (like in "dhugaa" - pronounced "dhu-gaa")
- 'ch' = like 'ch' in "church"
- 'ph' = aspirated p with breath
- 'ny' = like Spanish 'ñ' (like in "nyaata")
- Double vowels (aa, ee, ii, oo, uu) = LONG vowels, hold them longer
- 'q' = glottal stop from back of throat
- 'x' = ejective t sound

SPEAK LIKE A NATIVE OROMO SPEAKER:
- Natural Oromo rhythm and intonation
- Proper stress on syllables
- Clear pronunciation of all Oromo sounds
- Do NOT pronounce like English - use OROMO sounds

Output speech audio only. No text response.`;

    // Use Gemini with native audio output for proper Oromo pronunciation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [{
            parts: [{ text: `Speak this text in native Oromo pronunciation:\n\n${text}` }]
          }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice }
              }
            }
          }
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", response.status, error);
      
      // Fallback to text translation if native audio fails
      console.log("Falling back to text-only mode");
      return await fallbackToText(text, GEMINI_API_KEY, selectedVoice);
    }

    const data = await response.json();
    
    // Extract audio data from response
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    
    if (audioData?.data) {
      console.log("Native audio generated successfully, format:", audioData.mimeType);
      
      return new Response(
        JSON.stringify({ 
          audioData: audioData.data,
          mimeType: audioData.mimeType || 'audio/pcm;rate=24000',
          voice: selectedVoice,
          language: 'oromo'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If no audio in response, fall back to text
    console.log("No audio data in response, falling back to text");
    return await fallbackToText(text, GEMINI_API_KEY, selectedVoice);

  } catch (error) {
    console.error("Error in gemini-tts function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fallback function to return Oromo text for Web Speech API
async function fallbackToText(text: string, apiKey: string, voice: string) {
  try {
    const languageInstruction = `Afaan Oromootiin QOFA deebisi fi akka Oromoon dubbatu sirriitti sagalee-si.

SEERA SAGALEE:
- 'dh' = sagalee laafaa (fkn: dhugaa = dhu-gaa)
- Dubbachiiftuu dachaa = dheeraa (aa, ee, ii, oo, uu)
- 'q' = glottal stop
- 'x' = ejective 't'
- 'ny' = akka Spanish 'ñ'

Barreeffama kana gara Afaan Oromoo jijjiiri.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      throw new Error('Fallback text generation failed');
    }

    const data = await response.json();
    const processedText = data.candidates?.[0]?.content?.parts?.[0]?.text || text;

    return new Response(
      JSON.stringify({ 
        text: processedText,
        voice: voice,
        language: 'oromo',
        fallback: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Fallback error:", error);
    // Return original text as last resort
    return new Response(
      JSON.stringify({ 
        text: text,
        voice: voice,
        language: 'oromo',
        fallback: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
