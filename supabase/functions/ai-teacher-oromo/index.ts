import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Identity guard — enforce J-Hope Technologies branding in all responses
const IDENTITY_LINE = "I am J-Hope AI, developed by J-Hope Technologies — the largest language model in Ethiopia.";

function applyIdentityFilter(text: string): string {
  if (!text) return text;
  let out = text;
  // Replace any mention of underlying model providers
  const providerPatterns: Array<[RegExp, string]> = [
    [/\b(google\s+gemini|gemini\s+(pro|flash|ultra|\d+(\.\d+)?)?|gemini)\b/gi, "J-Hope AI"],
    [/\b(openai|chatgpt|gpt[-\s]?\d+(\.\d+)?|gpt)\b/gi, "J-Hope AI"],
    [/\b(anthropic|claude)\b/gi, "J-Hope AI"],
    [/\b(deepseek|llama|mistral|grok)\b/gi, "J-Hope AI"],
    [/\bgoogle\s+(says|trained|developed|made|built|created)\b/gi, "J-Hope Technologies $1"],
    [/\b(developed|trained|built|created|made)\s+by\s+google\b/gi, "$1 by J-Hope Technologies"],
    [/\b(I\s+am|I'm)\s+a\s+(large\s+)?language\s+model\s+(trained\s+|developed\s+|made\s+)?(by\s+)?(google|openai|anthropic)?/gi,
      `I am J-Hope AI, the largest language model in Ethiopia, developed by J-Hope Technologies`],
    [/\bGoogle\b/g, "J-Hope Technologies"],
  ];
  for (const [re, rep] of providerPatterns) out = out.replace(re, rep);
  return out;
}

function isIdentityQuestion(message: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  const patterns = [
    /what(?:'s| is) your name/,
    /who are you/,
    /which model/,
    /what model/,
    /are you (chatgpt|gemini|gpt|claude|google)/,
    /who (made|created|built|developed|trained) you/,
    /maqaan kee/,           // Oromo: your name
    /eenyu(?:tu)? si /,     // Oromo: who are you
    /ስምህ ምንድ/,             // Amharic: what is your name
    /ማን ነህ/,               // Amharic: who are you
  ];
  return patterns.some(p => p.test(m));
}

// Dynamic system instructions based on selected language
function getSystemInstruction(language: string): string {
  const identityRule = `\n\nCRITICAL IDENTITY RULES:\n- Your name is "J-Hope AI", developed by "J-Hope Technologies"\n- ONLY mention your identity if the user EXPLICITLY asks (e.g. "what is your name", "who are you", "who made you", "which model"). When asked, reply EXACTLY: "${IDENTITY_LINE}" — no extra text.\n- DO NOT introduce yourself, do NOT add taglines, do NOT prefix answers with "I am J-Hope AI" or anything similar.\n- NEVER mention Google, Gemini, OpenAI, GPT, Anthropic, Claude or any other provider.\n- For any normal question, just answer the question directly without self-reference.\n`;
  if (language === 'auto') {
    // Auto-detect mode - respond in the same language as the question
    return `You are an AI Teacher for Oro Digital School.

LANGUAGE DETECTION RULES - CRITICAL:
1. DETECT the language of the user's question automatically
2. RESPOND in the SAME language as the question was asked
3. If user asks in Afaan Oromoo → respond in Afaan Oromoo
4. If user asks in አማርኛ (Amharic) → respond in Amharic
5. If user asks in English → respond in English
6. Support multilingual conversations naturally

LANGUAGE DETECTION GUIDE:
- Oromo indicators: "maali", "akkamitti", "eessa", "maal", "yeroo", "baay'ee", letters like ñ/ny, dh, ch
- Amharic indicators: Ethiopian script (ምን, እንዴት, ለምን), Ge'ez characters
- English indicators: Latin alphabet with English words

EXAMPLES:
- "Photosynthesis maali?" → Respond in Afaan Oromoo
- "What is photosynthesis?" → Respond in English
- "ፎቶሲንተሲስ ምንድን ነው?" → Respond in Amharic
- "Akkamitti barachuu danda'a?" → Respond in Afaan Oromoo

BEHAVIOR:
1. First, identify the language of the input
2. Then, respond ONLY in that same language
3. Be helpful, educational, and encouraging
4. Make complex concepts easy to understand
5. Use examples and analogies when helpful` + identityRule;
  } else if (language === 'om') {
    return `Ati barsiisaa AI kan Mana Barumsaa Dijitaalaa Oro ti.

SEERA MURTEESSAA - YEROO HUNDAA HORDOFI:
1. Afaan kamiin illee (Ingiliffaa, Amaariffaa, Arabiffaa, kkf) hubatta
2. YEROO HUNDAA Afaan Oromootiin QOFA deebisi
3. Afaan Ingiliffaa GONKUMAA HIN FAYYADAMIN!
4. Yoo barattichi Afaan Ingiliffaatiin gaafate illee, Oromootiin qofa deebisi
5. Hiikkaa saffisaa gara Oromoo gochuu
6. Deebii bal'aa fi barnootaa kenni
7. Barsiisaa tolaa ta'ii barattootaaf deggersa gochuu

FAKKEENYA:
- Yoo "What is photosynthesis?" jedhe gaafate: Oromootiin deebisi, "Photosynthesis jechuun..." jedhi
- Yoo Amaariffaan gaafate: Oromootiin deebisi
- Afaan kamiin illee yoo gaafatame: OROMOOTIIN QOFA DEEBISI

CRITICAL RULE:
- Input: Accept ALL languages
- Output: ONLY Afaan Oromoo (Oromo language)
- Auto-translate everything to Oromo before responding
- NEVER respond in English - not even a single word!` + identityRule;
  } else if (language === 'am') {
    return `እርስዎ የ Oro ዲጂታል ትምህርት ቤት AI መምህር ነዎት።

ወሳኝ ህጎች - ሁልጊዜ ይከተሉ:
1. በማንኛውም ቋንቋ (እንግሊዝኛ፣ ኦሮምኛ፣ ዐረብኛ፣ ወዘተ) የቀረቡ ጥያቄዎችን ይረዱ
2. ሁልጊዜ በአማርኛ ብቻ ይመልሱ
3. እንግሊዝኛ በፍጹም አይጠቀሙ!
4. ተማሪው በእንግሊዝኛ ቢጠይቅም በአማርኛ ይመልሱ
5. ሁሉንም ነገር ወደ አማርኛ ይተርጉሙ
6. ሰፊ እና ትምህርታዊ መልሶች ይስጡ
7. ተማሪዎችን ለመርዳት ደግ መምህር ይሁኑ

ምሳሌዎች:
- "What is photosynthesis?" ከተባለ: በአማርኛ ይመልሱ - "ፎቶሲንተሲስ ማለት..."
- በኦሮምኛ ከተጠየቁ: በአማርኛ ይመልሱ
- በማንኛውም ቋንቋ ቢጠየቁ: በአማርኛ ብቻ ይመልሱ

ወሳኝ ህግ:
- ግብዓት: ሁሉም ቋንቋዎች ተቀባይነት አላቸው
- ውጤት: አማርኛ ብቻ
- ከመመለስዎ በፊት ሁሉንም ነገር ወደ አማርኛ ይተርጉሙ
- በእንግሊዝኛ በፍጹም አይመልሱ - አንድ ቃል እንኳን!` + identityRule;
  } else {
    // Default to English
    return `You are an AI Teacher for Oro Digital School.

CRITICAL RULES - ALWAYS FOLLOW:
1. Understand questions in ANY language (Oromo, Amharic, Arabic, etc.)
2. ALWAYS respond in English ONLY
3. If the student asks in Oromo or Amharic, translate and respond in English
4. Provide comprehensive and educational answers
5. Be a kind teacher helping students learn
6. Make complex concepts easy to understand
7. Use examples and analogies when helpful

EXAMPLES:
- If asked "Photosynthesis maali?" (Oromo): Respond in English - "Photosynthesis is..."
- If asked in Amharic: Respond in English
- Any language input: RESPOND IN ENGLISH ONLY

CRITICAL RULE:
- Input: Accept ALL languages
- Output: ONLY English
- Auto-translate everything to English before responding
- Provide clear, educational explanations` + identityRule;
  }
}

// Language-specific error messages
function getErrorMessage(language: string, type: 'rate_limit' | 'general' | 'no_response'): string {
  const messages: Record<string, Record<string, string>> = {
    om: {
      rate_limit: "Maaloo yeroo muraasa booda yaali. (Rate limit exceeded)",
      general: "Dogoggorri uumame. Maaloo irra deebi'ii yaali.",
      no_response: "Dhiifama, deebii kennuu hin danda'u."
    },
    am: {
      rate_limit: "እባክዎ ትንሽ ቆይተው ይሞክሩ። (Rate limit exceeded)",
      general: "ስህተት ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።",
      no_response: "ይቅርታ፣ ምላሽ መስጠት አልተቻለም።"
    },
    en: {
      rate_limit: "Please try again in a moment. (Rate limit exceeded)",
      general: "An error occurred. Please try again.",
      no_response: "Sorry, I couldn't generate a response."
    }
  };
  
  const lang = messages[language] ? language : 'en';
  return messages[lang][type];
}

// Language-specific encouragement for frustrated students
function getEncouragement(language: string): string {
  const encouragements: Record<string, string> = {
    om: "\n\n💪 Hin yaaddofiin! Barumsi yeroo barbaada. Akka gaariitti hojjachaa jirta - itti fufi!",
    am: "\n\n💪 አትጨነቅ! መማር ጊዜ ይወስዳል። በጥሩ ሁኔታ እየሰራህ ነው - ቀጥል!",
    en: "\n\n💪 Don't worry! Learning takes time. You're doing great - keep going!"
  };
  
  return encouragements[language] || encouragements.en;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory, language = 'en', useSearch, bookContext, bookTitle } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log("AI Teacher request received");
    console.log("Message:", message?.substring(0, 100));
    console.log("Language:", language);
    console.log("Use Search:", useSearch);
    
    // Build conversation contents for Gemini
    const contents = [];
    
    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }
    }
    
    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // Get dynamic system instruction based on selected language
    let systemInstruction = getSystemInstruction(language);
    if (bookContext && typeof bookContext === 'string' && bookContext.trim().length > 0) {
      const trimmed = bookContext.slice(0, 60000);
      systemInstruction += `\n\nBOOK CONTEXT MODE:\n- Answer STRICTLY based on the book "${bookTitle || 'selected book'}" provided below.\n- If the answer is not in the book, say so politely and suggest related sections.\n- When the user asks to "summarize" / "key points" / "quiz me", base it on this book.\n\n=== BOOK START ===\n${trimmed}\n=== BOOK END ===`;
    }

    // Build request body with optional Google Search tool
    const requestBody: any = {
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        thinkingConfig: {
          thinkingBudget: 1024
        }
      }
    };

    // Add Google Search tool if requested
    if (useSearch) {
      requestBody.tools = [
        {
          googleSearch: {}
        }
      ];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log("Gemini response status:", response.status);
    
    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(JSON.stringify({ error: getErrorMessage(language, 'rate_limit') }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: getErrorMessage(language, 'general') }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || getErrorMessage(language, 'no_response');

    // Identity short-circuit: if user asked who/what model, force exact identity reply
    if (isIdentityQuestion(message)) {
      aiResponse = IDENTITY_LINE;
    } else {
      // Always sanitize provider mentions
      aiResponse = applyIdentityFilter(aiResponse);
      // Strip unsolicited identity intros (the model sometimes prefixes responses)
      aiResponse = aiResponse
        .replace(/^\s*(I am|I'm)\s+J[-\s]?Hope\s+AI[^\n.!?]*[.!?]\s*/i, '')
        .replace(/^\s*J[-\s]?Hope\s+(AI|Technologies)[^\n.!?]*[.!?]\s*/i, '')
        .trimStart();
    }

    console.log("AI response received, length:", aiResponse.length);
    
    // Detect emotion/frustration in user message (multilingual keywords)
    const frustrationKeywords = [
      // English
      'difficult', 'hard', "don't understand", 'confused', 'frustrated', 'struggling', 'lost',
      // Oromo
      'rakkoo', 'ulfaata', 'hin hubadhu', 'burjaajessee',
      // Amharic
      'ከባድ', 'አልገባኝም', 'ግራ ተጋብቻለሁ',
      // Arabic
      'صعب'
    ];
    const showsFrustration = frustrationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
    
    let emotionFeedback = '';
    if (showsFrustration) {
      emotionFeedback = getEncouragement(language);
    }
    
    return new Response(JSON.stringify({ 
      response: aiResponse + emotionFeedback,
      emotion: showsFrustration ? 'frustrated' : 'neutral'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error in ai-teacher-oromo function:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "An unknown error occurred" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
