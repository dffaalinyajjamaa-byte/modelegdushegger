import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const languageNames: Record<string, string> = {
  'om': 'Afaan Oromoo',
  'am': 'Amharic',
  'en': 'English'
};

const languageInstructions: Record<string, string> = {
  'om': 'Write the lyrics entirely in Afaan Oromoo (Oromo language). Use simple, clear Oromifa words that students can understand.',
  'am': 'Write the lyrics entirely in Amharic. Use simple, clear Amharic words that students can understand.',
  'en': 'Write the lyrics entirely in English. Use simple, clear English words that students can understand.'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { extractedText, language, musicStyle, subject, title } = await req.json();
    
    if (!extractedText || !language) {
      return new Response(
        JSON.stringify({ error: 'Extracted text and language are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating lyrics in', language, 'for style:', musicStyle);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const languageName = languageNames[language] || 'English';
    const languageInstruction = languageInstructions[language] || languageInstructions['en'];

    const prompt = `You are an expert educational songwriter who creates memorable, catchy songs that help students learn.

EDUCATIONAL CONTENT TO CONVERT:
${extractedText}

TASK: Create song lyrics that teach this educational content.

REQUIREMENTS:
1. ${languageInstruction}
2. The song must be educational and focus on teaching the key concepts
3. Make it catchy, memorable, and easy to sing along to
4. Use repetition for important facts and definitions
5. Structure it with verses, chorus, and optionally a bridge
6. Keep the language age-appropriate for students (Grade 7-12)
7. Include mnemonic devices where helpful
8. The music style is: ${musicStyle || 'calm and melodic'}
9. Subject: ${subject || 'Educational content'}

SONG STRUCTURE:
- Title: Create a catchy title related to the topic
- Intro: Brief musical introduction hint
- Verse 1: Introduce the main topic
- Chorus: Key concepts that repeat (most memorable part)
- Verse 2: More details and facts
- Chorus: (repeat)
- Bridge: Connect concepts or add depth
- Final Chorus: Reinforce learning
- Outro: Summary or call to action

OUTPUT FORMAT:
Write the complete song lyrics with clear section markers like [Verse 1], [Chorus], [Bridge], etc.
Make sure each line flows well musically.
The total length should be suitable for a 2-4 minute song.

IMPORTANT: Output ONLY in ${languageName}. Every word must be in ${languageName}.`;

    const result = await model.generateContent(prompt);
    const lyricsText = result.response.text();

    console.log('Lyrics generated successfully, length:', lyricsText.length);

    // Generate a suggested title from the lyrics
    const titleResult = await model.generateContent(`Based on these song lyrics, suggest a short, catchy title (3-5 words max) in ${languageName}:

${lyricsText.substring(0, 500)}

Output only the title, nothing else.`);
    
    const suggestedTitle = titleResult.response.text().trim();

    return new Response(
      JSON.stringify({ 
        success: true, 
        lyricsText,
        suggestedTitle,
        language: languageName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating lyrics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate lyrics';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});