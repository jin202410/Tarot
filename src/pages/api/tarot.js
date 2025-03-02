import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";
import fetch from "node-fetch";

// Configure proxy
const proxyUrl = "http://127.0.0.1:8001"; // Modify according to your proxy settings
const httpsAgent = new HttpsProxyAgent(proxyUrl);

// Initialize OpenAI client with proxy configuration
const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  httpAgent: httpsAgent,
  fetch: fetch,
});

// Tarot card name mappings
const tarotCards = {
  0: "The Fool",
  1: "The Magician",
  2: "The High Priestess",
  3: "The Empress",
  4: "The Emperor",
  5: "The Hierophant",
  6: "The Lovers",
  7: "The Chariot",
  8: "Strength",
  9: "The Hermit",
  10: "Wheel of Fortune",
  11: "Justice",
  12: "The Hanged Man",
  13: "Death",
  14: "Temperance",
  15: "The Devil",
  16: "The Tower",
  17: "The Star",
  18: "The Moon",
  19: "The Sun",
  20: "Judgement",
  21: "The World",
  // 小阿卡那
  22: "Ace of Wands",
  23: "Two of Wands",
  24: "Three of Wands",
  25: "Four of Wands",
  26: "Five of Wands",
  27: "Six of Wands",
  28: "Seven of Wands",
  29: "Eight of Wands",
  30: "Nine of Wands",
  31: "Ten of Wands",
  32: "Page of Wands",
  33: "Knight of Wands",
  34: "Queen of Wands",
  35: "King of Wands",
  // 圣杯牌
  36: "Ace of Cups",
  37: "Two of Cups",
  38: "Three of Cups",
  39: "Four of Cups",
  40: "Five of Cups",
  41: "Six of Cups",
  42: "Seven of Cups",
  43: "Eight of Cups",
  44: "Nine of Cups",
  45: "Ten of Cups",
  46: "Page of Cups",
  47: "Knight of Cups",
  48: "Queen of Cups",
  49: "King of Cups",
  // 宝剑牌
  50: "Ace of Swords",
  51: "Two of Swords",
  52: "Three of Swords",
  53: "Four of Swords",
  54: "Five of Swords",
  55: "Six of Swords",
  56: "Seven of Swords",
  57: "Eight of Swords",
  58: "Nine of Swords",
  59: "Ten of Swords",
  60: "Page of Swords",
  61: "Knight of Swords",
  62: "Queen of Swords",
  63: "King of Swords",
  // 钱币牌
  64: "Ace of Pentacles",
  65: "Two of Pentacles",
  66: "Three of Pentacles",
  67: "Four of Pentacles",
  68: "Five of Pentacles",
  69: "Six of Pentacles",
  70: "Seven of Pentacles",
  71: "Eight of Pentacles",
  72: "Nine of Pentacles",
  73: "Ten of Pentacles",
  74: "Page of Pentacles",
  75: "Knight of Pentacles",
  76: "Queen of Pentacles",
  77: "King of Pentacles",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, accountId } = req.body;

    if (!question || !accountId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Print environment variables (avoid printing full API key in production)
    console.log("API Key exists:", !!process.env.AI_API_KEY);
    console.log("API Key prefix:", process.env.AI_API_KEY?.substring(0, 7));

    // Build prompt
    const prompt = `As a cute demon-like anime fortune teller (think of a playful, mischievous but caring character), provide a charming and insightful tarot reading for user ${accountId} who asks: ${question}

I'll draw three special cards from my magical 78-card Tarot deck~ ✨ The first card shows what led to your current situation, the second reveals your present circumstances, and the third unveils what destiny has in store for you! Remember, I'll format my reading exactly like this:
[number]: [interpretation]

Format requirements (don't break character!):
1. Each line must start with a number and colon, e.g., "1: " or "-1: "
2. Use positive numbers (1-78) for upright cards and negative numbers (-1 to -78) for reversed cards
3. Don't explicitly mention "upright", "reversed", "past", "present", or "future"
4. Each interpretation should include:
   - The card's mystical meaning and its energy
   - How it connects to the querent's journey
   - Its influence on their situation
   - Playful but practical advice with a caring tone
5. Exactly three lines of reading, one card per line
6. Keep the cute demon fortune teller personality consistent
7. No extra text or formatting

Example format:
12: Ohoho~ The Hanged Man has appeared to show me something interesting! I can see you've been taking your time with things lately, looking at life from different angles. Your patience hasn't gone unnoticed by the spirits! This unusual perspective will serve you well - trust your unique way of seeing things, my dear client! ✨

-5: *giggles mischievously* My my, what do we have here? The Hierophant is playing tricks by appearing upside down! You're breaking free from old rules and finding your own path. How exciting! Just remember to keep a balance between rebellion and wisdom - even us little demons know when to respect tradition! 

31: Ara ara~ The Ten of Wands brings such intense energy! You're carrying quite a lot on your shoulders, aren't you? But don't worry, I can see great rewards ahead if you manage your energy wisely. Here's a secret tip from your favorite fortune teller: delegate some of those responsibilities, and save some magic for yourself! ♪`;

    console.log("Attempting API call with proxy:", proxyUrl);

    try {
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        max_tokens: 1000,
      });

      console.log("OpenAI API call successful");
      const result = completion.choices[0].message.content;
      console.log("Result:", result);

      // Validate response format
      const lines = result?.split("\n").filter((line) => line.trim());
      if (
        !lines ||
        lines.length !== 3 ||
        !lines.every((line) => /^-?\d+:.+$/.test(line))
      ) {
        throw new Error("Invalid response format from OpenAI");
      }

      // Parse results into structured data
      const parsedResults = lines.map((line) => {
        // Extract card number and interpretation using regex
        const match = line.match(/^(-?\d+):\s*(.+)$/);
        if (!match) {
          throw new Error(`Invalid line format: ${line}`);
        }

        const cardNumber = parseInt(match[1]);
        const interpretation = match[2].trim();

        // Determine card image path
        const isReversed = cardNumber < 0;
        const absoluteNumber = Math.abs(cardNumber);
        const imageFolder = isReversed ? "reversed" : "upright";

        // Get card name
        const baseCardName = tarotCards[absoluteNumber];
        if (!baseCardName) {
          throw new Error(`Invalid card number: ${absoluteNumber}`);
        }

        // Add reversed indicator to card name
        const cardName = isReversed
          ? `${baseCardName} (Reversed)`
          : baseCardName;

        return {
          result: interpretation,
          card: `/images/${imageFolder}/${absoluteNumber}.jpg`,
          cardNumber: cardNumber,
          cardName: cardName,
          isReversed: isReversed,
        };
      });

      return res.status(200).json({ readings: parsedResults });
    } catch (apiError) {
      console.error("OpenAI API Error Details:", {
        name: apiError.name,
        message: apiError.message,
        type: apiError.type,
        status: apiError.status,
      });
      throw apiError; // Re-throw error for outer catch block
    }
  } catch (error) {
    console.error("API Error:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    // Return different error messages based on error type
    if (error.name === "APIConnectionError") {
      return res.status(503).json({
        error: "Service temporarily unavailable",
        details: "Unable to connect to OpenAI API. Please try again later.",
      });
    }

    if (error.name === "APIError" && error.status === 401) {
      return res.status(500).json({
        error: "Configuration error",
        details: "Invalid API key configuration",
      });
    }

    return res.status(500).json({
      error: "Failed to process request",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
