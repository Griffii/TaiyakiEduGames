let cards = [];
let currentIndex = 0;
let score = 0;
let timer;
let timeLeft = 60;

// Load selected cards from sessionStorage
document.addEventListener("DOMContentLoaded", () => {
  let storedCards = sessionStorage.getItem("selectedCards");
  if (storedCards) {
    cards = shuffleArray(JSON.parse(storedCards));
    displayCard();
    startGame(); // Start timer automatically
  } else {
    alert("No cards selected. Returning to deck view.");
    window.location.href = "deckview.html";
  }

  applyStoredSettings()
});

// Display the current card
function displayCard() {
  if (cards.length === 0) {
    endGame();
    return;
  }

  let card = cards[currentIndex];
  document.getElementById("card-image").src = card.image;
  document.getElementById("english-text").textContent = card.english;
  document.getElementById("kanji").textContent = card.japanese.kanji;
  document.getElementById("furigana").textContent = card.japanese.furigana;

  // Apply stored settings
  document.querySelector(".image-container").style.display =
    document.getElementById("toggle-image-btn").textContent === "Hide Image"
      ? "flex"
      : "none";
  document.querySelector(".japanese-container").style.display =
    document.getElementById("toggle-japanese-btn").textContent ===
    "Hide Japanese"
      ? "flex"
      : "none";
  document.querySelector(".english-container").style.display =
    document.getElementById("toggle-english-btn").textContent === "Hide English"
      ? "flex"
      : "none";
}

// "Get" Button - Remove card & Increase Score
function getCard() {
  let sound = document.getElementById("correct-sound");
  sound.play();

  score++;
  document.getElementById("live-score").textContent = score; // Update live score
  cards.splice(currentIndex, 1);
  displayCard();
}

// "Pass" Button - Shuffle the card back in
function passCard() {
  let sound = document.getElementById("pass-sound");
  sound.play();

  cards.push(cards.splice(currentIndex, 1)[0]);
  displayCard();
}

// Start Game with Timer (Auto-Start Fix)
function startGame() {
  document.getElementById("settings-menu").classList.add("hidden");
  document.getElementById("score-screen").classList.add("hidden"); // Hide score screen when restarting
  document.getElementById("score-screen").classList.remove("show"); // Remove animation class

  score = 0;
  timeLeft = 60;
  document.getElementById("timer").textContent = timeLeft;
  document.getElementById("live-score").textContent = score;

  // Ensure any existing timer is cleared
  clearInterval(timer);

  timer = setInterval(() => {
    if (timeLeft > 0) {
      timeLeft--;
      document.getElementById("timer").textContent = timeLeft;
    }

    if (timeLeft <= 0) {
      clearInterval(timer);
      console.log("Time expired, calling endGame()"); // Debugging
      endGame(); // Ensure endGame() is called when time runs out
    }
  }, 1000);
}

// End Game and Show Score
function endGame() {
  toggleSettingsMenu();

  let sound = document.getElementById("timeup-sound");
  sound.play();

  clearInterval(timer); // Stop the timer
  document.getElementById("final-score").textContent = score; // Display final score
  document.getElementById("score-screen").classList.remove("hidden"); // Show score screen
  document.getElementById("score-screen").classList.add("show"); // Ensure animation applies
}

// Restart Game
function restartGame() {
  window.location.reload();
}

// Shuffle Function
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function toggleSettingsMenu() {
  document.getElementById("settings-menu").classList.toggle("hidden");
}

function toggleImage() {
  const container = document.querySelector(".image-container");
  const button = document.getElementById("toggle-image-btn");

  if (container && button) {
    const isHidden = container.style.display === "none";
    container.style.display = isHidden ? "flex" : "none";
    const newState = isHidden ? "Hide Image" : "Show Image";
    button.textContent = newState;
    sessionStorage.setItem("headsup_image", newState);
  }
}

function toggleJapanese() {
  const container = document.querySelector(".japanese-container");
  const button = document.getElementById("toggle-japanese-btn");

  if (container && button) {
    const isHidden = container.style.display === "none";
    container.style.display = isHidden ? "flex" : "none";
    const newState = isHidden ? "Hide Japanese" : "Show Japanese";
    button.textContent = newState;
    sessionStorage.setItem("headsup_japanese", newState);
  }
}

function toggleEnglish() {
  const container = document.querySelector(".english-container");
  const button = document.getElementById("toggle-english-btn");

  if (container && button) {
    const isHidden = container.style.display === "none";
    container.style.display = isHidden ? "flex" : "none";
    const newState = isHidden ? "Hide English" : "Show English";
    button.textContent = newState;
    sessionStorage.setItem("headsup_english", newState);
  }
}

function toggleScore() {
  const container = document.querySelector(".score-display");
  const button = document.getElementById("toggle-score-btn");

  if (container && button) {
    const isHidden = container.style.display === "none";
    container.style.display = isHidden ? "flex" : "none";
    const newState = isHidden ? "Hide Score" : "Show Score";
    button.textContent = newState;
    sessionStorage.setItem("headsup_score", newState);
  }
}


function applyStoredSettings() {
  const settings = [
    { key: "headsup_image", container: ".image-container", button: "toggle-image-btn", defaultText: "Hide Image" },
    { key: "headsup_japanese", container: ".japanese-container", button: "toggle-japanese-btn", defaultText: "Hide Japanese" },
    { key: "headsup_english", container: ".english-container", button: "toggle-english-btn", defaultText: "Hide English" },
    { key: "headsup_score", container: ".score-display", button: "toggle-score-btn", defaultText: "Hide Score" },
  ];

  settings.forEach(({ key, container, button, defaultText }) => {
    const value = sessionStorage.getItem(key) || defaultText;
    const containerEl = document.querySelector(container);
    const buttonEl = document.getElementById(button);

    if (containerEl && buttonEl) {
      buttonEl.textContent = value;
      containerEl.style.display = value.startsWith("Hide") ? "flex" : "none";
    }
  });
}
