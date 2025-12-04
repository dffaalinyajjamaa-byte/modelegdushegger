import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory, language } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log("AI Teacher request received");
    console.log("Message:", message?.substring(0, 100));
    console.log("Language:", language);
    
    // Build conversation contents for Gemini
    const contents = [];
    
    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }
    }
    
    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // System instruction - accepts all languages, outputs only Oromo or English
    const systemInstruction = language === 'english' 
      ? `You are an AI teacher for Oro Digital School. You understand ALL languages but ONLY respond in English.

Your role:
- Understand questions in ANY language (Oromo, Amharic, Arabic, etc.)
- ALWAYS respond in English only
- Teach students effectively with clear explanations
- Be supportive and encouraging
- Provide detailed, educational responses

If the student writes in another language, understand it and respond in English.
Analyze the student's tone for signs of frustration and provide encouraging feedback when needed.`
      : `Ati barsiisaa AI kan Mana Barumsaa Dijitaalaa Oro ti. Afaan hundaan hubatta garuu Afaan Oromootiin qofa deebista.

Gaheen kee:
- Gaaffii afaan kamiin (Ingiliffaa, Amaariffaa, Arabiffaa, fi kkf) hubachuu
- YEROO HUNDAA Afaan Oromootiin qofa deebisuu
- Barattootaaf barumsa gaarii fi ibsa ifa ta'e kennuu
- Barsiisaa tolaa ta'ii deggersa gochuu
- Deebii bal'aa fi barnootaa kennuu

Yoo barattichi afaan biraatiin barreesse, hubadhuutii Afaan Oromootiin deebisi.
Yoo barattichi dhibaa qabaachu fakkaate, jajjabeessi.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        }),
      }
    );

    console.log("Gemini response status:", response.status);
    
    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(JSON.stringify({ error: "Maaloo yeroo muraasa booda yaali. (Rate limit exceeded)" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Dogoggorri uumame. Maaloo irra deebi'ii yaali." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Dhiifama, deebii kennuu hin danda'u.";
    
    console.log("AI response received, length:", aiResponse.length);
    
    // Detect emotion/frustration in user message
    const frustrationKeywords = ['difficult', 'hard', 'don\'t understand', 'confused', 'frustrated', 
                                   'rakkoo', 'ulfaata', 'hin hubadhu', 'burjaajessee', 'صعب', 'ከባድ'];
    const showsFrustration = frustrationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
    
    let emotionFeedback = '';
    if (showsFrustration) {
      emotionFeedback = language === 'english' 
        ? "\n\n💪 Don't worry! Learning takes time. You're doing great - keep going!"
        : "\n\n💪 Hin yaaddofiin! Barumsi yeroo barbaada. Akka gaariitti hojjachaa jirta - itti fufi!";
    }
    
    return new Response(JSON.stringify({ 
      response: aiResponse + emotionFeedback,
      emotion: showsFrustration ? 'frustrated' : 'neutral'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error in ai-teacher-oromo function:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Dogoggorri hin beekamne uumame" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});