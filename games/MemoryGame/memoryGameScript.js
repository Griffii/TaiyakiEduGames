// Image paths for different themes
const themes = {
  christmas: {
    basePath: "card-sets/christmas/",
    fileNames: [
      "matching_01.jpg", "matching_02.jpg", "matching_03.jpg", "matching_04.jpg",
      "matching_05.jpg", "matching_06.jpg", "matching_07.jpg", "matching_08.jpg"
    ],
    backImage: "matching_back_christmas.jpg"
  },
  alphabet: {
    basePath: "card-sets/alphabet/",
    fileNames: Array.from({ length: 26 }, (_, i) => `alphabet_${String(i + 1).padStart(2, '0')}.png`),
    backImage: "alphabet_back.jpg"
  },
  food: {
    basePath: "card-sets/food/",
    fileNames: Array.from({ length: 35 }, (_, i) => `food_${String(i + 1).padStart(2, '0')}.png`),
    backImage: "food_back.jpg"
  },
  shapes: {
    basePath: "card-sets/shapes/",
    fileNames: Array.from({ length: 8 }, (_, i) => `shape_${String(i + 1).padStart(2, '0')}.JPG`),
    backImage: "shape_back.jpg"
  },
  coloredshapes: {
    basePath: "card-sets/colored_shapes/",
    fileNames: Array.from({ length: 56 }, (_, i) => `shape_${String(i + 1).padStart(2, '0')}.jpg`),
    backImage: "shape_back.jpg"
  }
};

// Grid settings
const difficultySettings = {
  easy: { size: 4, pairs: 8 },
  medium: { size: 6, pairs: 18 },
  hard: { size: 8, pairs: 32 }
};

let currentTheme = themes.shapes;
let currentDifficulty = 'easy';

// DOM elements
const gameContainer = document.getElementById("gameContainer");
const restartButton = document.getElementById("restartButton");
const themeSelect = document.getElementById("themeSelect");
const difficultyButtons = document.querySelectorAll(".difficulty");

// Audio Elements
const cardFlipRevealSound = new Audio("../../assets/sounds/place.mp3");
const cardFlipHideSound = new Audio("../../assets/sounds/flip.mp3");
const restartSound = new Audio("../../assets/sounds/cards-shuffle-sfx-01.mp3");

cardFlipRevealSound.preload = "auto";
cardFlipHideSound.preload = "auto";
restartSound.preload = "auto";


// Adjust card size dynamically
function updateCardSize() {
  const gridSize = difficultySettings[currentDifficulty].size;
  const containerWidth = gameContainer.offsetWidth;
  const containerHeight = gameContainer.offsetHeight;

  const cardWidth = containerWidth / gridSize - 10;
  const cardHeight = containerHeight / gridSize - 10;

  document.documentElement.style.setProperty('--card-width', `${cardWidth}px`);
  document.documentElement.style.setProperty('--card-height', `${cardHeight}px`);
}

// Adjust max card size based on difficulty
function updateMaxCardSize() {
  let maxCardSize;
  switch (currentDifficulty) {
    case "easy":
      maxCardSize = { width: "112.5px", height: "150px" }; // Larger cards for easy difficulty
      break;
    case "medium":
      maxCardSize = { width: "90px", height: "120px" }; // Medium-sized cards
      break;
    case "hard":
      maxCardSize = { width: "67.5px", height: "90px" }; // Smaller cards for hard difficulty
      break;
    default:
      maxCardSize = { width: "112.5px", height: "150px" }; // Default fallback
  }

  // Update CSS variables for card size
  document.documentElement.style.setProperty("--max-card-width", maxCardSize.width);
  document.documentElement.style.setProperty("--max-card-height", maxCardSize.height);
}

// Enable or disable difficulty buttons based on available images
function updateDifficultyButtons() {
  const { fileNames } = currentTheme;
  difficultyButtons.forEach(button => {
    const difficulty = button.id.replace("Button", "");
    const { pairs } = difficultySettings[difficulty];

    // Disable the button if not enough images
    button.disabled = fileNames.length < pairs;
    button.classList.toggle("active", difficulty === currentDifficulty && !button.disabled);
  });
}

