let allCards = []; // Full deck of selected cards
let cards = []; // Subset of cards displayed in the current session
let displayedCards = []; // Cards currently being displayed (shuffled)
const DEFAULT_CARDS_DISPLAYED = 21;
let maxCardsDisplayed = DEFAULT_CARDS_DISPLAYED;

// Load cards from sessionStorage and select a subset of cards
document.addEventListener("DOMContentLoaded", () => {
  const storedCards = sessionStorage.getItem("selectedCards");
  if (storedCards) {
    allCards = JSON.parse(storedCards); // Store full deck

    // Select up to maxCardsDisplayed cards from the full pool
    cards =
      allCards.length > maxCardsDisplayed
        ? getRandomSubset(allCards, maxCardsDisplayed)
        : allCards;

    displayCards();
  } else {
    alert("No cards found. Redirecting back to deck view.");
    window.location.href = "deckview.html";
  }

  // Ensure the English toggle button is set correctly when the page loads
  updateEnglishToggleButton();
});

// Display the initial grid of cards
function displayCards() {
  let cardGrid = document.getElementById("card-grid");
  cardGrid.innerHTML = "";

  displayedCards = [...cards];

  // Retrieve English text visibility state
  let showEnglish = sessionStorage.getItem("showEnglishText") === "true";

  displayedCards.forEach((card, index) => {
    let cardElement = document.createElement("div");
    cardElement.classList.add("card");
    cardElement.dataset.index = index;

    // Display card with optional English text
    cardElement.innerHTML = `
              <div class="card-content">
                  <img src="${card.image}" alt="${card.english}">
                  <p class="card-text ${showEnglish ? "" : "hidden"}">${
      card.english
    }</p>
              </div>
          `;

    cardGrid.appendChild(cardElement);

    const allCards = document.querySelectorAll(".card"); // Adjust if your card class is different
    assignCardValues(allCards);
    allCards.forEach((card) => card.addEventListener("click", onCardClick));
  });
}

// TORANDO RELATED FUNCTIONS

function assignCardValues(cards) {
  const possibleValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const totalCards = cards.length;
  // A tornado for every 5 cards
  const minTornados = Math.max(1, Math.floor(totalCards / 5));

  // Create an array with the right number of tornados
  const values = Array(minTornados).fill("tornado");

  // Fill the rest with random point values
  while (values.length < totalCards) {
    const randomValue =
      possibleValues[Math.floor(Math.random() * possibleValues.length)];
    values.push(randomValue);
  }

  // Shuffle the array
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  // Assign to cards
  cards.forEach((card, index) => {
    card.dataset.value = values[index];
  });
}

function onCardClick(e) {
  const card = e.currentTarget;
  const value = card.dataset.value;

  // Remove image (you can adjust the selector to match your structure)
  const img = card.querySelector("img");
  if (img) img.remove();

  // Remove English text
  const enText = card.querySelector(".card-text");
  if (enText) enText.remove();

  // Show result
  const result = document.createElement("div");
  result.classList.add("card-result");

  if (value === "tornado") {
    result.textContent = "🌪️ Tornado!";
    tornado(card);
    document.getElementById("tornado-sound").play();
  } else {
    result.textContent = `+${value} pts`;
    document.getElementById("select-sound").play();
  }

  card.appendChild(result);
  card.classList.add("revealed");
  card.removeEventListener("click", onCardClick);
}

function tornado(card) {
  // Placeholder for future effects
  console.log("Tornado triggered!");
}

// Shuffle helper function
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Select a random subset of cards
function getRandomSubset(array, limit) {
  let shuffled = shuffleArray([...array]);
  return shuffled.slice(0, limit);
}

// Settings menu controls
function toggleSettingsMenu() {
  let settingsMenu = document.getElementById("settings-menu");

  if (settingsMenu.classList.contains("hidden")) {
    settingsMenu.classList.remove("hidden");
    updateEnglishToggleButton();
  } else {
    settingsMenu.classList.add("hidden");
  }
}

// Apply settings for missing cards and number of displayed cards
function applySettings() {
  let displayLimitInput = parseInt(
    document.getElementById("display-card-limit").value
  );

  maxCardsDisplayed = Math.min(Math.max(displayLimitInput, 1), allCards.length);

  cards =
    allCards.length > maxCardsDisplayed
      ? getRandomSubset(allCards, maxCardsDisplayed)
      : allCards;
  displayCards();
  toggleSettingsMenu();
}

// Reselect cards from the full pool without refreshing
function reselectCards() {
  // Force reload page to get a new selection of cards
  location.reload();
}

// Toggle English text on and off
function toggleEnglishText() {
  let showEnglish = sessionStorage.getItem("showEnglishText") === "true";

  // Toggle state
  let newState = !showEnglish;
  sessionStorage.setItem("showEnglishText", newState);

  // Update button appearance
  updateEnglishToggleButton();

  // Toggle visibility of English text without affecting game state
  document.querySelectorAll(".card-text").forEach((text) => {
    text.classList.toggle("hidden", !newState);
  });
}

// Update the English toggle button text and color
function updateEnglishToggleButton() {
  let button = document.getElementById("toggle-english-btn");
  let showEnglish = sessionStorage.getItem("showEnglishText") === "true";

  button.textContent = `English: ${showEnglish ? "ON" : "OFF"}`;
  button.classList.toggle("off", !showEnglish);
}
