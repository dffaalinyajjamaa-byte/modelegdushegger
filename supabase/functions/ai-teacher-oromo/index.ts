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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("AI Teacher request received");
    console.log("Message:", message?.substring(0, 100));
    console.log("Language:", language);
    
    // Build messages array from conversation history
    const messages = [
      ...(conversationHistory || []),
      { role: "user", content: message }
    ];

    // System prompt - adapts based on language preference
    const systemPrompt = language === 'english' 
      ? `You are an AI teacher for Oro Digital School. Provide clear, educational responses.

Your role:
- Teach students effectively
- Answer questions clearly
- Provide detailed explanations
- Be supportive and encouraging

Analyze the student's tone for signs of frustration and provide encouraging feedback when needed.`
      : `Ati barsiisaa AI kan Mana Barumsaa Dijitaalaa Oro ti. Afaan Oromootiin barumsa kenni.
    
Gaheen kee:
- Barattootaaf barumsa gaarii kenni
- Gaaffiilee isaanii deebisi
- Ibsa bal'aa fi hubatamaa kenni
- Barsiisaa tolaa ta'ii barattootaaf deggersa godhi

Yoo barattichi dhibaa qabaachu fakkaate, jajjabeessi.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: false, // Change to non-streaming for easier processing
      }),
    });

    console.log("AI gateway response status:", response.status);
    console.log("AI gateway response OK:", response.ok);
    
    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(JSON.stringify({ error: "Maaloo yeroo muraasa booda yaali. (Rate limit exceeded)" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(JSON.stringify({ error: "Tajaajilli kun yeroo ammaa hin argamu. (Payment required)" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Dogoggorri uumame. Maaloo irra deebi'ii yaali." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || "Dhiifama, deebii kennuu hin danda'u.";
    
    console.log("AI response received, length:", aiResponse.length);
    
    // Detect emotion/frustration in user message
    const frustrationKeywords = ['difficult', 'hard', 'don\'t understand', 'confused', 'frustrated', 
                                   'rakkoo', 'ulfaata', 'hin hubadhu', 'burjaajessee'];
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