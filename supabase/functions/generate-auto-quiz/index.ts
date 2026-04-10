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
    const { bookId, unitIds, questionCount, language } = await req.json();

    if (!bookId || !questionCount) {
      return new Response(
        JSON.stringify({ error: 'bookId and questionCount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch chunks based on selection
    let query = supabase.from('auto_quiz_chunks').select('content, unit_id').eq('book_id', bookId);
    
    if (unitIds && unitIds.length > 0) {
      query = query.in('unit_id', unitIds);
    }

    const { data: chunks, error: chunksError } = await query.order('chunk_index');
    if (chunksError) throw chunksError;

    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No content found for selected book/units' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Combine chunks (limit to avoid token overflow)
    const combinedContent = chunks.map(c => c.content).join('\n\n').slice(0, 100000);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error('GEMINI_API_KEY not configured');

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const quizLanguage = language || 'the same language as the content';

    const result = await model.generateContent([
      {
        text: `You are a quiz generator for Ethiopian students. Generate exactly ${questionCount} multiple-choice questions based STRICTLY on the following textbook content.

RULES:
- 90% of questions MUST come directly from the provided text
- 10% can use closely related knowledge to the book content
- Each question must have exactly 4 options (A, B, C, D)
- Only ONE correct answer per question
- Explanations must reference the book content
- Questions must be in ${quizLanguage}
- For mathematics: include geometry, calculations, and problem-solving
- Vary difficulty: 30% easy, 50% medium, 20% hard
- NO duplicate questions
- Clear, unambiguous wording

TEXTBOOK CONTENT:
${combinedContent}

Return ONLY a valid JSON array with this structure:
[
  {
    "question": "Question text here?",
    "options": {
      "A": "Option A text",
      "B": "Option B text",
      "C": "Option C text",
      "D": "Option D text"
    },
    "answer": "A",
    "explanation": "Explanation referencing book content"
  }
]

Generate exactly ${questionCount} questions. Return ONLY the JSON array, no markdown.`
      }
    ]);

    const responseText = result.response.text();
    
    let questions;
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found');
      questions = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse quiz response:', e);
      throw new Error('Failed to generate quiz questions');
    }

    // Validate question count
    if (questions.length < questionCount) {
      console.warn(`Generated ${questions.length} questions instead of ${questionCount}`);
    }

    return new Response(
      JSON.stringify({ success: true, questions: questions.slice(0, questionCount) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating quiz:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate quiz';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
