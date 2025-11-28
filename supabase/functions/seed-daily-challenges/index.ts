import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const today = new Date().toISOString().split('T')[0]

    // Define challenges for different subjects
    const challenges = [
      {
        title: 'Herrega Practice',
        description: 'Solve 5 mathematics problems',
        subject: 'Herrega',
        challenge_type: 'quiz',
        points: 15,
        active_date: today,
        content_data: {
          total_questions: 5,
          difficulty: 'medium'
        }
      },
      {
        title: 'Saayinsii Reading',
        description: 'Read a science article and answer questions',
        subject: 'Saayinsii Waliigalaa',
        challenge_type: 'reading',
        points: 10,
        active_date: today,
        content_data: {
          article_topic: 'General Science',
          estimated_time: '10 minutes'
        }
      },
      {
        title: 'Afaan Oromoo Practice',
        description: 'Complete grammar exercises',
        subject: 'Afaan Oromoo',
        challenge_type: 'practice',
        points: 12,
        active_date: today,
        content_data: {
          exercise_type: 'grammar',
          total_exercises: 10
        }
      },
      {
        title: 'English Vocabulary',
        description: 'Learn 10 new English words',
        subject: 'English',
        challenge_type: 'practice',
        points: 10,
        active_date: today,
        content_data: {
          word_count: 10,
          difficulty: 'beginner'
        }
      },
      {
        title: 'Hawaasa Video',
        description: 'Watch a social studies video lesson',
        subject: 'Hawaasa',
        challenge_type: 'video',
        points: 8,
        active_date: today,
        content_data: {
          video_duration: '5 minutes',
          topic: 'Ethiopian History'
        }
      }
    ]

    // Upsert challenges (will update if already exists for today)
    const { data, error } = await supabase
      .from('daily_challenges')
      .upsert(challenges, {
        onConflict: 'active_date,subject,title',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      throw error
    }

    console.log(`Successfully seeded ${data?.length || 0} daily challenges for ${today}`)

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        challenges_created: data?.length || 0,
        challenges: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error seeding daily challenges:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
