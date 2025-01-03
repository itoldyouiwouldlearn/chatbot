// DOM Elements
const messageForm = document.querySelector(".prompt__form");
const chatHistoryContainer = document.querySelector(".chats");
const suggestionItems = document.querySelectorAll(".suggests__item");
const themeToggleButton = document.getElementById("themeToggler");
const clearChatButton = document.getElementById("deleteButton");

// State variables
let currentUserMessage = null;
let isGeneratingResponse = false;

// API Configuration
const GOOGLE_API_KEY = "AIzaSyBqxnMlzIeZ2i1uAqp_8lXAArXWMk8QDqY"; //API
const API_REQUEST_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GOOGLE_API_KEY}`;

// Utility Functions
const createChatMessageElement = (htmlContent, ...cssClasses) => {
    const element = document.createElement("div");
    element.classList.add("message", ...cssClasses);
    element.innerHTML = htmlContent;
    return element;
};

const addCopyButtonToCodeBlocks = () => {
    document.querySelectorAll("pre").forEach(block => {
        const codeElement = block.querySelector("code");
        const language = [...codeElement.classList]
            .find(cls => cls.startsWith("language-"))?.replace("language-", "") || "Text";

        block.append(createElement("div", "code__language-label", language.charAt(0).toUpperCase() + language.slice(1)));
        const copyButton = createElement("button", "code__copy-btn", `<i class='bx bx-copy'></i>`);

        copyButton.addEventListener("click", () => {
            navigator.clipboard.writeText(codeElement.innerText).then(() => {
                updateCopyButton(copyButton);
            }).catch(console.error);
        });
        block.append(copyButton);
    });
};

const createElement = (tag, className, content = "") => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.innerHTML = content;
    return element;
};

const updateCopyButton = (button) => {
    button.innerHTML = `<i class='bx bx-check'></i>`;
    setTimeout(() => button.innerHTML = `<i class='bx bx-copy'></i>`, 2000);
};

// Typing effect function
const showTypingEffect = (fullText, text, targetElement, containerElement, complete = false) => {
    let index = 0;
    targetElement.textContent = ""; // Clear any existing text
    const typingInterval = setInterval(() => {
        if (index < text.length) {
            targetElement.textContent += text.charAt(index);
            index++;
        } else {
            clearInterval(typingInterval);
            if (complete) {
                containerElement.classList.remove("message--loading");
            }
        }
    }, 50); // Adjust the speed of typing by changing the interval
};

// Core Functions
const loadSavedChatHistory = () => {
    const savedChats = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
    const isLightMode = localStorage.getItem("themeColor") === "light_mode";

    document.body.classList.toggle("light_mode", isLightMode);
    themeToggleButton.innerHTML = isLightMode ? '<i class="bx bx-moon"></i>' : '<i class="bx bx-sun"></i>';
    chatHistoryContainer.innerHTML = "";

    savedChats.forEach(chat => {
        const userMessageElement = createChatMessageElement(`
            <div class="message__content">
                <img class="message__avatar" src="assets/profile.png" alt="User avatar">
                <p class="message__text">${chat.userMessage}</p>
            </div>
        `, "message--outgoing");
        chatHistoryContainer.appendChild(userMessageElement);

        const responseText = chat.apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const incomingMessageElement = createChatMessageElement(`
            <div class="message__content">
                <img class="message__avatar" src="assets/gemini.svg" alt="Gemini avatar">
                <p class="message__text"></p>
            </div>
            <span class="message__icon hide"><i class='bx bx-copy-alt'></i></span>
        `, "message--incoming");
        chatHistoryContainer.appendChild(incomingMessageElement);

        const messageTextElement = incomingMessageElement.querySelector(".message__text");
        showTypingEffect(responseText, responseText, messageTextElement, incomingMessageElement, true);
    });

    document.body.classList.toggle("hide-header", savedChats.length > 0);
};

const handleOutgoingMessage = () => {
    currentUserMessage = messageForm.querySelector(".prompt__form-input").value.trim() || currentUserMessage;
    if (!currentUserMessage || isGeneratingResponse) return;

    isGeneratingResponse = true;
    const outgoingMessageElement = createChatMessageElement(`
        <div class="message__content">
            <img class="message__avatar" src="assets/profile.png" alt="User avatar">
            <p class="message__text">${currentUserMessage}</p>
        </div>
    `, "message--outgoing");

    chatHistoryContainer.appendChild(outgoingMessageElement);
    messageForm.reset();
    document.body.classList.add("hide-header");
    setTimeout(displayLoadingAnimation, 500);
};

const displayLoadingAnimation = () => {
    const loadingMessageElement = createChatMessageElement(`
        <div class="message__content">
            <img class="message__avatar" src="assets/gemini.svg" alt="Gemini avatar">
            <p class="message__text"></p>
            <div class="message__loading-indicator">
                <div class="message__loading-bar"></div>
            </div>
        </div>
    `, "message--incoming", "message--loading");

    chatHistoryContainer.appendChild(loadingMessageElement);
    requestApiResponse(loadingMessageElement);
};

const requestApiResponse = async (incomingMessageElement) => {
    const messageTextElement = incomingMessageElement.querySelector(".message__text");

    try {
        const response = await fetch(API_REQUEST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    role: "user", 
                    parts: [{ text: currentUserMessage }]
                }]
            }),
        });

        if (!response.ok) throw new Error("API Error");

        const responseData = await response.json();
        const responseText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

        showTypingEffect(responseText, responseText, messageTextElement, incomingMessageElement);

        const savedChats = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
        savedChats.push({ userMessage: currentUserMessage, apiResponse: responseData });
        localStorage.setItem("saved-api-chats", JSON.stringify(savedChats));
    } catch (error) {
        console.error(error);
        messageTextElement.textContent = error.message;
    } finally {
        isGeneratingResponse = false;
        incomingMessageElement.classList.remove("message--loading");
    }
};

// Event Listeners
clearChatButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete all chat history?")) {
        localStorage.removeItem("saved-api-chats");
        loadSavedChatHistory();
        currentUserMessage = null;
        isGeneratingResponse = false;
    }
});

suggestionItems.forEach(suggestion => suggestion.addEventListener("click", () => {
    currentUserMessage = suggestion.querySelector(".suggests__item-text").innerText;
    handleOutgoingMessage();
}));

messageForm.addEventListener("submit", e => {
    e.preventDefault();
    handleOutgoingMessage();
});

// Initialize
loadSavedChatHistory();
