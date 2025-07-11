document.addEventListener("DOMContentLoaded", () => {
  // Default values
  const defaults = {
    toggleShark: true,
    toggleTornado: true,
    doublePoints: false,
  };

  // Load from sessionStorage or fall back to default
  const toggleShark =
    sessionStorage.getItem("toggleShark") ?? String(defaults.toggleShark);
  const toggleTornado =
    sessionStorage.getItem("toggleTornado") ?? String(defaults.toggleTornado);
  const doublePoints =
    sessionStorage.getItem("doublePoints") ?? String(defaults.doublePoints);

  // Update sessionStorage if nothing was set before
  if (sessionStorage.getItem("toggleShark") === null)
    sessionStorage.setItem("toggleShark", toggleShark);
  if (sessionStorage.getItem("toggleTornado") === null)
    sessionStorage.setItem("toggleTornado", toggleTornado);
  if (sessionStorage.getItem("doublePoints") === null)
    sessionStorage.setItem("doublePoints", doublePoints);

  // Set checkbox states
  document.getElementById("toggle-shark").checked = toggleShark === "true";
  document.getElementById("toggle-tornado").checked = toggleTornado === "true";
  document.getElementById("double-points").checked = doublePoints === "true";
});

function toggleSettingsMenu() {
  const menu = document.getElementById("settings-menu");
  menu.classList.toggle("hidden");

  if (!menu.classList.contains("hidden")) {
    // Only update when opening the menu
    const savedLimit = sessionStorage.getItem("cardLimit");
    const defaultLimit = 21;
    const input = document.getElementById("display-card-limit");
    input.value = savedLimit !== null ? savedLimit : defaultLimit;
  }
}

// Toggle English text on and off
function toggleEnglishText() {
  const current = sessionStorage.getItem("showEnglishText") === "true";
  const newState = !current;
  sessionStorage.setItem("showEnglishText", newState);

  updateEnglishToggleButton();

  // Update visibility of English text on all cards
  document.querySelectorAll(".card-text").forEach((el) => {
    el.style.display = newState ? "block" : "none";
  });
}

// Update the English toggle button text and color
function updateEnglishToggleButton() {
  let button = document.getElementById("toggle-english-btn");
  let showEnglish = sessionStorage.getItem("showEnglishText") === "true";

  button.textContent = `English: ${showEnglish ? "ON" : "OFF"}`;
  button.classList.toggle("off", !showEnglish);
}

function restart() {
  location.reload();
}

function applySettings() {
  const sharkEnabled = document.getElementById("toggle-shark").checked;
  const tornadoEnabled = document.getElementById("toggle-tornado").checked;
  const doublePointsEnabled = document.getElementById("double-points").checked;
  const cardLimit =
    parseInt(document.getElementById("display-card-limit").value) || 21;

  // Save to sessionStorage
  sessionStorage.setItem("cardLimit", cardLimit);
  sessionStorage.setItem("toggleShark", sharkEnabled);
  sessionStorage.setItem("toggleTornado", tornadoEnabled);
  sessionStorage.setItem("doublePoints", doublePointsEnabled);

  // Apply other settings here as needed
  toggleSettingsMenu();
  restart();
}

function getSettings() {
  return {
    cardLimit: parseInt(sessionStorage.getItem("cardLimit")) || 21,
    includeTornado: sessionStorage.getItem("toggleTornado") === "true",
    includeShark: sessionStorage.getItem("toggleShark") === "true",
    doublePoints: sessionStorage.getItem("doublePoints") === "true",
  };
}

function getRandomPoints() {
  const base = 10 * (Math.floor(Math.random() * 10) + 1); // 10–100
  return base;
}

function renderGame() {
  const grid = document.getElementById("card-grid");
  grid.innerHTML = "";

  const { cardLimit, includeTornado, includeShark, doublePoints } =
    getSettings();
  const selectedCards =
    JSON.parse(sessionStorage.getItem("selectedCards")) || [];

  if (selectedCards.length === 0) {
    alert("No cards selected. Please return to deck selection.");
    window.location.href = "deckview.html";
    return;
  }

  const displayCards = shuffle([...selectedCards]).slice(0, cardLimit);

  // Step 1: Create cards with vocab + point effect
  let cards = displayCards.map((vocab) => {
    return {
      vocab: vocab,
      effect: "points",
      value: doublePoints ? getRandomPoints() * 2 : getRandomPoints(),
    };
  });

  // Step 2: Insert alternating special effects
  const specialCount = Math.floor(cardLimit / 5);
  let effectIndex = 0;

  for (let i = 0; i < specialCount && i < cards.length; i++) {
    let effect = null;
    if (includeShark && includeTornado) {
      effect = i % 2 === 0 ? "shark" : "tornado";
    } else if (includeShark) {
      effect = "shark";
    } else if (includeTornado) {
      effect = "tornado";
    }

    if (effect) {
      cards[effectIndex].effect = effect;
      cards[effectIndex].value = 0;
      effectIndex++;
    }
  }

  shuffle(cards); // Shuffle again so effects are randomized

  // Step 3: Display each card
  cards.forEach((card) => {
    const div = document.createElement("div");
    div.classList.add("card");

    const showEnglish = sessionStorage.getItem("showEnglishText") === "true";
    const englishText = card.vocab.english || "";
    const textDisplay = showEnglish && englishText ? "block" : "none";

    div.innerHTML = `
    <div class="card-inner">
      <div class="card-front">
        <img src="${card.vocab.image}" alt="Card Image" />
        <div class="card-text" style="display: ${textDisplay};">
          ${englishText}
        </div>
      </div>
      <div class="card-back">
        <div class="card-result"></div>
      </div>
    </div>
  `;

    div.onclick = () => handleCardClick(div, card);
    document.getElementById("card-grid").appendChild(div);
  });
}

function handleCardClick(cardDiv, cardData) {
  if (cardDiv.classList.contains("revealed")) return;
  cardDiv.classList.add("revealed");

  const inner = cardDiv.querySelector(".card-inner");
  inner.classList.add("flipped");

  const result = cardDiv.querySelector(".card-result");

  if (cardData.effect === "tornado") {
    document.getElementById("tornado-sound").play();
    result.textContent = "🌪️";
    send_tornado();
  } else if (cardData.effect === "shark") {
    document.getElementById("shark-sound").play();
    result.textContent = "🦈";
    swimSharkOnce();
  } else {
    document.getElementById("select-sound").play();
    result.textContent = `+${cardData.value}`;
  }
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

window.onload = () => {
  // Default to false if no setting exists
  if (sessionStorage.getItem("showEnglishText") === null) {
    sessionStorage.setItem("showEnglishText", "false");
  }

  updateEnglishToggleButton();
  renderGame();
};

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
