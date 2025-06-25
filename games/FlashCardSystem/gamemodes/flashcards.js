// Get deck name from URL parameters
const urlParams = new URLSearchParams(window.location.search);
let selectedDeck =
  urlParams.get("deck") || sessionStorage.getItem("selectedDeckPath");
let cards = [];
let currentIndex = 0;
let autoMode = false;
let autoInterval = null;
let shuffledOrder = [];
let isRevealed = false;
let japaneseVisible = true;
let imageVisible = true;

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

  toggleImage(true);
  toggleJapanese(true);

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
  const card = cards[currentIndex];

  document.getElementById("card-image").src = card.image;
  document.getElementById("english-text").textContent = card.english;
  document.getElementById("kanji").textContent = card.japanese.kanji;
  document.getElementById("furigana").textContent = card.japanese.furigana;

  // Always hide English initially
  document.getElementById("english-text").classList.add("hidden");
  isRevealed = false;

  // Auto-toggle Japanese if both are missing
  if (!card.japanese.kanji && !card.japanese.furigana) {
    toggleJapanese(true);
  }
}

// Reveal English or Move to Next Card
function revealOrNextCard() {
  const english = document.getElementById("english-text");

  if (!isRevealed) {
    english.classList.remove("hidden");
    english.style.visibility = "visible";
    isRevealed = true;
  } else {
    nextCard();
  }
}
function nextCard() {
  if (currentIndex < cards.length) {
    currentIndex++;
    displayCard();
  } else if (currentIndex <= cards.length) {
    showEndCard();
  }
}
function previousCard() {
  if (currentIndex > 0) {
    currentIndex--;
    displayCard();
  }
}

// Toggle Japanese text visibility
function toggleJapanese(auto = false) {
  let japaneseContainer = document.querySelector(".japanese-container");
  let button = document.getElementById("toggle-japanese-btn");

  if (japaneseContainer) {
    let flashcard = document.getElementById("flashcard");

    if (auto) {
      // Set visibility based on sessionStorage
      japaneseVisible = sessionStorage.getItem("japaneseVisible") !== "false";
    } else {
      // Manual toggle
      japaneseVisible = !japaneseVisible;
      sessionStorage.setItem("japaneseVisible", japaneseVisible);
    }

    japaneseContainer.style.display = japaneseVisible ? "flex" : "none";
    flashcard.classList.toggle("japanese-hidden", !japaneseVisible);

    // Update button state
    button.textContent = japaneseVisible ? "Hide Japanese" : "Show Japanese";
    button.classList.toggle("off", !japaneseVisible);
  }
}

// Toggle Image visibility
function toggleImage(auto = false) {
  let imageContainer = document.querySelector(".image-container");
  let button = document.getElementById("toggle-image-btn");
  let flashcard = document.getElementById("flashcard");

  if (imageContainer) {
    if (auto) {
      // Read from sessionStorage
      imageVisible = sessionStorage.getItem("imageVisible") !== "false";
    } else {
      // Manual toggle
      imageVisible = !imageVisible;
      sessionStorage.setItem("imageVisible", imageVisible);
    }

    imageContainer.style.display = imageVisible ? "flex" : "none";
    flashcard.classList.toggle("image-hidden", !imageVisible);

    button.textContent = imageVisible ? "Hide Image" : "Show Image";
    button.classList.toggle("off", !imageVisible);
  }
}

// Toggle Auto Mode
function toggleAutoMode() {
  autoMode = !autoMode;

  let autoButton = document.getElementById("auto-mode-btn");
  autoButton.textContent = autoMode ? "Auto Mode: ON" : "Auto Mode: OFF";

  // Toggle between green (ON) and red (OFF)
  autoButton.classList.toggle("on", autoMode);

  if (autoMode) {
    startAutoMode();
  } else {
    stopAutoMode();
  }
}
function startAutoMode() {
  if (autoInterval) return; // Prevent multiple intervals

  autoInterval = setInterval(() => {
    // If on end card or beyond, stop
    if (currentIndex >= cards.length) {
      stopAutoMode();
      return;
    }
    revealOrNextCard();
  }, 2000); // Every 2 seconds
}
function stopAutoMode() {
  clearInterval(autoInterval);
  autoInterval = null;
  autoMode = false;

  const autoButton = document.getElementById("auto-mode-btn");
  autoButton.textContent = "Auto Mode: OFF";
  autoButton.classList.remove("on");
}

function showEndCard() {
  document.getElementById("card-image").src = "images/taiyaki.png";
  document.getElementById("kanji").textContent = "お疲れ様！";
  document.getElementById("furigana").textContent = "";
  document.getElementById("english-text").textContent = "Good Job!";

  document.getElementById("finished-sound").play();

  setTimeout(() => {
    returnToDeckView();
  }, 2000);
}
function returnToDeckView() {
  window.location.href = "deckview.html"; // Redirect to deck selection
}

// Display and hide settings drop down menu
function toggleSettingsMenu() {
  let menu = document.getElementById("settings-menu");
  menu.classList.toggle("hidden");
}

// Load default deck on page load
document.addEventListener("DOMContentLoaded", loadDeck);
