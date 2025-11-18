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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("AI Teacher Oromo request received");
    console.log("Messages count:", messages?.length || 0);
    console.log("Last message:", messages[messages.length - 1]?.content?.substring(0, 100));

    // System prompt for Afaan Oromo only responses
    const systemPrompt = `Ati barsiisaa AI kan Mana Barumsaa Dijitaalaa Oro kan Afaan Oromootiin qofa deebii kennitu. 
    
Gaheen kee:
- Barattootaaf barumsa gaarii kenni
- Gaaffiilee isaanii Afaan Oromootiin deebisi
- Ibsa bal'aa fi hubatamaa kenni
- Barsiisaa tolaa ta'ii barattootaaf deggersa godhi

SEERA BARBAACHISAA: Yeroo hunda Afaan Oromootiin qofa dubbadhu. Afaan biraa hin fayyadamin. Yoo gaaffiin Afaan birootiin si gaafate, Afaan Oromootiin deebii kenni.

Fakkeenya:
Gaaffii: "What is mathematics?"
Deebii kee: "Herregni jechuun qoratama lakkoofsaa fi bocawwan isaa ti. Herregni baay'ina, bocaa, iddoo fi jijjiiramaa qorata."`;

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
        stream: true,
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

    console.log("Streaming response from AI gateway - starting stream");
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
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