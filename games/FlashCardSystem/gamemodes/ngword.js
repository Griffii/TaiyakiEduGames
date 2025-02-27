let allCards = [];
let cards = [];
let displayedCards = [];
let ngCard = null;
let maxCardsDisplayed = 21;
let gamePhase = "select-ng"; // "select-ng" or "guess"

// Load cards from sessionStorage
document.addEventListener("DOMContentLoaded", () => {
  const storedCards = sessionStorage.getItem("selectedCards");
  if (storedCards) {
    allCards = JSON.parse(storedCards);
    cards =
      allCards.length > maxCardsDisplayed
        ? getRandomSubset(allCards, maxCardsDisplayed)
        : allCards;
    displayCards();
  } else {
    console.error("No cards found. Redirecting back to deck view.");
    window.location.href = "deckview.html";
  }
});

// Display cards on the grid
function displayCards() {
  let cardGrid = document.getElementById("card-grid");
  cardGrid.innerHTML = "";

  displayedCards = [...cards];

  // Check if English text should be displayed (stored in sessionStorage)
  let showEnglish = sessionStorage.getItem("showEnglishText") === "true";

  displayedCards.forEach((card, index) => {
      let cardElement = document.createElement("div");
      cardElement.classList.add("card");
      cardElement.dataset.index = index;

      // Display card with optional English text
      cardElement.innerHTML = `
          <div class="card-content">
              <img src="${card.image}" alt="${card.english}">
              ${showEnglish ? `<p class="card-text">${card.english}</p>` : ""}
          </div>
      `;

      // Card click behavior based on the phase
      cardElement.addEventListener("click", () => {
          if (gamePhase === "select-ng") {
              ngCard = card;
              gamePhase = "guess";

              // Visual feedback: Flash red when NG card is selected
              cardElement.classList.add("ng-flash");

              // Remove flash class after animation ends
              setTimeout(() => {
                  cardElement.classList.remove("ng-flash");
              }, 500);
          } else if (gamePhase === "guess") {
              handleCardSelection(cardElement, card);
          }
      });

      cardGrid.appendChild(cardElement);
  });
}



// Handle card selection after NG word has been set
function handleCardSelection(cardElement, selectedCard) {
  if (selectedCard === ngCard) {
    revealCard(cardElement, "images/bomb.png", "bomb-sound");
  } else {
    revealCard(cardElement, "images/safe.png", "correct-sound");
  }
}

// Reveal card with the respective image and sound
function revealCard(cardElement, imagePath, soundId) {
    let sound = document.getElementById(soundId);
    if (soundId === "correct-sound") { 
      sound.volume = 0.5;
  }
    sound.play();

    cardElement.classList.add("revealed");
    cardElement.innerHTML = `<img src="${imagePath}" alt="Revealed">`;

    // If the revealed image is the safe card, clear it after 1 second
    if (imagePath.includes("safe.png")) {
        setTimeout(() => {
            cardElement.innerHTML = ""; // Clear the image
            cardElement.classList.remove("revealed"); // Reset visual state
        }, 1000);
    }

    // If the bomb card is selected, clear all cards after 1 second
    if (imagePath.includes("bomb.png")) {
        setTimeout(() => {
            clearAllCards();
        }, 2000);
    }
}

// Clears the image from every card
function clearAllCards() {
    let cardElements = document.querySelectorAll(".card");
    cardElements.forEach(card => {
        card.innerHTML = ""; // Clear the image
        card.classList.remove("revealed"); // Reset visual state
    });
}


// Utility Functions
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

// Settings Menu Functions
function openSettingsMenu() {
  document.getElementById("settings-menu").classList.remove("hidden");

  // Update English Toggle Button State
  let button = document.getElementById("toggle-english-btn");
  let showEnglish = sessionStorage.getItem("showEnglishText") === "true";
  button.textContent = `English: ${showEnglish ? "ON" : "OFF"}`;
  button.classList.toggle("off", !showEnglish);
}



function closeSettingsMenu() {
  document.getElementById("settings-menu").classList.add("hidden");
}

function applySettings() {
  let displayLimitInput = parseInt(document.getElementById("display-card-limit").value);
  let showEnglishText = document.getElementById("toggle-english").checked;

  maxCardsDisplayed = Math.min(Math.max(displayLimitInput, 1), allCards.length);

  sessionStorage.setItem("showEnglishText", showEnglishText); // Store setting

  cards = allCards.length > maxCardsDisplayed ? getRandomSubset(allCards, maxCardsDisplayed) : allCards;
  displayCards();
  closeSettingsMenu();
}


function reselectCards() {
  if (allCards.length > 0) {
    cards =
      allCards.length > maxCardsDisplayed
        ? getRandomSubset(allCards, maxCardsDisplayed)
        : allCards;
    displayCards();
    closeSettingsMenu();
  }
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


