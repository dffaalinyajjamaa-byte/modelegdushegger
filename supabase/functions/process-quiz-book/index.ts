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
    const { bookId, pdfUrl, language } = await req.json();

    if (!bookId || !pdfUrl) {
      return new Response(
        JSON.stringify({ error: 'bookId and pdfUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update status to processing
    await supabase.from('auto_quiz_books').update({ processing_status: 'processing' }).eq('id', bookId);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error('GEMINI_API_KEY not configured');

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    // Fetch PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error('Failed to fetch PDF file');

    const pdfBuffer = await response.arrayBuffer();
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    console.log('PDF fetched, size:', pdfBuffer.byteLength);

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Extract text and detect units
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64Pdf
        }
      },
      {
        text: `Analyze this educational textbook PDF. Extract ALL content and organize it by units/chapters.

Return a JSON response with this exact structure:
{
  "units": [
    {
      "unit_number": 1,
      "unit_title": "Title of Unit/Chapter",
      "content_chunks": [
        "chunk of text content (200-5000 words each)"
      ]
    }
  ]
}

Rules:
- Detect all units/chapters/sections in the book
- Split content into chunks of 200-5000 words each
- Preserve the original language of the book (${language || 'detect automatically'})
- Include ALL educational content - definitions, explanations, examples, exercises
- Keep mathematical formulas and scientific terms accurate
- If no clear unit structure, create logical sections based on topics
- Return ONLY valid JSON, no markdown`
      }
    ]);

    const responseText = result.response.text();
    console.log('Gemini response length:', responseText.length);

    // Parse JSON from response
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse Gemini response:', e);
      await supabase.from('auto_quiz_books').update({ processing_status: 'failed' }).eq('id', bookId);
      throw new Error('Failed to parse book structure');
    }

    // Store units and chunks
    for (const unit of parsed.units || []) {
      const { data: unitData, error: unitError } = await supabase
        .from('auto_quiz_units')
        .insert({
          book_id: bookId,
          unit_number: unit.unit_number,
          unit_title: unit.unit_title,
          display_order: unit.unit_number
        })
        .select('id')
        .single();

      if (unitError) {
        console.error('Error inserting unit:', unitError);
        continue;
      }

      // Insert chunks for this unit
      const chunks = unit.content_chunks || [];
      for (let i = 0; i < chunks.length; i++) {
        await supabase.from('auto_quiz_chunks').insert({
          book_id: bookId,
          unit_id: unitData.id,
          content: chunks[i],
          chunk_index: i
        });
      }
    }

    // Update status to completed
    await supabase.from('auto_quiz_books').update({ processing_status: 'completed' }).eq('id', bookId);

    return new Response(
      JSON.stringify({ success: true, unitsCount: (parsed.units || []).length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error processing quiz book:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process book';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
