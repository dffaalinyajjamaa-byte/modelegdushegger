import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch user's conversation history
    const { data: sessions } = await supabaseClient
      .from('live_teacher_sessions')
      .select('messages, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch user's activity
    const { data: activities } = await supabaseClient
      .from('user_activity_log')
      .select('activity_type, subject, duration_minutes')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Analyze patterns
    const subjects = new Set();
    let totalMinutes = 0;
    
    activities?.forEach(activity => {
      if (activity.subject) subjects.add(activity.subject);
      totalMinutes += activity.duration_minutes || 0;
    });

    const conversationTopics = sessions?.map(s => {
      const msgs = s.messages as any[];
      return msgs?.map((m: any) => m.content).join(' ').substring(0, 200);
    }).join('\n');

    console.log("Generating study plan with AI");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `You are an educational AI that creates personalized study plans. Analyze the student's learning patterns and create a weekly study schedule.`
          },
          { 
            role: "user", 
            content: `Create a personalized weekly study plan based on:
- Subjects studied: ${Array.from(subjects).join(', ')}
- Total study time: ${totalMinutes} minutes
- Recent topics: ${conversationTopics}

Format as JSON with this structure:
{
  "weeklyGoal": "description",
  "schedule": [
    {
      "day": "Monday",
      "tasks": [
        {"time": "14:00-15:00", "subject": "Mathematics", "topic": "Algebra", "priority": "high"}
      ]
    }
  ],
  "recommendations": ["tip1", "tip2"]
}` 
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const studyPlan = JSON.parse(data.choices[0]?.message?.content || '{}');
    
    return new Response(JSON.stringify(studyPlan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Study plan generation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Failed to generate study plan" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
