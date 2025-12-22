import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use Gemini 2.5 flash with latest native audio for Oromo TTS (December 2025)
const AUDIO_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language, voice } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log("[Gemini TTS] Request received");
    console.log("[Gemini TTS] Text length:", text.length);
    console.log("[Gemini TTS] Language:", language || 'om');

    const selectedVoice = voice || 'Kore';
    const lang = language || 'om';
    
    // Build system instruction based on language
    let systemInstruction = '';
    if (lang === 'om') {
      systemInstruction = `You are an Oromo language speaker generating SPEECH ONLY.

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

Read the following text aloud in native Oromo pronunciation:`;
    } else if (lang === 'am') {
      systemInstruction = `You are an Amharic language speaker generating SPEECH ONLY.
Read the following text aloud in native Amharic pronunciation with proper Ethiopian accent:`;
    } else {
      systemInstruction = `You are an English speaker generating SPEECH ONLY.
Read the following text aloud clearly:`;
    }

    // Use Gemini with native audio output
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/models/${AUDIO_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [{
            parts: [{ text: text }]
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
      console.error("[Gemini TTS] API error:", response.status, error);
      
      // Fallback to text-based response for browser TTS
      console.log("[Gemini TTS] Falling back to text mode");
      return new Response(
        JSON.stringify({ 
          text: text,
          language: lang,
          fallback: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Extract audio data from response
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    
    if (audioData?.data) {
      console.log("[Gemini TTS] Audio generated successfully");
      console.log("[Gemini TTS] MIME type:", audioData.mimeType);
      
      // Convert PCM to playable format
      const mimeType = audioData.mimeType || 'audio/pcm;rate=24000';
      
      return new Response(
        JSON.stringify({ 
          audioData: audioData.data,
          mimeType: mimeType,
          language: lang,
          voice: selectedVoice
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If no audio in response, return text for browser TTS
    console.log("[Gemini TTS] No audio data, returning text");
    return new Response(
      JSON.stringify({ 
        text: text,
        language: lang,
        fallback: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("[Gemini TTS] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
