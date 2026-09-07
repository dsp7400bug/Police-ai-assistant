// public/app.js

let chatHistory = [];
let currentMode = 'FIR';

const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const loader = document.getElementById('loader');
const outputArea = document.getElementById('output-area');
const draftText = document.getElementById('draft-text');
const emptyState = document.getElementById('empty-state');

// 1. Initial Greeting
window.onload = () => {
    appendMsg('ai', "जय हिंद। मैं पुलिस एआई सहायक हूँ। कृपया घटना का विवरण दें ताकि ड्राफ्ट तैयार करने में आपकी मदद कर सकूँ।");
};

// 2. Chat Logic
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Display user message
    appendMsg('user', text);
    userInput.value = '';

    // Add to history for API
    chatHistory.push({ role: "user", parts: [{ text: text }] });

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: chatHistory, mode: currentMode })
        });

        if (!response.ok) throw new Error("Server communication error");

        const data = await response.json();

        // Display AI response
        appendMsg('ai', data.text);
        chatHistory.push({ role: "model", parts: [{ text: data.text }] });

    } catch (error) {
        console.error("Chat Error:", error);
        appendMsg('ai', "त्रुटि: सर्वर से जुड़ने में असमर्थ। कृपया बाद में प्रयास करें।");
    }
}

// 3. UI Message Append
function appendMsg(role, text) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.innerText = text;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// 4. Draft Generation Logic
async function generateDraft() {
    if (chatHistory.length === 0) {
        alert("कृपया ड्राफ्ट बनाने से पहले घटना का विवरण दें।");
        return;
    }

    // Show loading state
    emptyState.classList.add('hidden');
    outputArea.classList.add('hidden');
    loader.classList.remove('hidden');

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: chatHistory, mode: currentMode })
        });

        if (!response.ok) throw new Error("Drafting failed");

        const data = await response.json();

        // Display result
        loader.classList.add('hidden');
        outputArea.classList.remove('hidden');
        draftText.innerText = data.draft;

    } catch (error) {
        console.error("Generation Error:", error);
        loader.classList.add('hidden');
        emptyState.classList.remove('hidden');
        alert("ड्राफ्ट जनरेट करने में त्रुटि हुई।");
    }
}

// 5. Voice Input Logic (Speech-to-Text)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; // Default to Hindi
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    micBtn.onclick = () => {
        recognition.start();
        micBtn.classList.add('recording');
        console.log("Listening for voice input...");
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        micBtn.classList.remove('recording');
        console.log("Voice Result:", transcript);
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        micBtn.classList.remove('recording');
    };

    recognition.onend = () => {
        micBtn.classList.remove('recording');
    };
} else {
    micBtn.style.display = 'none';
    console.warn("Browser does not support Speech Recognition.");
}

// 6. Mode Switching (FIR, Khatma, Charge-sheet)
function setMode(mode) {
    currentMode = mode;

    // Update UI Active State
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Reset conversation for new mode
    resetCase();

    // Specific greetings for modes
    const greetings = {
        'FIR': "FIR/शिकायत मोड सक्रिय। घटना का विवरण दें।",
        'KHATMA': "खात्मा/खारिजी मोड सक्रिय। कृपया जांच के निष्कर्ष और तथ्य प्रदान करें।",
        'CHARGE': "चार्जशीट मोड सक्रिय। कृपया साक्ष्य और गवाहों का विवरण दें।"
    };

    appendMsg('ai', greetings[mode] || "मोड बदल दिया गया है।");
}

// 7. Reset / New Case
function resetCase() {
    chatHistory = [];
    chatWindow.innerHTML = '';
    outputArea.classList.add('hidden');
    loader.classList.add('hidden');
    emptyState.classList.remove('hidden');
    userInput.value = '';
    console.log("Case session cleared.");
}

// 8. Copy to Clipboard
function copyDraft() {
    const text = draftText.innerText;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
        alert("ड्राफ्ट सफलतापूर्वक कॉपी किया गया।");
    }).catch(err => {
        console.error("Copy failed:", err);
    });
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
