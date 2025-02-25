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
        cards = allCards.length > maxCardsDisplayed ? getRandomSubset(allCards, maxCardsDisplayed) : allCards;

        displayCards();
    } else {
        alert("No cards found. Redirecting back to deck view.");
        window.location.href = "deckview.html";
    }
});

// Display the initial grid of cards
function displayCards() {
    let cardGrid = document.getElementById("card-grid");
    cardGrid.innerHTML = "";

    displayedCards = [...cards]; // Reset displayed cards from the current selection

    displayedCards.forEach(card => {
        let cardElement = document.createElement("div");
        cardElement.classList.add("card");
        cardElement.innerHTML = `<img src="${card.image}" alt="${card.english}">`;
        cardGrid.appendChild(cardElement);
    });
}

// Shuffle displayed cards and remove the selected number of cards
function shuffleAndRemove() {
    displayedCards = shuffleArray([...cards]);

    // Randomly remove the specified number of cards
    let removedCards = [];
    for (let i = 0; i < numberOfMissingCards; i++) {
        let removedCard = displayedCards.splice(Math.floor(Math.random() * displayedCards.length), 1)[0];
        removedCards.push(removedCard);
    }

    missingCard = removedCards;

    // Display the shuffled cards with blanks for missing cards
    let cardGrid = document.getElementById("card-grid");
    cardGrid.innerHTML = "";

    displayedCards.forEach(card => {
        let cardElement = document.createElement("div");
        cardElement.classList.add("card");
        cardElement.innerHTML = `<img src="${card.image}" alt="${card.english}">`;
        cardGrid.appendChild(cardElement);
    });

    // Add blank cards for each missing card
    for (let i = 0; i < numberOfMissingCards; i++) {
        let blankCard = document.createElement("div");
        blankCard.classList.add("card");
        blankCard.style.backgroundColor = "#d3d3d3";
        cardGrid.appendChild(blankCard);
    }

    // Show guessing section
    displayGuessOptions();
}

// Show guessing options based on all cards
function displayGuessOptions() {
    let guessSection = document.getElementById("guess-section");
    let guessOptions = document.getElementById("guess-options");
    guessOptions.innerHTML = "";

    cards.forEach(card => {
        let guessButton = document.createElement("button");
        guessButton.textContent = card.english || "Unknown";
        guessButton.addEventListener("click", () => checkGuess(card, guessButton));
        guessOptions.appendChild(guessButton);
    });

    guessSection.classList.remove("hidden");
}

// Check if the guessed card is correct
function checkGuess(selectedCard, buttonElement) {
    if (missingCard.some(card => card === selectedCard)) {
        document.getElementById("correct-sound").play(); // Play correct answer sound

        alert("Correct! You found a missing card!");

        let cardGrid = document.getElementById("card-grid");
        let cardElement = document.createElement("div");
        cardElement.classList.add("card");
        cardElement.innerHTML = `<img src="${selectedCard.image}" alt="${selectedCard.english}">`;

        let blankCard = cardGrid.querySelector(".card[style*='background-color']");
        if (blankCard) {
            blankCard.replaceWith(cardElement);
        }

        missingCard = missingCard.filter(card => card !== selectedCard);

        if (missingCard.length === 0) {
            disableAllGuessButtons();
        }
    } else {
        buttonElement.disabled = true;
        buttonElement.style.backgroundColor = "#d3d3d3";
        buttonElement.style.cursor = "not-allowed";
    }
}

// Disable all guess buttons after finding all missing cards
function disableAllGuessButtons() {
    let buttons = document.querySelectorAll("#guess-options button");
    buttons.forEach(button => {
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
function openSettingsMenu() {
    document.getElementById("settings-menu").classList.remove("hidden");
}

function closeSettingsMenu() {
    document.getElementById("settings-menu").classList.add("hidden");
}

// Apply settings for missing cards and number of displayed cards
function applySettings() {
    let missingInput = parseInt(document.getElementById("missing-count").value);
    let displayLimitInput = parseInt(document.getElementById("display-card-limit").value);

    numberOfMissingCards = Math.min(Math.max(missingInput, 1), cards.length - 1);
    maxCardsDisplayed = Math.min(Math.max(displayLimitInput, 1), allCards.length);

    cards = allCards.length > maxCardsDisplayed ? getRandomSubset(allCards, maxCardsDisplayed) : allCards;

    displayCards();
    closeSettingsMenu();
}

// Reselect cards from the full pool without refreshing
function reselectCards() {
    if (allCards.length > 0) {
        cards = allCards.length > maxCardsDisplayed ? getRandomSubset(allCards, maxCardsDisplayed) : allCards;

        displayCards();
        closeSettingsMenu();
    }
}
