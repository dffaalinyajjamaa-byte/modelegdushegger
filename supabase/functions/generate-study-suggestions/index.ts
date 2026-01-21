import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trackId, lyricsText, subject, language } = await req.json();
    
    if (!trackId || !lyricsText) {
      return new Response(
        JSON.stringify({ error: 'Track ID and lyrics are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating study suggestions for track:', trackId);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are an educational consultant helping students maximize their learning through music-based study.

SONG LYRICS:
${lyricsText}

SUBJECT: ${subject || 'Educational content'}
LANGUAGE: ${language || 'English'}

Based on this educational song, provide personalized study recommendations.

OUTPUT FORMAT (JSON):
{
  "best_listening_time": "One of: 'Morning (6-9 AM) - Fresh mind for new concepts', 'Afternoon (2-5 PM) - Reinforcement time', 'Evening (7-9 PM) - Before sleep for memory consolidation', 'During revision - Before exams'",
  "recommended_repeats": <number between 3-10 based on content complexity>,
  "memory_tip": "<A specific memory technique for this content, like a mnemonic, visualization, or association>",
  "quiz_suggestion": "<A self-test question students can use to check their understanding>",
  "next_action": "<Specific next step after listening, like 'Try solving practice problems on this topic' or 'Discuss key concepts with a study partner'>"
}

Consider:
1. The complexity of the educational content
2. Best times for memory retention
3. Active recall strategies
4. The student's grade level (7-12)

Output ONLY valid JSON, no additional text.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse the JSON response
    let suggestions;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing suggestions:', parseError);
      // Provide default suggestions
      suggestions = {
        best_listening_time: 'Morning (6-9 AM) - Fresh mind for new concepts',
        recommended_repeats: 5,
        memory_tip: 'Listen actively and try to sing along to reinforce the content in your memory.',
        quiz_suggestion: 'After listening, try to recall the main concepts covered in the song.',
        next_action: 'Review your notes on this topic and identify areas that need more practice.'
      };
    }

    // Save suggestions to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: insertedSuggestion, error: insertError } = await supabase
      .from('study_music_suggestions')
      .insert({
        track_id: trackId,
        best_listening_time: suggestions.best_listening_time,
        recommended_repeats: suggestions.recommended_repeats,
        memory_tip: suggestions.memory_tip,
        quiz_suggestion: suggestions.quiz_suggestion,
        next_action: suggestions.next_action
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving suggestions:', insertError);
    } else {
      console.log('Suggestions saved successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        suggestions,
        savedToDatabase: !insertError
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating suggestions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate suggestions';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});