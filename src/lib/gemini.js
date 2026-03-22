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

// Placeholder for visual analysis (to be updated for Groq/other vision providers)
export const analyzeCompostImage = async (base64ImageData) => {
  console.warn("Vision analysis is currently disabled during Groq transition.");
  return null;
};
