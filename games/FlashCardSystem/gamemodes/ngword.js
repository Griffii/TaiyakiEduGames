function updateGameTitle() {
  const title = document.getElementById("game-title");
  const bombMode = sessionStorage.getItem("bombMode") === "true";

  title.textContent = bombMode ? "Where's the Bomb?!" : "Find Taiyaki-Sensei!";
}


function toggleSettingsMenu() {
  document.getElementById("settings-menu").classList.toggle("hidden");
}

function toggleEnglishText() {
  let showEnglish = sessionStorage.getItem("showEnglishText") === "true";
  let newState = !showEnglish;

  // Save new state
  sessionStorage.setItem("showEnglishText", newState);

  // Update button appearance
  updateEnglishToggleButton();

  // Toggle visibility on current cards
  document.querySelectorAll(".card-text").forEach((text) => {
    text.style.display = newState ? "block" : "none";
  });
}
function updateEnglishToggleButton() {
  let button = document.getElementById("toggle-english-btn");
  let showEnglish = sessionStorage.getItem("showEnglishText") === "true";

  button.textContent = `English: ${showEnglish ? "ON" : "OFF"}`;
  button.classList.toggle("off", !showEnglish);
}

function toggleBombMode() {
  let bombOn = sessionStorage.getItem("bombMode") === "true";
  let newState = !bombOn;
  sessionStorage.setItem("bombMode", newState);
  updateBombModeButton();
  updateGameTitle();
  renderGame();
}
function updateBombModeButton() {
  const btn = document.getElementById("bomb-mode-btn");
  const bombOn = sessionStorage.getItem("bombMode") === "true";

  btn.textContent = `Bomb Mode: ${bombOn ? "ON" : "OFF"}`;
  btn.classList.toggle("off", !bombOn);
}


function getSettings() {
  return {
    limit: parseInt(document.getElementById("display-card-limit").value) || 21,
    bombMode: sessionStorage.getItem("bombMode") === "true",
    showEnglish: sessionStorage.getItem("showEnglishText") === "true"
  };
}
function applySettings() {
  const bombMode = document.getElementById("bomb-mode-toggle")?.checked || false;
  sessionStorage.setItem("bombMode", bombMode);

  toggleSettingsMenu();
  updateGameTitle(); // <- Add here
  renderGame();
}


function restart() {
  // Force reload page to get a new selection of cards
  location.reload();
}

function updateCardText() {
  const showEnglish = sessionStorage.getItem("showEnglishText") === "true";
  document.querySelectorAll(".card-text").forEach((el) => {
    el.style.display = showEnglish ? "block" : "none";
  });
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function renderGame() {
  const grid = document.getElementById("card-grid");
  grid.innerHTML = "";

  const settings = getSettings();
  const selectedCards =
    JSON.parse(sessionStorage.getItem("selectedCards")) || [];

  if (selectedCards.length === 0) {
    alert("No cards selected. Please go back and choose a deck.");
    return;
  }

  const cardCount = Math.min(settings.limit, selectedCards.length);
  const cards = shuffle([...selectedCards]).slice(0, cardCount);
  const bombIndex = Math.floor(Math.random() * cardCount);

  cards.forEach((cardData, index) => {
    const isBomb = index === bombIndex;

    const card = document.createElement("div");
    card.className = "card";
    card.dataset.isBomb = isBomb;

    card.innerHTML = `
  <div class="card-inner">
    <div class="card-front">
      <img src="${cardData.image}" alt="Vocab Image" />
      <div class="card-text" style="display: ${
        sessionStorage.getItem("showEnglishText") === "true" && cardData.english
          ? "block"
          : "none"
      };">
        ${cardData.english || ""}
      </div>
    </div>
    <div class="card-back">
      <div class="card-result"></div>
    </div>
  </div>
`;

    card.onclick = () => handleCardClick(card, settings);
    grid.appendChild(card);
  });
}

function handleCardClick(card, settings) {
  if (card.classList.contains("revealed")) return;

  card.classList.add("revealed");

  const isBomb = card.dataset.isBomb === "true";
  const back = card.querySelector(".card-back");

  if (isBomb) {
    if (settings.bombMode) {
      back.innerHTML = `<img src="images/bomb.png" alt="Bomb" style="width: 60%;" />`;
      document.getElementById("bomb-sound")?.play();
      setTimeout(() => revealAllCards(card), 2000);
    } else {
      back.innerHTML = `<img src="images/taiyaki.png" alt="Taiyaki" style="width: 60%;" />`;
      document.getElementById("taiyaki-sound")?.play();
      card.classList.add("taiyaki-hit");
      setTimeout(() => card.classList.remove("taiyaki-hit"), 1000);
    }
  } else {
    if (settings.bombMode) {
      back.innerHTML = `<img src="images/safe.png" alt="" style="width: 50%;" />`;
    } else {
      back.innerHTML = `<img src="images/x.png" alt="" style="width: 50%;" />`;
    }
    document.getElementById("select-sound")?.play();
  }
}

function revealAllCards(exceptCard) {
  const allCards = document.querySelectorAll(".card");

  allCards.forEach((c) => {
    if (c === exceptCard) return;

    c.classList.add("revealed");
    const back = c.querySelector(".card-back");
  });
}

window.onload = () => {
  if (sessionStorage.getItem("showEnglishText") === null) {
    sessionStorage.setItem("showEnglishText", "false");
  }

  if (sessionStorage.getItem("bombMode") === null) {
    sessionStorage.setItem("bombMode", "false");
  }

  const bombToggle = document.getElementById("bomb-mode-toggle");
  if (bombToggle) {
    bombToggle.checked = sessionStorage.getItem("bombMode") === "true";
  }

  updateEnglishToggleButton();
  updateBombModeButton();
  updateGameTitle();
  renderGame();
};


