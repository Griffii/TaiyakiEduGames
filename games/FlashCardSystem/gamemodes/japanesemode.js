const urlParams = new URLSearchParams(window.location.search);
let selectedDeck = urlParams.get("deck") || sessionStorage.getItem("selectedDeckPath");

let cards = [];
let currentIndex = 0;
let autoMode = false;
let autoInterval = null;
let isRevealed = false;
let imageShouldStartVisible = false;

// Load deck
async function loadDeck() {
  const selectedCards = JSON.parse(sessionStorage.getItem("selectedCards"));

  if (!selectedCards || selectedCards.length === 0) {
    console.error("No selected cards found. Redirecting to deck selection.");
    window.location.href = "deckview.html";
    return;
  }

  cards = selectedCards;
  currentIndex = 0;

  if (sessionStorage.getItem("mode") === "random") {
    shuffleCards();
  }

  displayCard();
}

function shuffleCards() {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
}

function displayCard() {
  const card = cards[currentIndex];

  document.getElementById("card-image").src = card.image;
  document.getElementById("english-text").textContent = card.english;
  document.getElementById("kanji").textContent = card.japanese.kanji;
  document.getElementById("furigana").textContent = card.japanese.furigana;

  // Hide Japanese initially
  const japanese = document.querySelector(".japanese-container");
  japanese.classList.add("hidden");

  // Image visibility based on toggle
  const image = document.querySelector(".image-container");
  if (imageShouldStartVisible) {
    image.style.display = "flex";
    document.getElementById("flashcard").classList.remove("image-hidden");
  } else {
    image.style.display = "none";
    document.getElementById("flashcard").classList.add("image-hidden");
  }

  isRevealed = false;
}

function revealOrNextCard() {
  const japanese = document.querySelector(".japanese-container");
  const image = document.querySelector(".image-container");

  if (!isRevealed) {
    // Reveal Japanese
    japanese.classList.remove("hidden");
    japanese.style.visibility = "visible";

    // Reveal image (only if toggle said to start hidden)
    if (!imageShouldStartVisible) {
      image.style.display = "flex";
      document.getElementById("flashcard").classList.remove("image-hidden");
    }

    isRevealed = true;
  } else {
    nextCard();
  }
}


function nextCard() {
  currentIndex++;
  if (currentIndex < cards.length) {
    displayCard();
  } else {
    showEndCard();
  }
}

function previousCard() {
  if (currentIndex > 0) {
    currentIndex--;
    displayCard();
  }
}

function showEndCard() {
  document.getElementById("kanji").textContent = "お疲れ様！";
  document.getElementById("furigana").textContent = "";
  document.getElementById("english-text").textContent = "Good job!";
  document.getElementById("card-image").src = "images/taiyaki.png";

  document.querySelector(".japanese-container").style.display = "flex";
  document.querySelector(".image-container").style.display = "flex";

  isRevealed = true;
  document.getElementById("finished-sound").play();

  setTimeout(() => {
    returnToDeckView();
  }, 2000);
}

function returnToDeckView() {
  window.location.href = "deckview.html";
}

// SETTINGS
function toggleSettingsMenu() {
  const menu = document.getElementById("settings-menu");
  menu.classList.toggle("hidden");
}

// Only toggle startup visibility — reveal still happens on first click
function toggleImage() {
  imageShouldStartVisible = !imageShouldStartVisible;

  // Save the new state to session storage
  sessionStorage.setItem("imageShouldStartVisible", imageShouldStartVisible);

  const button = document.getElementById("toggle-image-btn");
  button.textContent = imageShouldStartVisible ? "Hide Image" : "Show Image";
  button.classList.toggle("off", !imageShouldStartVisible);

  // Apply immediately to current card
  const imageContainer = document.querySelector(".image-container");
  if (imageShouldStartVisible) {
    imageContainer.style.display = "flex";
    document.getElementById("flashcard").classList.remove("image-hidden");
  } else {
    imageContainer.style.display = "none";
    document.getElementById("flashcard").classList.add("image-hidden");
  }
}


// Toggle Auto Mode
function toggleAutoMode() {
  autoMode = !autoMode;

  const autoButton = document.getElementById("auto-mode-btn");
  autoButton.textContent = autoMode ? "Auto Mode: ON" : "Auto Mode: OFF";
  autoButton.classList.toggle("on", autoMode);

  if (autoMode) {
    startAutoMode();
  } else {
    stopAutoMode();
  }
}

function startAutoMode() {
  if (autoInterval) return;

  autoInterval = setInterval(() => {
    if (currentIndex >= cards.length) {
      stopAutoMode();
      return;
    }
    revealOrNextCard();
  }, 2000);
}

function stopAutoMode() {
  clearInterval(autoInterval);
  autoInterval = null;
  autoMode = false;

  const autoButton = document.getElementById("auto-mode-btn");
  autoButton.textContent = "Auto Mode: OFF";
  autoButton.classList.remove("on");
}

document.addEventListener("DOMContentLoaded", () => {
  // Load saved image visibility setting (defaults to false if not set)
  const saved = sessionStorage.getItem("imageShouldStartVisible");
  imageShouldStartVisible = saved === "true"; // sessionStorage stores strings

  // Set button label and visual state before loading deck
  const button = document.getElementById("toggle-image-btn");
  if (button) {
    button.textContent = imageShouldStartVisible ? "Hide Image" : "Show Image";
    button.classList.toggle("off", !imageShouldStartVisible);
  }

  loadDeck();
});

document.addEventListener("click", (event) => {
  const settingsMenu = document.getElementById("settings-menu");
  const settingsButton = document.querySelector(".settings-button");

  // Only try to close it if it's currently visible
  if (!settingsMenu.classList.contains("hidden")) {
    const isClickInsideMenu = settingsMenu.contains(event.target);
    const isClickOnButton = settingsButton.contains(event.target);

    if (!isClickInsideMenu && !isClickOnButton) {
      settingsMenu.classList.add("hidden");
    }
  }
});
