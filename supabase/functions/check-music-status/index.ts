import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskId, trackId } = await req.json();
    
    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'Task ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking music status for taskId:', taskId);

    const sunoApiKey = Deno.env.get('SUNO_API_KEY');
    if (!sunoApiKey) {
      throw new Error('SUNO_API_KEY not configured');
    }

    // Use correct endpoint: /generate/record-info
    const statusResponse = await fetch(`https://api.sunoapi.org/api/v1/generate/record-info?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`
      }
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('Suno status check error:', errorText);
      throw new Error(`Status check failed: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    console.log('Status response:', JSON.stringify(statusData));

    let status = 'processing';
    let audioUrl = null;
    let duration = null;

    // Parse the response based on correct Suno API structure
    if (statusData.code === 200 && statusData.data) {
      const data = statusData.data;
      
      // Check status field for completion
      if (data.status === 'SUCCESS') {
        status = 'completed';
        // Get the audio URL from the response data array
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          audioUrl = data.data[0].audio_url;
          duration = data.data[0].duration;
          console.log('Music ready! Audio URL:', audioUrl);
        }
      } else if (data.status === 'FAILED') {
        status = 'failed';
        console.error('Music generation failed:', data.errorMessage || 'Unknown error');
      } else if (data.status === 'PENDING' || data.status === 'PROCESSING' || data.status === 'QUEUED') {
        status = 'processing';
        console.log('Still processing...');
      }
    }

    // Update the track if we have results
    if (trackId && (status === 'completed' || status === 'failed')) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const updateData: Record<string, unknown> = { status };
      if (audioUrl) {
        updateData.audio_url = audioUrl;
      }
      if (duration) {
        updateData.duration_seconds = Math.round(duration);
      }

      const { error: updateError } = await supabase
        .from('study_music_tracks')
        .update(updateData)
        .eq('id', trackId);

      if (updateError) {
        console.error('Error updating track:', updateError);
      } else {
        console.log('Track updated successfully with status:', status);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status,
        audioUrl,
        duration,
        rawData: statusData.data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error checking music status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to check music status';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
