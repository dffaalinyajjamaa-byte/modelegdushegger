import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DaySchedule {
  day_of_week: string;
  school_start: string;
  school_end: string;
  rest_start: string;
  rest_end: string;
  dinner_start: string;
  dinner_end: string;
}

interface SubjectSelection {
  subject: string;
  priority: 'high' | 'medium' | 'low';
}

interface FreeSlot {
  from: string;
  to: string;
}

const timeToMinutes = (time: string): number => {
  if (!time) return -1;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const calculateFreeSlots = (schedule: DaySchedule): FreeSlot[] => {
  const dayStart = 6 * 60; // 6:00 AM
  const dayEnd = 22 * 60; // 10:00 PM
  
  // Collect all blocked periods
  const blocked: Array<{ from: number; to: number }> = [];
  
  if (schedule.school_start && schedule.school_end) {
    const schoolStart = timeToMinutes(schedule.school_start);
    const schoolEnd = timeToMinutes(schedule.school_end);
    if (schoolStart >= 0 && schoolEnd >= 0) {
      blocked.push({ from: schoolStart, to: schoolEnd });
    }
  }
  
  if (schedule.rest_start && schedule.rest_end) {
    const restStart = timeToMinutes(schedule.rest_start);
    const restEnd = timeToMinutes(schedule.rest_end);
    if (restStart >= 0 && restEnd >= 0) {
      blocked.push({ from: restStart, to: restEnd });
    }
  }
  
  if (schedule.dinner_start && schedule.dinner_end) {
    const dinnerStart = timeToMinutes(schedule.dinner_start);
    const dinnerEnd = timeToMinutes(schedule.dinner_end);
    if (dinnerStart >= 0 && dinnerEnd >= 0) {
      blocked.push({ from: dinnerStart, to: dinnerEnd });
    }
  }
  
  // Sort blocked periods
  blocked.sort((a, b) => a.from - b.from);
  
  // Merge overlapping periods
  const merged: Array<{ from: number; to: number }> = [];
  for (const period of blocked) {
    if (merged.length === 0 || merged[merged.length - 1].to < period.from) {
      merged.push({ ...period });
    } else {
      merged[merged.length - 1].to = Math.max(merged[merged.length - 1].to, period.to);
    }
  }
  
  // Calculate free slots
  const freeSlots: FreeSlot[] = [];
  let currentTime = dayStart;
  
  for (const period of merged) {
    if (currentTime < period.from) {
      // Found a free slot
      const slotDuration = period.from - currentTime;
      if (slotDuration >= 30) { // Only include slots of at least 30 minutes
        freeSlots.push({
          from: minutesToTime(currentTime),
          to: minutesToTime(period.from),
        });
      }
    }
    currentTime = Math.max(currentTime, period.to);
  }
  
  // Check for free time after last blocked period
  if (currentTime < dayEnd) {
    const slotDuration = dayEnd - currentTime;
    if (slotDuration >= 30) {
      freeSlots.push({
        from: minutesToTime(currentTime),
        to: minutesToTime(dayEnd),
      });
    }
  }
  
  return freeSlots;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { schedules, subjects, week_index } = await req.json() as {
      schedules: DaySchedule[];
      subjects: SubjectSelection[];
      week_index: number;
    };

    // Calculate free slots for each day
    const daysWithFreeSlots = schedules.map(schedule => ({
      day: schedule.day_of_week,
      school_time: {
        from: schedule.school_start || '',
        to: schedule.school_end || '',
      },
      blocked: {
        school: { from: schedule.school_start, to: schedule.school_end },
        rest: { from: schedule.rest_start, to: schedule.rest_end },
        dinner: { from: schedule.dinner_start, to: schedule.dinner_end },
      },
      free_slots: calculateFreeSlots(schedule),
    }));

    // Build prompt for AI
    const prompt = `You are a study planner AI. Generate a weekly study plan based on the following information.

IMPORTANT RULES:
1. ONLY schedule study sessions during FREE TIME SLOTS provided below
2. Never schedule during school, rest, or dinner times
3. Rotate subjects across days - don't repeat the same subject on consecutive days
4. Balance language subjects (Afaan Oromo, Afaan Amaaraa, English) with calculation (Herrega) and social subjects (Gadaa, Lammummaa/Safuu, Hawaasa, Saayinsii)
5. Saturday should be lighter - focus on revision or easier subjects
6. Use week_index ${week_index} to vary the schedule (rotate starting subjects)
7. High priority subjects should appear more frequently
8. Each study session should be 1-2 hours maximum

SELECTED SUBJECTS (with priorities):
${subjects.map(s => `- ${s.subject} (${s.priority} priority)`).join('\n')}

DAILY SCHEDULES AND FREE SLOTS:
${daysWithFreeSlots.map(d => `
${d.day}:
- School: ${d.school_time.from || 'Not set'} - ${d.school_time.to || 'Not set'}
- Free slots: ${d.free_slots.length > 0 ? d.free_slots.map(s => `${s.from}-${s.to}`).join(', ') : 'No free time available'}
`).join('\n')}

Generate a JSON response with this EXACT structure:
{
  "week": "Week ${week_index}",
  "timezone": "EAT",
  "days": [
    {
      "day": "Monday",
      "school_time": { "from": "08:00", "to": "15:00" },
      "study_sessions": [
        { "from": "16:00", "to": "17:30", "subject": "Herrega" },
        { "from": "18:00", "to": "19:00", "subject": "English" }
      ]
    }
  ],
  "weekly_summary": {
    "focus_subjects": ["Herrega", "English"],
    "ai_tip": "Study difficult subjects earlier when focus is high."
  }
}

RESPOND ONLY WITH THE JSON, no other text.`;

    // Call AI API
    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful study planner AI that generates optimal study schedules. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let plan;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // Generate a fallback plan
      plan = generateFallbackPlan(daysWithFreeSlots, subjects, week_index);
    }

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateFallbackPlan(
  daysWithFreeSlots: Array<{ day: string; school_time: { from: string; to: string }; free_slots: FreeSlot[] }>,
  subjects: SubjectSelection[],
  week_index: number
) {
  // Simple rotation-based fallback
  const sortedSubjects = [...subjects].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  let subjectIndex = week_index % sortedSubjects.length;

  const days = daysWithFreeSlots.map(day => {
    const study_sessions: Array<{ from: string; to: string; subject: string }> = [];
    
    day.free_slots.forEach(slot => {
      if (sortedSubjects.length > 0) {
        const subject = sortedSubjects[subjectIndex % sortedSubjects.length];
        study_sessions.push({
          from: slot.from,
          to: slot.to,
          subject: subject.subject,
        });
        subjectIndex++;
      }
    });

    return {
      day: day.day,
      school_time: day.school_time,
      study_sessions: day.day === 'Saturday' ? study_sessions.slice(0, 1).map(s => ({
        ...s,
        subject: 'Revision',
      })) : study_sessions.slice(0, 2),
    };
  });

  return {
    week: `Week ${week_index}`,
    timezone: 'EAT',
    days,
    weekly_summary: {
      focus_subjects: sortedSubjects.filter(s => s.priority === 'high').map(s => s.subject),
      ai_tip: 'Focus on high-priority subjects first and take regular breaks.',
    },
  };
}
