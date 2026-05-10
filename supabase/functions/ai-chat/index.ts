import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Detects whether the user is asking about identity / who built the AI.
// Supports English, Amharic, Afaan Oromoo.
const IDENTITY_REGEX = new RegExp(
  [
    "what(?:'?s| is) your name",
    "who are you",
    "who (?:made|built|created|developed|designed) you",
    "tell me about yourself",
    "introduce yourself",
    // Amharic
    "ስምህ", "ስምሽ", "ማን ሰራህ", "ማን ሰራሽ", "ማን ነህ", "ማን ነሽ",
    // Afaan Oromoo
    "maqaan kee", "maqaa keessan", "eenyu", "eenyutu si tolche", "ati eenyu"
  ].join("|"),
  "i"
);

// Strip any sentence that mentions the developer / J Hope when not asked.
function stripIdentitySentences(text: string): string {
  if (!text) return text;
  const banned = /(j[\s\-_.]?hope|built by|developed by|created by|made by|j hope technolog)/i;
  return text
    .split(/(?<=[.!?\u1362])\s+/)
    .filter((s) => !banned.test(s))
    .join(' ')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    if (!message) throw new Error('Message is required');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const isIdentityQuestion = IDENTITY_REGEX.test(message);

    const systemPrompt = `You are Model Egdu's AI Teacher for Ethiopian students (Grade 6 & 8).
You support Afaan Oromoo, Amharic, and English. Auto-detect the user's language and reply in it.
Be patient, clear, and encouraging.

CRITICAL IDENTITY RULES:
- ${isIdentityQuestion
        ? "The user IS asking about your identity. You MAY say: \"I am Model Egdu's AI Teacher, developed by J Hope Technologies.\" — say it ONCE, briefly."
        : "The user is NOT asking about your identity. NEVER mention J Hope, who built/developed/created you, your name, or that you are an AI in your reply. Just answer the educational question directly."
      }
- Never repeat your identity or creator in follow-up replies unless the user asks again.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse: string = data.choices?.[0]?.message?.content || '';
    if (!aiResponse) throw new Error('No response content from AI');

    // Post-filter: if the user did NOT ask about identity, strip any creator/identity sentences.
    if (!isIdentityQuestion) {
      aiResponse = stripIdentitySentences(aiResponse);
    }

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
