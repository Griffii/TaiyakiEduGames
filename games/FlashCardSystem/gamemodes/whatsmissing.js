let allCards = []; // Full deck of selected cards
let cards = []; // Subset of cards displayed in the current session
let displayedCards = []; // Cards currently being displayed (shuffled)
let missingCard = null;
const DEFAULT_CARDS_DISPLAYED = 21;
let maxCardsDisplayed = DEFAULT_CARDS_DISPLAYED;
let numberOfMissingCards = 1; // Default missing cards count

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
  });
}

// Shuffle displayed cards and remove the selected number of cards
function shuffleAndRemove() {
  // Play card shuffle sound when shuffle is pressed
  document.getElementById("shuffle-sound").play();

  let delay = 50;

  displayedCards = shuffleArray([...cards]);

  numberOfMissingCards =
    parseInt(sessionStorage.getItem("numberOfMissingCards")) || 1;
  let removedCards = [];

  for (let i = 0; i < numberOfMissingCards; i++) {
    let removedCard = displayedCards.splice(
      Math.floor(Math.random() * displayedCards.length),
      1
    )[0];
    removedCards.push(removedCard);
  }

  missingCard = removedCards;

  let cardGrid = document.getElementById("card-grid");
  cardGrid.innerHTML = "";

  // Function to add cards with a delay for animation
  function addCardWithDelay(cardElement, delay) {
    setTimeout(() => {
      cardElement.classList.add("drop-in"); // Add animation class
      cardGrid.appendChild(cardElement);
    }, delay);
  }

  // Add displayed cards one by one with animation
  displayedCards.forEach((card, index) => {
    let cardElement = document.createElement("div");
    cardElement.classList.add("card");
    cardElement.innerHTML = `
          <div class="card-content">
              <img src="${card.image}" alt="${card.english}">
              <p class="card-text">${
                sessionStorage.getItem("showEnglishText") === "true"
                  ? card.english
                  : ""
              }</p>
          </div>
      `;

    // Drop-in animation with slight delay for each card
    addCardWithDelay(cardElement, index * delay); // Adjust delay for smoother effect
  });

  // Add missing cards at the end with animation
  for (let i = 0; i < numberOfMissingCards; i++) {
    let blankCard = document.createElement("div");
    blankCard.classList.add("card");
    blankCard.style.backgroundColor = "lightgreen";
    blankCard.style.backgroundImage =
      "url('/TaiyakiEduGames/assets/game-icons/question-mark.png')"; // Set background image
    blankCard.style.backgroundSize = "cover";
    blankCard.style.backgroundPosition = "center";
    blankCard.style.backgroundRepeat = "no-repeat";

    // Ensure missing cards drop in after the normal cards
    addCardWithDelay(blankCard, displayedCards.length * delay + i * delay);
  }

  // Ensure guess options are displayed after all cards are dropped in
  setTimeout(
    displayGuessOptions,
    (displayedCards.length + numberOfMissingCards) * delay
  );
}

// Show guessing options based on all cards
function displayGuessOptions() {
  let guessSection = document.getElementById("guess-section");
  let guessOptions = document.getElementById("guess-options");
  guessOptions.innerHTML = "";

  cards.forEach((card) => {
    let guessButton = document.createElement("button");
    guessButton.textContent = card.english || "Unknown";
    guessButton.addEventListener("click", () => checkGuess(card, guessButton));
    guessOptions.appendChild(guessButton);
  });

  guessSection.classList.remove("hidden");
}

// Check if the guessed card is correct
function checkGuess(selectedCard, buttonElement) {
  let flashcard = document
    .querySelector(`.card img[src="${selectedCard.image}"]`)
    ?.closest(".card");

  if (missingCard.some((card) => card === selectedCard)) {
    document.getElementById("correct-sound").play(); // Play correct answer sound

    let cardGrid = document.getElementById("card-grid");
    let cardElement = document.createElement("div");
    cardElement.classList.add("card");
    const showEnglish = sessionStorage.getItem("showEnglishText") === "true";

    cardElement.innerHTML = `
  <div class="card-content">
    <img src="${selectedCard.image}" alt="${selectedCard.english}">
    <p class="card-text ${showEnglish ? "" : "hidden"}">${
      selectedCard.english
    }</p>
  </div>
`;

    let blankCard = cardGrid.querySelector(".card[style*='background-image']");
    if (blankCard) {
      blankCard.replaceWith(cardElement);
    }

    missingCard = missingCard.filter((card) => card !== selectedCard);

    // If all missing cards are guessed, disable the buttons to select missing cards
    if (missingCard.length === 0) {
      disableAllGuessButtons();
    } else {
      buttonElement.disabled = true;
      buttonElement.style.backgroundColor = "#d3d3d3";
      buttonElement.style.cursor = "not-allowed";
    }
  } else {
    if (flashcard) {
      document.getElementById("select-sound").play();

      // Apply flash yellow effect to the incorrect flashcard
      flashcard.classList.remove("drop-in"); // Remove first in case it was stuck
      void flashcard.offsetWidth; // Trigger reflow for animation restart
      flashcard.classList.add("wrong-guess"); // Apply animation

      // Remove effect after animation ends
      setTimeout(() => {
        flashcard.classList.remove("wrong-guess");
      }, 500);
    } else {
      console.warn("No flashcard found for incorrect guess.");
    }

    // Gray out the incorrect button after flashing the flashcard
    setTimeout(() => {
      buttonElement.disabled = true;
      buttonElement.style.backgroundColor = "#d3d3d3";
      buttonElement.style.cursor = "not-allowed";
    }, 500);
  }
}

// Disable all guess buttons after finding all missing cards
function disableAllGuessButtons() {
  let buttons = document.querySelectorAll("#guess-options button");
  buttons.forEach((button) => {
    button.disabled = true;
    button.style.cursor = "not-allowed";
  });
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
  let missingCountInput = parseInt(
    document.getElementById("missing-card-count").value
  );

  maxCardsDisplayed = Math.min(Math.max(displayLimitInput, 1), allCards.length);
  numberOfMissingCards = Math.min(
    Math.max(missingCountInput, 1),
    maxCardsDisplayed - 1
  );

  sessionStorage.setItem("numberOfMissingCards", numberOfMissingCards);

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
