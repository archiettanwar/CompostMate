console.log("Groq key loaded:", import.meta.env.VITE_GROQ_API_KEY);

const SYSTEM_PROMPT = `You are CompostBot, a friendly composting assistant inside CompostMate, 
an app for urban Indian households. Keep answers under 100 words — short, 
practical, encouraging. Always end with one single actionable tip. 
Never use jargon without explaining it in brackets. Always respond in English only, regardless of what language the user writes in. Never break character.`;

/**
 * Sends a chat message to Groq Cloud and returns the text reply.
 * @param {string} userMessage 
 * @returns {Promise<string>}
 */
export const sendChatMessage = async (userMessage) => {
  const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ],
        max_tokens: 150
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in sendChatMessage:", error);
    throw error;
  }
};

/**
 * Analyzes an image of compost waste using Groq's Vision model.
 * @param {string} base64ImageData - The base64 encoded image string.
 * @returns {Promise<{category: string, weightEstimate: number, verified: boolean, description: string}>}
 */
export const analyzeCompostImage = async (base64ImageData) => {
  const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

  if (WEBHOOK_URL) {
    console.log("Using n8n webhook for verification...");
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64ImageData }),
      });

      if (!response.ok) throw new Error("n8n Webhook failed");
      return await response.json();
    } catch (error) {
      console.error("n8n error, falling back to AI:", error);
    }
  }

  // Fallback to Groq Vision if n8n is not set or fails
  if (!GROQ_API_KEY) throw new Error("Missing API Key");
  const base64Content = base64ImageData.replace(/^data:image\/\w+;base64,/, "");

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "You are a strict Compost Verification AI. Return JSON: {category: 'Green'|'Brown', weightEstimate: number, verified: boolean, description: string}. Reject (verified: false) any non-compostable trash or objects."
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Content}` }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 300
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw error;
  }
};
