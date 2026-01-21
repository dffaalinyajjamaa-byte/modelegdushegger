import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const musicStyleMap: Record<string, string> = {
  'calm': 'Soft Piano, Ambient, Relaxing, Gentle Melody',
  'lofi': 'Lo-Fi Hip Hop, Chill Beats, Study Music, Mellow',
  'hiphop': 'Hip Hop, Rhythmic, Educational Rap, Modern Beat',
  'traditional': 'Ethiopian Traditional, African Rhythm, Folk Music, Cultural',
  'instrumental': 'Instrumental, Orchestral, Classical, No Vocals'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lyricsText, musicStyle, title, trackId, userId } = await req.json();
    
    if (!lyricsText || !musicStyle) {
      return new Response(
        JSON.stringify({ error: 'Lyrics and music style are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating music with style:', musicStyle, 'title:', title);
    console.log('Lyrics length:', lyricsText.length, 'characters');

    const sunoApiKey = Deno.env.get('SUNO_API_KEY');
    if (!sunoApiKey) {
      throw new Error('SUNO_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Map the style to Suno format
    const sunoStyle = musicStyleMap[musicStyle] || musicStyleMap['calm'];
    const isInstrumental = musicStyle === 'instrumental';

    // Call Suno API with correct parameters
    const sunoResponse = await fetch('https://api.sunoapi.org/api/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customMode: true,
        instrumental: isInstrumental,
        model: 'V4_5',
        prompt: lyricsText,
        style: sunoStyle,
        title: title || 'Study Music',
        vocalGender: 'f'
      })
    });

    if (!sunoResponse.ok) {
      const errorText = await sunoResponse.text();
      console.error('Suno API error:', errorText);
      throw new Error(`Suno API error: ${sunoResponse.status} - ${errorText}`);
    }

    const sunoData = await sunoResponse.json();
    console.log('Suno API response:', JSON.stringify(sunoData));

    if (sunoData.code !== 200 || !sunoData.data?.taskId) {
      throw new Error(sunoData.msg || 'Failed to start music generation');
    }

    const taskId = sunoData.data.taskId;

    // Update the track with the task ID
    if (trackId) {
      const { error: updateError } = await supabase
        .from('study_music_tracks')
        .update({ 
          task_id: taskId, 
          status: 'processing' 
        })
        .eq('id', trackId);

      if (updateError) {
        console.error('Error updating track:', updateError);
      } else {
        console.log('Track updated with taskId:', taskId);
      }
    }

    console.log('Music generation started successfully, taskId:', taskId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        taskId,
        message: 'Music generation started. This may take 1-5 minutes.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating music:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate music';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
