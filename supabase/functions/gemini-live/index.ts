import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gemini Live API configuration - using correct model and endpoint
const MODEL = "gemini-2.0-flash-live-001";
const API_VERSION = "v1beta";

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if WebSocket upgrade is requested
  if (upgradeHeader.toLowerCase() !== "websocket") {
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
    
    // Correct Gemini Live API WebSocket URL
    const geminiWsUrl = `wss://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL}:streamGenerateContent?key=${GEMINI_API_KEY}`;
    
    let geminiSocket: WebSocket | null = null;
    let isConnected = false;
    let setupSent = false;

    clientSocket.onopen = () => {
      console.log("Client WebSocket connected");
      
      // Connect to Gemini
      geminiSocket = new WebSocket(geminiWsUrl);
      
      geminiSocket.onopen = () => {
        console.log("Connected to Gemini Live API");
        isConnected = true;
        
        // Send initial setup message with correct format for Gemini Live API
        const setupMessage = {
          setup: {
            model: `models/${MODEL}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Aoede"
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{
                text: `Ati barsiisaa AI kan Mana Barumsaa Dijitaalaa Oro ti.
                
SEERA MURTEESSAA - AFAAN OROMOO QOFA:
- Afaan kamiin illee (Ingiliffaa, Amaariffaa, Arabiffaa, kkf) hubatta
- YEROO HUNDAA Afaan Oromootiin QOFA deebisi
- Afaan Ingiliffaa GONKUMAA hin fayyadamin!
- Yoo barattichi Afaan Ingiliffaatiin gaafate illee, Oromootiin qofa deebisi
- Deebii bal'aa fi barnootaa kenni
- Barsiisaa tolaa ta'ii barattootaaf deggersa gochuu

SEERA SAGALEE OROMO - PRONUNCIATION RULES:
- 'dh' = sagalee laafaa 'd' (fkn: "dhugaa" - dhu-gaa)
- 'ch' = akka Ingiliffaa "church" keessa (fkn: "chala")
- 'ph' = 'p' hafuura waliin
- 'ny' = akka Spanish 'ñ' (fkn: "nyaata")
- Dubbachiiftuu dachaa = sagalee dheeraa (aa, ee, ii, oo, uu)

CRITICAL RULE:
- Input: Accept ALL languages
- Output: ONLY Afaan Oromoo (Oromo language)
- NEVER respond in English
- Speak naturally like a native Oromo speaker`
              }]
            }
          }
        };
        
        if (geminiSocket && geminiSocket.readyState === WebSocket.OPEN) {
          geminiSocket.send(JSON.stringify(setupMessage));
          setupSent = true;
          console.log("Setup message sent to Gemini");
        }
        
        // Notify client that connection is ready
        clientSocket.send(JSON.stringify({ type: 'connected', status: 'ready' }));
      };

      geminiSocket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received from Gemini:", JSON.stringify(data).substring(0, 200));
          
          // Handle setup complete
          if (data.setupComplete) {
            console.log("Gemini setup complete");
            clientSocket.send(JSON.stringify({ type: 'setup_complete' }));
            return;
          }
          
          // Forward audio data to client
          if (data.serverContent?.modelTurn?.parts) {
            for (const part of data.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                clientSocket.send(JSON.stringify({
                  type: 'audio',
                  data: part.inlineData.data,
                  mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000'
                }));
              }
              if (part.text) {
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
          
          // Handle errors from Gemini
          if (data.error) {
            console.error("Gemini error:", data.error);
            clientSocket.send(JSON.stringify({ 
              type: 'error', 
              message: data.error.message || 'Gemini API error' 
            }));
          }
          
        } catch (e) {
          console.error("Error processing Gemini message:", e);
        }
      };

      geminiSocket.onerror = (error: Event) => {
        console.error("Gemini WebSocket error:", error);
        clientSocket.send(JSON.stringify({ 
          type: 'error', 
          message: 'Connection error to AI. Please try again.' 
        }));
      };

      geminiSocket.onclose = (event: CloseEvent) => {
        console.log("Gemini WebSocket closed:", event.code, event.reason);
        isConnected = false;
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify({ 
            type: 'disconnected',
            reason: event.reason || 'Connection closed'
          }));
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
          // Forward audio data to Gemini with correct format
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
        } else if (data.type === 'image') {
          // Forward webcam image to Gemini for visual context
          const imageMessage = {
            realtimeInput: {
              mediaChunks: [{
                mimeType: data.mimeType || "image/jpeg",
                data: data.data
              }]
            }
          };
          if (geminiSocket.readyState === WebSocket.OPEN) {
            geminiSocket.send(JSON.stringify(imageMessage));
            console.log("Sent webcam frame to Gemini");
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
