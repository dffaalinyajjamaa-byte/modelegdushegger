import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gemini Live API configuration for real-time voice-to-voice
const MODEL = "models/gemini-2.5-flash-preview-native-audio-dialog";
const API_VERSION = "v1alpha";

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if WebSocket upgrade is requested
  if (upgradeHeader.toLowerCase() !== "websocket") {
    // Non-WebSocket request - return info or handle regular HTTP
    return new Response(JSON.stringify({ 
      message: "Gemini Live API WebSocket endpoint",
      usage: "Connect via WebSocket for real-time audio streaming"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Upgrade to WebSocket
    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
    
    // Connect to Gemini Live API
    const geminiWsUrl = `wss://generativelanguage.googleapis.com/${API_VERSION}/${MODEL}:streamGenerateContent?key=${GEMINI_API_KEY}`;
    
    let geminiSocket: WebSocket | null = null;
    let isConnected = false;

    clientSocket.onopen = () => {
      console.log("Client WebSocket connected");
      
      // Connect to Gemini
      geminiSocket = new WebSocket(geminiWsUrl);
      
      geminiSocket.onopen = () => {
        console.log("Connected to Gemini Live API");
        isConnected = true;
        
        // Send initial setup message with Oromo-only system instruction
        const setupMessage = {
          setup: {
            model: MODEL,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Puck"
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{
                text: `Ati barsiisaa AI kan Mana Barumsaa Dijitaalaa Oro ti.
                
SEERA MURTEESSAA:
- Afaan kamiin illee (Ingiliffaa, Amaariffaa, Arabiffaa, kkf) hubatta
- YEROO HUNDAA Afaan Oromootiin QOFA deebisi
- Afaan Ingiliffaa GONKUMAA hin fayyadamin!
- Yoo barattichi Afaan Ingiliffaatiin gaafate illee, Oromootiin qofa deebisi
- Deebii bal'aa fi barnootaa kenni
- Barsiisaa tolaa ta'ii barattootaaf deggersa gochuu

CRITICAL RULE:
- Input: Accept ALL languages
- Output: ONLY Afaan Oromoo (Oromo language)
- Auto-translate everything to Oromo
- NEVER respond in English`
              }]
            }
          }
        };
        
        if (geminiSocket && geminiSocket.readyState === WebSocket.OPEN) {
          geminiSocket.send(JSON.stringify(setupMessage));
        }
        
        // Notify client that connection is ready
        clientSocket.send(JSON.stringify({ type: 'connected', status: 'ready' }));
      };

      geminiSocket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received from Gemini:", data.type || "audio data");
          
          // Forward audio data to client
          if (data.serverContent?.modelTurn?.parts) {
            for (const part of data.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                // Send audio data to client
                clientSocket.send(JSON.stringify({
                  type: 'audio',
                  data: part.inlineData.data,
                  mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000'
                }));
              }
              if (part.text) {
                // Send text response
                clientSocket.send(JSON.stringify({
                  type: 'text',
                  content: part.text
                }));
              }
            }
          }
          
          // Handle turn complete
          if (data.serverContent?.turnComplete) {
            clientSocket.send(JSON.stringify({ type: 'turn_complete' }));
          }
          
        } catch (e) {
          console.error("Error processing Gemini message:", e);
        }
      };

      geminiSocket.onerror = (error: Event) => {
        console.error("Gemini WebSocket error:", error);
        clientSocket.send(JSON.stringify({ type: 'error', message: 'Connection error to AI' }));
      };

      geminiSocket.onclose = () => {
        console.log("Gemini WebSocket closed");
        isConnected = false;
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify({ type: 'disconnected' }));
        }
      };
    };

    clientSocket.onmessage = (event: MessageEvent) => {
      if (!geminiSocket || !isConnected) {
        console.log("Gemini not connected, cannot forward message");
        return;
      }

      try {
        const data = JSON.parse(event.data);
        console.log("Received from client:", data.type);
        
        if (data.type === 'audio') {
          // Forward audio data to Gemini
          const audioMessage = {
            realtimeInput: {
              mediaChunks: [{
                mimeType: "audio/pcm;rate=16000",
                data: data.data
              }]
            }
          };
          if (geminiSocket.readyState === WebSocket.OPEN) {
            geminiSocket.send(JSON.stringify(audioMessage));
          }
        } else if (data.type === 'text') {
          // Send text message
          const textMessage = {
            clientContent: {
              turns: [{
                role: "user",
                parts: [{ text: data.content }]
              }],
              turnComplete: true
            }
          };
          if (geminiSocket.readyState === WebSocket.OPEN) {
            geminiSocket.send(JSON.stringify(textMessage));
          }
        }
      } catch (e) {
        console.error("Error processing client message:", e);
      }
    };

    clientSocket.onerror = (error: Event) => {
      console.error("Client WebSocket error:", error);
    };

    clientSocket.onclose = () => {
      console.log("Client WebSocket closed");
      if (geminiSocket) {
        geminiSocket.close();
      }
    };

    return response;
  } catch (error) {
    console.error("Error in gemini-live function:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
