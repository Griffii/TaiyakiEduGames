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
  let sound = document.getElementById('correct-sound');
  sound.play()

  score++;
  document.getElementById("live-score").textContent = score; // Update live score
  cards.splice(currentIndex, 1);
  displayCard();
}

// "Pass" Button - Shuffle the card back in
function passCard() {
  let sound = document.getElementById('pass-sound');
  sound.play()

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
  let sound = document.getElementById('timeup-sound');
  sound.play()

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

function closeSettingsMenu() {
  document.getElementById("settings-menu").classList.add("hidden");
}

function toggleImage() {
  let imageContainer = document.querySelector(".image-container");
  let button = document.getElementById("toggle-image-btn");

  if (imageContainer) {
    let isHidden = imageContainer.style.display === "none";
    imageContainer.style.display = isHidden ? "flex" : "none";

    button.textContent = isHidden ? "Hide Image" : "Show Image";
  }
}

function toggleJapanese() {
  let japaneseContainer = document.querySelector(".japanese-container");
  let button = document.getElementById("toggle-japanese-btn");

  if (japaneseContainer) {
    let isHidden = japaneseContainer.style.display === "none";
    japaneseContainer.style.display = isHidden ? "flex" : "none";

    button.textContent = isHidden ? "Hide Japanese" : "Show Japanese";
  }
}

function toggleEnglish() {
  let englishContainer = document.querySelector(".english-container");
  let button = document.getElementById("toggle-english-btn");

  if (englishContainer) {
    let isHidden = englishContainer.style.display === "none";
    englishContainer.style.display = isHidden ? "flex" : "none";

    button.textContent = isHidden ? "Hide English" : "Show English";
  }
}

function toggleScore() {
  let scoreContainer = document.querySelector(".score-display");
  let button = document.getElementById("toggle-score-btn");

  if (scoreContainer) {
    let isHidden = scoreContainer.style.display === "none";
    scoreContainer.style.display = isHidden ? "flex" : "none";

    button.textContent = isHidden ? "Hide Score" : "Show Score";
  }
}
