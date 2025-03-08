let allCards = [];
let selectedCards = [];
let gameCards = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let pairsToMatch = 10; // Default number of pairs


// Load cards from sessionStorage and prepare the game
document.addEventListener("DOMContentLoaded", () => {
  const storedCards = sessionStorage.getItem("selectedCards");
  if (storedCards) {
    allCards = JSON.parse(storedCards);
    setupGame();
  } else {
    console.error("No cards found. Redirecting back to deck view.");
    window.location.href = "deckview.html";
  }
});

// Prepare the game board with duplicated, shuffled cards
function setupGame() {
  selectedCards =
    allCards.length > pairsToMatch
      ? getRandomSubset(allCards, pairsToMatch)
      : allCards;

  // Duplicate and shuffle cards
  gameCards = shuffleArray([...selectedCards, ...selectedCards]);

  displayCards();
}

// Display cards on the board
function displayCards() {
  let board = document.getElementById("game-board");
  board.innerHTML = "";

  // Retrieve English text visibility state
  showEnglishText = sessionStorage.getItem("showEnglishText") === "true";

  // Calculate the grid dimensions to be as square as possible with even rows
  let totalCards = gameCards.length;
  let columns = Math.ceil(Math.sqrt(totalCards));
  let rows = Math.ceil(totalCards / columns);

  // Prioritize even rows if possible
  if (rows % 2 !== 0 && (rows - 1) * columns >= totalCards) {
    rows -= 1;
  }

  // Set grid dynamically based on calculated rows and columns
  board.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

  gameCards.forEach((card, index) => {
    let cardElement = document.createElement("div");
    cardElement.classList.add("card");
    cardElement.dataset.index = index;

    // Ensure English text visibility is controlled by sessionStorage setting
    cardElement.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <img src="${card.image}" alt="${card.english}">
                    <p class="card-text ${showEnglishText ? "" : "hidden"}">${
      card.english
    }</p>
                </div>
                <div class="card-back"></div>
            </div>
        `;

    cardElement.addEventListener("click", () => flipCard(cardElement, card));

    board.appendChild(cardElement);
  });
}

// Handle card flipping logic
function flipCard(cardElement, card) {
  if (
    lockBoard ||
    cardElement.classList.contains("flipped") ||
    cardElement.classList.contains("matched")
  )
    return;

  cardElement.classList.add("flipped");

  if (!firstCard) {
    firstCard = { element: cardElement, card };
    return;
  }

  secondCard = { element: cardElement, card };
  checkForMatch();
}

// Check if two flipped cards match
function checkForMatch() {
  lockBoard = true;

  if (firstCard.card.image === secondCard.card.image) {
    document.getElementById("match-sound").play();
    markAsMatched();
    resetSelection();
  } else {
    document.getElementById("wrong-sound").play();
    markAsWrong();
    setTimeout(() => {
      firstCard.element.classList.remove("flipped", "wrong");
      secondCard.element.classList.remove("flipped", "wrong");
      resetSelection();
    }, 1000);
  }
}

// Mark matched cards visually
function markAsMatched() {
  firstCard.element.classList.add("matched");
  secondCard.element.classList.add("matched");
}

// Visual feedback for wrong match
function markAsWrong() {
  firstCard.element.classList.add("wrong");
  secondCard.element.classList.add("wrong");
}

// Reset selection after checking for a match
function resetSelection() {
  document.getElementById("flip-sound").play();
  [firstCard, secondCard] = [null, null];
  lockBoard = false;
}

// Utility functions
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getRandomSubset(array, limit) {
  let shuffled = shuffleArray([...array]);
  return shuffled.slice(0, limit);
}

// Settings menu functions
function toggleSettingsMenu() {
  if (document.getElementById("settings-menu").classList.contains("hidden")) {
    document.getElementById("settings-menu").classList.remove("hidden");

    // Update English Toggle Button State
    let button = document.getElementById("toggle-english-btn");
    let showEnglish = sessionStorage.getItem("showEnglishText") === "true";
    button.textContent = `English: ${showEnglish ? "ON" : "OFF"}`;
    button.classList.toggle("off", !showEnglish);
  } else {
    document.getElementById("settings-menu").classList.add("hidden");
  }
}

function applySettings() {
  let pairCountInput = parseInt(document.getElementById("pair-count").value);

  // Dynamically allow up to half the total available cards for pairs
  let maxPairs = Math.floor(allCards.length / 2);
  pairsToMatch = Math.min(Math.max(pairCountInput, 2), maxPairs);

  setupGame(); // Restart game with updated pairs
  toggleSettingsMenu();
}

function reselectCards() {
  selectedCards = getRandomSubset(allCards, pairsToMatch);
  setupGame();
  toggleSettingsMenu();
}

function toggleEnglishText() {
  let button = document.getElementById("toggle-english-btn");
  let currentState = sessionStorage.getItem("showEnglishText") === "true";

  // Toggle state
  let newState = !currentState;
  sessionStorage.setItem("showEnglishText", newState);

  // Update button appearance
  button.textContent = `English: ${newState ? "ON" : "OFF"}`;
  button.classList.toggle("off", !newState);

  // Immediately refresh the cards to reflect the new setting
  displayCards();
}
