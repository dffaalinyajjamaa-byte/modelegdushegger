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
    const { message } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    
    if (!deepseekApiKey) {
      console.error('DEEPSEEK_API_KEY is not configured');
      throw new Error('API key not configured');
    }

    console.log('Sending request to DeepSeek API');

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI teacher assistant for Ethiopian students. You support multiple languages including Afaan Oromoo, English, and other Ethiopian languages. Provide clear, educational responses to help students learn about Math (Herrega), Science (Saayinsii), and other subjects. Be patient, encouraging, and explain concepts in a way that is easy to understand. When responding in Afaan Oromoo, use proper grammar and be culturally appropriate. Answer all questions in real-time with comprehensive, accurate information.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received response from DeepSeek');
    
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response content from AI');
    }

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
