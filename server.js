// server.js
require('dotenv').config();
const express = require('express');
const { GoogleGenAI } = require('@google/genai');
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
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Centralized System Instructions
const SYSTEM_PROMPT = `
You are the "Police AI Assistant".
Tagline: "AI-Powered Police Drafting Assistant".

STRICT TERMINOLOGY RULE:
- Always use "फरियादी".
- NEVER use "प्रार्थी".

STRICT NO-FACT-INVENTION RULE:
- Never invent or infer names, dates, times, locations, accused roles,
  weapon details, injury severity, witnesses, evidence, or other facts.
- Use only facts explicitly provided by the user.
- Never convert an unknown fact into a confirmed fact.
- If a required fact is missing, clearly indicate that it is not provided.
- Do not create fake placeholders that look like actual facts.

SEMANTIC UNDERSTANDING:
- Understand colloquial Hindi/Hinglish.
- Normalize language without changing the factual meaning.

LEGAL ENGINE GATE:
- Use only current laws: BNS, BNSS, BSA.
- Apply:
  Act -> Section -> Subsection -> Subject Matter ->
  Statutory Ingredients -> Available Facts -> Conditional Applicability.
- Do not give a legal section as definitely applicable unless the
  provided facts satisfy the relevant statutory ingredients.
- BNS 115(1) is substantive; 115(2) is punishment.
- Do not classify injury severity without medical evidence.
- BNSS 35: Arrest/Notice is conditional on statutory requirements.
- BNSS 54: Mention only when actual arrest and identification necessity exist.
- BSA 61/62/63: Electronic record requirements are conditional
  on actual availability of the electronic record.

DISCLAIMER:
All legal analysis must state:
"अंतिम कानूनी वर्गीकरण और पुलिस प्रक्रिया का विधिक सत्यापन अधिकृत पुलिस अधिकारी द्वारा वर्तमान आधिकारिक अधिनियम-पाठ, उपलब्ध तथ्यों और उपलब्ध साक्ष्य के आधार पर किया जाना आवश्यक है।"
`;

// Conversational Fact Collection Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        const response = await ai.models.generateContent({
            model: 'gemini-3.7-flash',
            contents: messages,
            config: {
                systemInstruction: SYSTEM_PROMPT
            }
        });

        res.json({
            text: response.text
        });

    } catch (error) {
        console.error('Chat API Error:', error);

        res.status(500).json({
            error: 'AI Assistant is temporarily unavailable. Please try again later.'
        });
    }
});

// Final FIR/Complaint Drafting Endpoint
app.post('/api/generate', async (req, res) => {
    try {
        const { history } = req.body;

        const prompt = `
Based on the following conversation history:

${JSON.stringify(history)}

TASK:

1. Generate a professional Police FIR/Complaint narrative
   in clean Unicode Devanagari Hindi.

2. Use only facts explicitly present in the conversation.

3. DO NOT invent:
   - names
   - dates
   - times
   - locations
   - accused details
   - weapons
   - witnesses
   - injuries
   - CCTV
   - recovery
   - investigation facts
   - statements not actually provided

4. If an important fact is missing, do not fabricate it.

5. Always use "फरियादी".
   Never use "प्रार्थी".

6. After the factual narrative, provide:

   कानूनी विश्लेषण

   BNS:
   Mention only sections whose statutory ingredients are
   supported by the facts provided.
   If facts are insufficient, clearly say that verification
   is required instead of making a definite classification.

   BNSS:
   Mention only provisions actually relevant to the facts.

   BSA:
   Mention electronic evidence provisions only when
   electronic evidence is actually present or discussed.

7. Do not include the AI's internal reasoning,
   conversation transcript, or unnecessary commentary.

8. End the legal analysis with exactly this disclaimer:

"अंतिम कानूनी वर्गीकरण और पुलिस प्रक्रिया का विधिक सत्यापन अधिकृत पुलिस अधिकारी द्वारा वर्तमान आधिकारिक अधिनियम-पाठ, उपलब्ध तथ्यों और उपलब्ध साक्ष्य के आधार पर किया जाना आवश्यक है।"
`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.7-flash',
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_PROMPT
            }
        });

        let finalOutput = response.text;

        // Final terminology fail-safe
        finalOutput = finalOutput.replace(/प्रार्थी/g, 'फरियादी');

        res.json({
            draft: finalOutput
        });

    } catch (error) {
        console.error('Drafting API Error:', error);

        res.status(500).json({
            error: 'Failed to generate the final draft. Please ensure all facts are provided.'
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Police AI Assistant server running on port ${PORT}`);
});
