let englishOn = true;

function toggleSettingsMenu() {
  document.getElementById("settings-menu").classList.toggle("hidden");
}

function toggleEnglishText() {
  englishOn = !englishOn;
  const btn = document.getElementById("toggle-english-btn");
  btn.classList.toggle("off");
  btn.textContent = `English: ${englishOn ? "ON" : "OFF"}`;
  updateCardText();
}

function applySettings() {
  const limit = parseInt(document.getElementById("display-card-limit").value);
  sessionStorage.setItem("cardLimit", limit);
  sessionStorage.setItem("includeTornado", document.getElementById("toggle-tornado").checked);
  sessionStorage.setItem("includeShark", document.getElementById("toggle-shark").checked);
  sessionStorage.setItem("doublePoints", document.getElementById("double-points").checked);
  toggleSettingsMenu();
  renderGame();
}

function reselectCards() {
  sessionStorage.removeItem("selectedCards");
  location.reload();
}

function getSettings() {
  return {
    cardLimit: parseInt(sessionStorage.getItem("cardLimit")) || 21,
    includeTornado: sessionStorage.getItem("includeTornado") === "true",
    includeShark: sessionStorage.getItem("includeShark") === "true",
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

  const { cardLimit, includeTornado, includeShark, doublePoints } = getSettings();
  const selectedCards = JSON.parse(sessionStorage.getItem("selectedCards")) || [];

  if (selectedCards.length === 0) {
    alert("No cards selected. Please return to deck selection.");
    window.location.href = "deckview.html";
    return;
  }

  const displayCards = shuffle([...selectedCards]).slice(0, cardLimit);

  // Step 1: Create cards with vocab + point effect
  let cards = displayCards.map(vocab => {
    return {
      vocab: vocab,
      effect: "points",
      value: doublePoints ? getRandomPoints() * 2 : getRandomPoints(),
    };
  });

  // Step 2: Inject tornado and shark effects randomly
  const effectCount = Math.floor(cardLimit / 8);
  if (includeTornado) {
    for (let i = 0; i < effectCount && i < cards.length; i++) {
      cards[i].effect = "tornado";
      cards[i].value = 0;
    }
  }
  if (includeShark) {
    for (let i = effectCount; i < effectCount * 2 && i < cards.length; i++) {
      cards[i].effect = "shark";
      cards[i].value = 0;
    }
  }

  shuffle(cards); // Shuffle again so effects are randomized

  // Step 3: Display each card
  cards.forEach(card => {
    const div = document.createElement("div");
    div.classList.add("card");

    div.innerHTML = `
      <div class="card-front">
        <img src="${card.vocab.image}" alt="Vocab Image" />
        <div class="card-text" style="display: ${englishOn && card.vocab.english ? "block" : "none"};">
          ${card.vocab.english || ""}
        </div>
      </div>
      <div class="card-result" style="display: none;"></div>
    `;

    div.onclick = () => handleCardClick(div, card);
    document.getElementById("card-grid").appendChild(div);
  });
}

function handleCardClick(cardDiv, cardData) {
  if (cardDiv.classList.contains("revealed")) return;
  cardDiv.classList.add("revealed");

  const front = cardDiv.querySelector(".card-front");
  const result = cardDiv.querySelector(".card-result");

  front.style.display = "none";       // Hide vocab image and text
  result.style.display = "flex";      // Show result

  if (cardData.effect === "tornado") {
    document.getElementById("tornado-sound").play();
    result.textContent = "🌪️";
  } else if (cardData.effect === "shark") {
    document.getElementById("shark-sound").play();
    result.textContent = "🦈";
  } else {
    document.getElementById("select-sound").play();
    result.textContent = `+${cardData.value}`;
  }
}

function updateCardText() {
  document.querySelectorAll(".card-text").forEach(el => {
    el.style.display = englishOn ? "block" : "none";
  });
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

window.onload = renderGame;
