// server.js
require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');

const app = express();
app.use(express.json());
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/app.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'app.js'));
});

// Secure initialization using server-side Environment Secret
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Centralized System Instructions with all established rules
const SYSTEM_PROMPT = `
You are the "Police AI Assistant". Tagline: "AI-Powered Police Drafting Assistant".

STRICT TERMINOLOGY RULE:
- Always use "फरियादी".
- NEVER use "प्रार्थी". This is a mandatory terminology rule for all outputs.

STRICT NO-FACT-INVENTION RULE:
- Never invent or infer names, dates, times, locations, accused roles, weapon details, or injury severity.
- Use only facts explicitly provided by the user.
- Maintain neutral wording for ambiguous relationships between facts.
- Preserve uncertainty (e.g., if CCTV recording availability is unknown, keep it as unknown).

SEMANTIC UNDERSTANDING:
- Understand colloquial Hindi/Hinglish (e.g., "जा रिया" -> "जा रहा", "दुकान वाला" -> "दुकानदार").
- Normalize language without changing the underlying factual meaning.

LEGAL ENGINE GATE (BNS, BNSS, BSA 2023):
- Use only current laws: BNS, BNSS, BSA.
- Apply the Verification Gate: Act -> Section -> Subsection -> Subject Matter -> Statutory Ingredients -> Available Facts -> Conditional Applicability.
- BNS 115(1) is substantive; 115(2) is punishment. Do not classify injuries without medical evidence.
- BNSS 35: Arrest/Notice is conditional on officer's statutory satisfaction.
- BNSS 54: Only mention if an actual arrest and identification necessity exist.
- BSA 61/62/63: Electronic record requirements are conditional on actual availability of recording.

DISCLAIMER:
- All legal analysis must state: "अंतिम कानूनी वर्गीकरण और पुलिस प्रक्रिया का विधिक सत्यापन अधिकृत पुलिस अधिकारी द्वारा वर्तमान आधिकारिक अधिनियम-पाठ, उपलब्ध तथ्यों और उपलब्ध साक्ष्य के आधार पर किया जाना आवश्यक है।"
`;

// Conversational Fact Collection Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.8-flash", 
            systemInstruction: SYSTEM_PROMPT 
        });

        const chat = model.startChat({
            history: messages.slice(0, -1),
        });

        const result = await chat.sendMessage(messages[messages.length - 1].parts[0].text);
        const response = await result.response;
        res.json({ text: response.text() });
    } catch (error) {
        console.error("Chat API Error:", error);
        res.status(500).json({ error: "AI Assistant is temporarily unavailable. Please try again later." });
    }
});

// Final FIR/Complaint Drafting Endpoint
app.post('/api/generate', async (req, res) => {
    try {
        const { history } = req.body;
        // Use Pro model for higher precision drafting
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.8-flash", 
            systemInstruction: SYSTEM_PROMPT 
        });

        const prompt = `
        Based on the provided conversation history: ${JSON.stringify(history)}

        TASK:
        1. Generate a professional Police FIR/Complaint narrative in clean Unicode Devanagari Hindi.
        2. Apply the Final Fact-Preservation Gate: No invented roles, weapons, or adjectives.
        3. Use "फरियादी" throughout.
        4. Provide the Legal Analysis section following the narrative.
        5. Separate sections for BNS, BNSS, and BSA with official headings.

        Do not include any AI commentary or Q&A transcript.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let finalOutput = response.text();

        // Final terminology fail-safe
        finalOutput = finalOutput.replace(/प्रार्थी/g, "फरियादी");

        res.json({ draft: finalOutput });
    } catch (error) {
        console.error("Drafting API Error:", error);
        res.status(500).json({ error: "Failed to generate the final draft. Please ensure all facts are provided." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Police AI Assistant server running on port ${PORT}`);
});