// Initialize the game
function initGame() {
  const { pairs } = difficultySettings[currentDifficulty];
  const allImages = getRandomImages(pairs);

  // Clear and reset the game container
  gameContainer.innerHTML = "";
  gameContainer.className = `game-container ${currentDifficulty}`;
  shuffleArray(allImages);

  // Loop through images and create cards
  for (let i = 0; i < allImages.length; i++) {
    const card = document.createElement("div");
    card.classList.add("card", "invisible"); // Initially invisible

    const cardInner = document.createElement("div");
    cardInner.classList.add("card-inner");

    const cardFront = document.createElement("div");
    cardFront.classList.add("card-front");
    const backImg = document.createElement("img");
    backImg.src = currentTheme.basePath + currentTheme.backImage;
    backImg.alt = "Backside";
    cardFront.appendChild(backImg);

    const cardBack = document.createElement("div");
    cardBack.classList.add("card-back");
    const img = document.createElement("img");
    img.src = allImages[i];
    img.alt = "Memory Card";
    cardBack.appendChild(img);

    cardInner.appendChild(cardFront);
    cardInner.appendChild(cardBack);
    card.appendChild(cardInner);

    // Add event listener to toggle card on click
    card.addEventListener("click", () => toggleCard(card));

    // Add card to the container
    gameContainer.appendChild(card);

    // Play the shuffle sound
    restartSound.play();

    // Add flip-in animation with staggered delay
    setTimeout(() => {
      card.classList.remove("invisible"); // Make the card visible
      card.classList.add("flipping-in"); // Start flip animation
    }, i * 50); // Stagger each card by 50ms

    // Remove the animation class after the animation completes
    setTimeout(() => {
      card.classList.remove("flipping-in");
    }, 500 + i * 50);
  }

  // Adjust max card size and card size dynamically
  updateMaxCardSize();
  updateCardSize();
}

// Randomly select `count` images
function getRandomImages(count) {
  const { basePath, fileNames } = currentTheme;

  const shuffledImages = [...fileNames];
  shuffleArray(shuffledImages);
  const selectedImages = shuffledImages.slice(0, count);
  return [...selectedImages.map(fileName => basePath + fileName), ...selectedImages.map(fileName => basePath + fileName)];
}

// Toggle card visibility
function toggleCard(card) {
  card.classList.toggle("revealed");

  // Play sounds when toggled
  if (card.classList.contains("revealed")) {
    cardFlipRevealSound.play(); // Play the reveal sound
  } else {
    cardFlipHideSound.play(); // Play the hide sound
  }
}

// Shuffle array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Event listeners
restartButton.addEventListener("click", () => {
  initGame(); // Restart the game
});


themeSelect.addEventListener("change", (e) => {
  currentTheme = themes[e.target.value];
  currentDifficulty = 'easy'; // Set difficulty to easy upon theme change
  updateMaxCardSize();
  updateDifficultyButtons(); // Reset difficulty buttons on theme change
  initGame();
});

difficultyButtons.forEach(button => {
  button.addEventListener("click", () => {
    const difficulty = button.id.replace("Button", "");
    if (!button.disabled) { // Only allow difficulty change if enabled
      currentDifficulty = difficulty;
      updateMaxCardSize(); // Adjust max card size for new difficulty
      updateDifficultyButtons();
      initGame();
    }
  });
});

// Audio listeners
cardFlipRevealSound.addEventListener("ended", () => {
  cardFlipRevealSound.currentTime = 0;
});
cardFlipHideSound.addEventListener("ended", () => {
  cardFlipHideSound.currentTime = 0;
});
restartSound.addEventListener("ended", () => {
  restartSound.currentTime = 0;
});



// Recalculate sizes when window resizes
window.addEventListener("resize", updateCardSize);

// Initialize
updateDifficultyButtons();
initGame();
