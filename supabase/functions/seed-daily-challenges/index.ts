import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Challenge templates that rotate based on day
const challengeTemplates = [
  // Day 1 challenges
  [
    {
      title: 'Read English Book',
      description: 'Read an English book for 30 minutes to improve your vocabulary',
      subject: 'English',
      challenge_type: 'reading',
      points: 15,
      content_data: { duration_minutes: 30, skill: 'vocabulary' }
    },
    {
      title: 'Complete Math Quiz',
      description: 'Test your mathematics skills with a practice quiz',
      subject: 'Herrega',
      challenge_type: 'quiz',
      points: 20,
      content_data: { quiz_type: 'practice', difficulty: 'medium' }
    },
    {
      title: 'Watch Science Video',
      description: 'Watch a video lesson about natural science',
      subject: 'Saayinsii Naannoo',
      challenge_type: 'video',
      points: 10,
      content_data: { video_duration: '15 minutes' }
    },
  ],
  // Day 2 challenges
  [
    {
      title: 'Afaan Oromoo Practice',
      description: 'Complete grammar exercises in Afaan Oromoo',
      subject: 'Afaan Oromoo',
      challenge_type: 'practice',
      points: 15,
      content_data: { exercise_count: 10, topic: 'grammar' }
    },
    {
      title: 'Work on Worksheet',
      description: 'Complete a worksheet to practice problem-solving',
      subject: 'Herrega',
      challenge_type: 'worksheet',
      points: 18,
      content_data: { problems: 10, difficulty: 'medium' }
    },
    {
      title: 'Relax & Learn History',
      description: 'Take a break and watch educational history content',
      subject: 'Gadaa',
      challenge_type: 'relax',
      points: 8,
      content_data: { category: 'history', relaxation: true }
    },
  ],
  // Day 3 challenges
  [
    {
      title: 'National Exam Practice',
      description: 'Practice with past national exam questions',
      subject: 'Herrega',
      challenge_type: 'exam',
      points: 25,
      content_data: { exam_type: 'national', year: 2016 }
    },
    {
      title: 'English Vocabulary',
      description: 'Learn 15 new English words today',
      subject: 'English',
      challenge_type: 'reading',
      points: 12,
      content_data: { word_count: 15, activity: 'vocabulary' }
    },
    {
      title: 'Watch Gadaa Lesson',
      description: 'Watch a video lesson about Gadaa system',
      subject: 'Gadaa',
      challenge_type: 'video',
      points: 10,
      content_data: { topic: 'Gadaa system', duration: '10 minutes' }
    },
  ],
  // Day 4 challenges
  [
    {
      title: 'Science Worksheet',
      description: 'Complete a science worksheet on environmental topics',
      subject: 'Saayinsii Naannoo',
      challenge_type: 'worksheet',
      points: 18,
      content_data: { topic: 'environment', questions: 15 }
    },
    {
      title: 'Safuu Reading',
      description: 'Read about Ethiopian cultural values for 20 minutes',
      subject: 'Safuu',
      challenge_type: 'reading',
      points: 12,
      content_data: { duration_minutes: 20, topic: 'cultural values' }
    },
    {
      title: 'Math Video Lesson',
      description: 'Watch a video lesson on problem solving',
      subject: 'Herrega',
      challenge_type: 'video',
      points: 10,
      content_data: { topic: 'problem solving', level: 'Grade 6' }
    },
  ],
  // Day 5 challenges
  [
    {
      title: 'Quiz Marathon',
      description: 'Complete 3 different subject quizzes',
      subject: 'Mixed',
      challenge_type: 'quiz',
      points: 30,
      content_data: { quiz_count: 3, subjects: ['Herrega', 'English', 'Science'] }
    },
    {
      title: 'Book Reading Hour',
      description: 'Read any digital book for 1 hour',
      subject: 'Mixed',
      challenge_type: 'reading',
      points: 20,
      content_data: { duration_minutes: 60, book_type: 'any' }
    },
    {
      title: 'Relax Time Videos',
      description: 'Watch educational content during relax time',
      subject: 'Relaxation',
      challenge_type: 'relax',
      points: 8,
      content_data: { category: 'educational entertainment' }
    },
  ],
  // Day 6 challenges
  [
    {
      title: 'Afaan Oromoo Reading',
      description: 'Read Afaan Oromoo textbook for 30 minutes',
      subject: 'Afaan Oromoo',
      challenge_type: 'reading',
      points: 15,
      content_data: { duration_minutes: 30, material: 'textbook' }
    },
    {
      title: 'Practice National Exam',
      description: 'Complete a full national exam practice test',
      subject: 'Saayinsii Naannoo',
      challenge_type: 'exam',
      points: 25,
      content_data: { exam_type: 'practice', timed: true }
    },
    {
      title: 'English Grammar Quiz',
      description: 'Test your English grammar knowledge',
      subject: 'English',
      challenge_type: 'quiz',
      points: 15,
      content_data: { topic: 'grammar', questions: 20 }
    },
  ],
  // Day 7 challenges (Weekend Special)
  [
    {
      title: 'Weekend Video Marathon',
      description: 'Watch 5 video lessons of your choice',
      subject: 'Mixed',
      challenge_type: 'video',
      points: 25,
      content_data: { video_count: 5, choice: 'free' }
    },
    {
      title: 'Complete Any Worksheet',
      description: 'Finish at least one worksheet today',
      subject: 'Mixed',
      challenge_type: 'worksheet',
      points: 15,
      content_data: { count: 1, subject: 'any' }
    },
    {
      title: 'Review & Relax',
      description: 'Review what you learned this week and relax',
      subject: 'Review',
      challenge_type: 'relax',
      points: 10,
      content_data: { activity: 'weekly review', relaxation: true }
    },
  ],
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    // Get day of week (0-6) to select challenge template
    const dayOfWeek = today.getDay()
    const templateIndex = dayOfWeek % challengeTemplates.length
    const todaysChallenges = challengeTemplates[templateIndex]

    // Add today's date to each challenge
    const challengesWithDate = todaysChallenges.map(challenge => ({
      ...challenge,
      active_date: todayStr,
    }))

    console.log(`Seeding ${challengesWithDate.length} challenges for ${todayStr} (template ${templateIndex + 1})`)

    // Delete old challenges (older than 7 days)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weekAgoStr = weekAgo.toISOString().split('T')[0]
    
    await supabase
      .from('daily_challenges')
      .delete()
      .lt('active_date', weekAgoStr)

    // Upsert today's challenges
    const { data, error } = await supabase
      .from('daily_challenges')
      .upsert(challengesWithDate, {
        onConflict: 'active_date,subject,title',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      throw error
    }

    console.log(`Successfully seeded ${data?.length || 0} daily challenges for ${todayStr}`)

    return new Response(
      JSON.stringify({
        success: true,
        date: todayStr,
        day_of_week: dayOfWeek,
        template_used: templateIndex + 1,
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