// Get deck name from URL parameters
const urlParams = new URLSearchParams(window.location.search);
let selectedDeck =
  urlParams.get("deck") || sessionStorage.getItem("selectedDeckPath");
let cards = [];
let currentIndex = 0;
let reviewedCards = new Set();
let autoMode = false;
let autoInterval = null;
let shuffledOrder = [];

// Load JSON data
async function loadJSON(path) {
  const response = await fetch(path);
  return response.json();
}

// Load deck from sessionStorage
async function loadDeck() {
  let selectedCards = JSON.parse(sessionStorage.getItem("selectedCards"));

  if (!selectedCards || selectedCards.length === 0) {
    console.error("No selected cards found. Redirecting...");
    window.location.href = "deckview.html";
    return;
  }

  // Shuffle deck before using it
  cards = shuffleArray(selectedCards);
  currentIndex = 0;
  displayCard();
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Display the current card
function displayCard() {

  // Find the next unreviewed card
  let attempts = 0;
  while (reviewedCards.has(currentIndex) && attempts < cards.length) {
    currentIndex = (currentIndex + 1) % cards.length;
    attempts++;
  }

  let card = cards[currentIndex];

  document.getElementById("card-image").src =
    card.image || "images/taiyaki.png";
  document.getElementById("english-text").textContent = card.english || "";
  document.getElementById("kanji").textContent = card.japanese.kanji || "";
  document.getElementById("furigana").textContent =
    card.japanese.furigana || "";

  // Hide Japanese and image initially
  document.querySelector(".japanese-container").classList.add("hidden");
  document.querySelector(".image-container").style.display = "none";
}

function displayCompletionCard() {
  updateCardUI("お疲れ様！", "Good Job!", "", "images/taiyaki.png");
  document.getElementById("finished-sound").play();

  setTimeout(() => {
    returnToDeckView();
  }, 2000);
}


// Reveal Japanese or move to the next card
function revealOrNextCard() {
  let japaneseContainer = document.querySelector(".japanese-container");
  let imageContainer = document.querySelector(".image-container");

  if (japaneseContainer.classList.contains("hidden")) {
    // Reveal Japanese text and image
    revealJapaneseText();

    // ✅ Mark this card as reviewed
    reviewedCards.add(currentIndex);
  } else {
    // Move to the next card
    nextCard();
  }
}


// Move to the next card
function nextCard() {
  if (!cards.length) return;

  // ✅ Check if all cards have been reviewed BEFORE trying to move on
  if (reviewedCards.size >= cards.length) {
    displayCompletionCard();
    return;
  }

  let attempts = 0;
  do {
    currentIndex = (currentIndex + 1) % cards.length;
    attempts++;
  } while (reviewedCards.has(currentIndex) && attempts < cards.length);

  displayCard();
}


function revealJapaneseText() {
  let japaneseContainer = document.querySelector(".japanese-container");
  let imageContainer = document.querySelector(".image-container");

  japaneseContainer.classList.remove("hidden");
  imageContainer.style.display = "flex";
}

function toggleImage() {
  let imageContainer = document.querySelector(".image-container");
  let button = document.getElementById("toggle-image-btn");

  if (imageContainer) {
    let isHidden = imageContainer.style.display === "none";
    imageContainer.style.display = isHidden ? "flex" : "none";

    // Update button text
    button.textContent = isHidden ? "Hide Image" : "Show Image";

    // Store setting in sessionStorage
    sessionStorage.setItem("showImage", isHidden);
  }
}

// Auto Mode: Reveal then move to next card
function toggleAutoMode() {
  autoMode = !autoMode;
  let autoButton = document.getElementById("auto-mode-btn");
  autoButton.textContent = autoMode ? "Auto Mode: ON" : "Auto Mode: OFF";
  autoButton.classList.toggle("on", autoMode);

  if (autoMode) {
    startAutoMode();
  } else {
    stopAutoMode();
  }
}

function startAutoMode() {
  if (!autoMode) return;

  setTimeout(() => {
    revealJapaneseText();
    
    // ✅ Mark the current card as reviewed
    reviewedCards.add(currentIndex);

    setTimeout(() => {
      if (autoMode) {
        nextCard();
        startAutoMode();
      }
    }, 2000);
  }, 2000);
}


// Settings menu controls
function toggleSettingsMenu() {
  document.getElementById("settings-menu").classList.toggle("hidden");
}

// Load the deck on page load
document.addEventListener("DOMContentLoaded", loadDeck);
