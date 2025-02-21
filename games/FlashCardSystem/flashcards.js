// Get deck name from URL parameters
const urlParams = new URLSearchParams(window.location.search);
let selectedDeck = urlParams.get("deck") || sessionStorage.getItem("selectedDeckPath");
let cards = [];
let currentIndex = 0;
let reviewedCards = new Set();
let autoMode = false;
let autoInterval = null;
let shuffledOrder = [];



// Load JSON data
async function loadJSON(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error();
        return await response.json();
    } catch {
        return [];
    }
}

// Load the selected deck - only with selected cards
async function loadDeck() {
    let selectedCards = JSON.parse(sessionStorage.getItem("selectedCards"));

    if (!selectedCards || selectedCards.length === 0) {
        console.error("No selected cards found. Redirecting to deck selection.");
        window.location.href = "deckview.html";
        return;
    }

    cards = selectedCards;
    currentIndex = 0;
    reviewedCards.clear();

    if (sessionStorage.getItem("mode") === "random") {
        shuffleCards();
    }

    displayCard();
}

function shuffleCards() {
    for (let i = cards.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]]; // Swap elements
    }
}

function displayCard() {
    if (!cards.length) return;

    // Check if all cards have been reviewed
    if (reviewedCards.size >= cards.length) {
        updateCardUI("お疲れ様！", "Good Job!", "", "images/taiyaki.png");
        
        // Redirect to deck view after 2 seconds
        setTimeout(() => {
            returnToDeckView();
        }, 2000);
        return;
    }

    // Find the next unreviewed card
    let attempts = 0;
    while (reviewedCards.has(currentIndex) && attempts < cards.length) {
        currentIndex = (currentIndex + 1) % cards.length;
        attempts++;
    }

    let card = cards[currentIndex];

    // Auto-toggle Japanese if both kanji and furigana are empty
    if (!card.japanese.kanji && !card.japanese.furigana) {
        toggleJapanese(true); // Auto-center image
    }

    updateCardUI(card.english, card.japanese.kanji, card.japanese.furigana, card.image);
}
    // Fade in and out effect - To add put inside displayCard()
    /*
    fadeOut(() => {
        updateCardUI(card.english, card.japanese.kanji, card.japanese.furigana, card.image);
        fadeIn();
    });
    */


function updateCardUI(english, kanji, furigana, image) {
    document.getElementById("card-image").src = image;
    document.getElementById("kanji").textContent = kanji;
    document.getElementById("furigana").textContent = furigana;
    document.getElementById("english-text").textContent = english;
    
    // Ensure English starts hidden on new cards
    document.getElementById("english-text").style.visibility = "hidden";
}

function nextCard() {
    if (!cards.length) return;

    let attempts = 0;
    do {
        currentIndex = (currentIndex + 1) % cards.length;
        attempts++;
    } while (reviewedCards.has(currentIndex) && attempts < cards.length);

    displayCard();
}


// Fade Out & Fade In for entire flashcard
function fadeOut(callback) {
    let flashcard = document.getElementById("flashcard");
    flashcard.classList.add("hidden");
    setTimeout(() => {
        callback();
    }, 450);
}
function fadeIn() {
    let flashcard = document.getElementById("flashcard");
    setTimeout(() => {
        flashcard.classList.remove("hidden");
    }, 100);
}

// Reveal English or Move to Next Card
function revealOrNextCard() {
    let englishText = document.getElementById("english-text");

    // If no English text exists, immediately go to next card
    if (!englishText || !englishText.textContent || englishText.textContent.trim() === "") {
        reviewedCards.add(currentIndex); // Mark current card as reviewed
        if (reviewedCards.size >= cards.length) { // Check if all cards have been reviewed
            displayCard();
            return;
        }
        // Move to the next card
        nextCard();
        return;
    }

    if(englishText.style.visibility === "hidden") {
        // Reveal English text
        englishText.style.visibility = "visible";
    } else {
        // Mark current card as reviewed
        reviewedCards.add(currentIndex);

        // Check if all cards have been reviewed
        if (reviewedCards.size >= cards.length) {
            displayCard();
            return;
        }

        // Move to the next card
        nextCard();
    }
}

// Display and hide settings drop down menu
function toggleSettingsMenu() {
    let menu = document.getElementById("settings-menu");
    menu.classList.toggle("hidden");
}

// Toggle Japanese text visibility
function toggleJapanese(auto = false) {
    let japaneseContainer = document.querySelector(".japanese-container");
    if (japaneseContainer) {
        let flashcard = document.getElementById("flashcard");
        
        // Auto-toggle or manual toggle
        if (auto) {
            japaneseContainer.style.display = "none";
            flashcard.classList.add("japanese-hidden");
        } else {
            japaneseContainer.style.display = japaneseContainer.style.display === "none" ? "flex" : "none";
            flashcard.classList.toggle("japanese-hidden");
        }
    }
}

// Toggle Image visibility
function toggleImage() {
    let imageContainer = document.querySelector(".image-container");
    if (imageContainer) {
        let flashcard = document.getElementById("flashcard");
        imageContainer.style.display = imageContainer.style.display === "none" ? "flex" : "none";

        // If hidden, center the Japanese text
        if (imageContainer.style.display === "none") {
            flashcard.classList.add("image-hidden");
        } else {
            flashcard.classList.remove("image-hidden");
        }
    }
}

function toggleAutoMode() {
    autoMode = !autoMode;

    let autoButton = document.getElementById("auto-mode-btn");
    autoButton.textContent = autoMode ? "Auto Mode: ON" : "Auto Mode: OFF";

    if (autoMode) {
        startAutoMode();
    } else {
        stopAutoMode();
    }
}

function startAutoMode() {
    if (autoInterval) return; // Prevent multiple intervals

    autoInterval = setInterval(() => {
        if (reviewedCards.size >= cards.length) {
            stopAutoMode();
            displayCard();
            return;
        }
        revealOrNextCard();
    }, 2000); // Every 2 seconds
}
function stopAutoMode() {
    clearInterval(autoInterval);
    autoInterval = null;
    autoMode = false;

    let autoButton = document.getElementById("auto-mode-btn");
    autoButton.textContent = "Auto Mode: OFF";
}

function returnToDeckView() {
    window.location.href = "deckview.html"; // Redirect to deck selection
}


function goBackward() {
    if (!cards.length) return;

    // Move to previous card
    currentIndex = (currentIndex - 1 + cards.length) % cards.length;

    // Display the previous card but do NOT update the reviewedCards tracker
    let card = cards[currentIndex];
    updateCardUI(card.english, card.japanese.kanji, card.japanese.furigana, card.image);

    // Ensure English text is visible when moving backward
    //document.getElementById("english-text").style.visibility = "visible";
}




// Load default deck on page load
document.addEventListener("DOMContentLoaded", loadDeck);

// Check for clicking on the background
document.getElementById("left-screen").addEventListener("click", goBackward);
document.getElementById("right-screen").addEventListener("click", revealOrNextCard);
