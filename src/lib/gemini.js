console.log("Gemini key loaded:", import.meta.env.VITE_GEMINI_API_KEY);

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const SYSTEM_PROMPT = `You are CompostBot, a friendly composting assistant inside CompostMate, 
an app for urban Indian households. Keep answers under 100 words — short, 
practical, encouraging. Always end with one single actionable tip. 
Never use jargon without explaining it in brackets. Respond in Hindi 
if user writes in Hindi, English otherwise. Never break character.`;

const VISION_PROMPT = `Analyze this compost image and return ONLY valid JSON with fields:
isCompost (boolean), moistureStatus (too_dry|ideal|too_wet|unknown),
problems (array of strings), recommendation (string), confidence (high|medium|low)`;

/**
 * Sends a chat message to Gemini and returns the text reply.
 * @param {string} userMessage 
 * @returns {Promise<string>}
 */
export const sendChatMessage = async (userMessage) => {
  try {
    const url = `${BASE_URL}?key=${API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: userMessage }],
          },
        ],
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error in sendChatMessage:", error);
    throw error;
  }
};

/**
 * Analyzes a compost image and returns a JSON object.
 * @param {string} base64ImageData - Base64 encoded image data (without prefix)
 * @returns {Promise<Object>}
 */
export const analyzeCompostImage = async (base64ImageData) => {
  try {
    const url = `${BASE_URL}?key=${API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: VISION_PROMPT },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64ImageData,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const textResponse = data.candidates[0].content.parts[0].text;
    
    // Attempt to parse JSON from the text (Gemini sometimes wraps JSON in code blocks)
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return JSON.parse(textResponse);
  } catch (error) {
    console.error("Error in analyzeCompostImage:", error);
    throw error;
  }
};
