// JSON file paths
const gradesPath = 'fortunes/grades.json';
const lovePath = 'fortunes/love.json';
const moneyPath = 'fortunes/money.json';

// Load JSON data
async function loadJSON(path) {
  const response = await fetch(path);
  return response.json();
}

// Randomly select a fortune from a JSON array
function getRandomFortune(fortunes) {
  const randomIndex = Math.floor(Math.random() * fortunes.length);
  return fortunes[randomIndex];
}

// Calculate the overall luck level based on the total stars
function calculateLuckLevel(total) {
  if (total >= 13) return "大吉 (Dai-kichi)";
  if (total >= 10) return "吉 (Kichi)";
  if (total >= 7) return "中吉 (Chu-kichi)";
  if (total >= 4) return "小吉 (Sho-kichi)";
  if (total >= 1) return "凶 (Kyo)";
  return "大凶 (Dai-kyo)";
}

// Helper function to format ruby text for Japanese
function formatRubyText(japaneseText) {
  return japaneseText.replace(
    /([\u4E00-\u9FFF]+)\(([\u3040-\u309F]+)\)/g,
    '<ruby>$1<rt>$2</rt></ruby>'
  );
}

// Randomize the aniamtion of teh Taiyaki
function generateRandomKeyframes() {
  // Generate random values for movement and rotation
  const randomX1 = Math.random() * 10 - 5; // Between -5% and +5%
  const randomY1 = Math.random() * 10 - 5;
  const randomX2 = Math.random() * 20 - 10; // Between -10% and +10%
  const randomY2 = Math.random() * 20 - 10;
  const randomRotation1 = Math.random() * 30 - 15; // Between -15deg and +15deg
  const randomRotation2 = Math.random() * 40 - 20;

  // Define the keyframes dynamically
  const keyframes = `
    @keyframes crazy-shake {
      0% {
        transform: translate(-50%, -50%) rotate(0deg) scale(1);
      }
      25% {
        transform: translate(calc(-50% + ${randomX1}%), calc(-50% + ${randomY1}%)) rotate(${randomRotation1}deg) scale(1.1);
      }
      50% {
        transform: translate(calc(-50% + ${randomX2}%), calc(-50% + ${randomY2}%)) rotate(${randomRotation2}deg) scale(1.2);
      }
      75% {
        transform: translate(calc(-50% + ${randomX1}%), calc(-50% + ${randomY1}%)) rotate(${randomRotation1}deg) scale(1.1);
      }
      100% {
        transform: translate(-50%, -50%) rotate(0deg) scale(1);
      }
    }
  `;

  // Inject the keyframes into the document's stylesheet
  const styleSheet = document.styleSheets[0];
  styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
}

// Preload sound files
const taiyakiSound = new Audio('../../assets/sounds/fortunegame/omikuji-sfx.mp3');
const daikichiSound = new Audio('../../assets/sounds/fortunegame/daikichi.mp3');
const kichiSound = new Audio('../../assets/sounds/fortunegame/kichi.mp3');
const chukichiSound = new Audio('../../assets/sounds/fortunegame/chukichi.mp3');
const shokichiSound = new Audio('../../assets/sounds/fortunegame/shokichi.mp3');
const kyoSound = new Audio('../../assets/sounds/fortunegame/kyo.mp3');
const daikyoSound = new Audio('../../assets/sounds/fortunegame/daikyo.mp3');

// Function to preload the audio
function preloadAudio(audio) {
  return new Promise((resolve) => {
    audio.addEventListener('canplaythrough', resolve, { once: true });
    audio.load(); // Start loading the audio
  });
}

// Preload all sounds at the beginning
async function preloadAllSounds() {
  await Promise.all([
    preloadAudio(taiyakiSound),
    preloadAudio(daikichiSound),
    preloadAudio(kichiSound),
    preloadAudio(chukichiSound),
    preloadAudio(shokichiSound),
    preloadAudio(kyoSound),
    preloadAudio(daikyoSound),
  ]);
  console.log('All sounds are preloaded and ready to play.');
}

// Call this function on page load to preload all sounds
preloadAllSounds();



// Add animation and updated fortune display with sound effects
async function drawFortune() {
  const grades = await loadJSON(gradesPath);
  const love = await loadJSON(lovePath);
  const money = await loadJSON(moneyPath);

  const fortune1 = getRandomFortune(grades);
  const fortune2 = getRandomFortune(love);
  const fortune3 = getRandomFortune(money);

  const totalLevel = parseInt(fortune1.level) + parseInt(fortune2.level) + parseInt(fortune3.level);
  const luckLevel = calculateLuckLevel(totalLevel);

  // Clear previous results
  const resultContainer = document.getElementById('result');
  const overallLevelContainer = document.getElementById('overall-luck');
  resultContainer.innerHTML = '';
  overallLevelContainer.innerHTML = '';

  // Disable the button to prevent multiple presses
  const fortuneButton = document.getElementById('draw-fortune');
  fortuneButton.disabled = true; // Disable the button
  // fortuneButton.style.cursor = 'not-allowed'; // Change cursor to indicate it's disabled

  // Re-enable the button after 5 seconds
  setTimeout(() => {
    fortuneButton.disabled = false; // Re-enable the button
    fortuneButton.style.cursor = 'pointer'; // Restore cursor style
  }, 6000); // Restore after 6 seconds when all fortunes have been displayed

  
   // Get the Taiyaki element
   const taiyaki = document.getElementById('taiyaki');

   // Play Taiyaki sound and start crazy-shake animation
   setTimeout(() => {
    taiyaki.style.display = '' // Reset Taiyaki image (if hidden)
     taiyakiSound.currentTime = 0; // Reset the sound
     taiyakiSound.play(); // Play Taiyaki sound
     taiyaki.classList.add('crazy-shake'); // Anims: jiggle | crazy-shake
   }, 100);
 
   setTimeout(() => {
     taiyaki.classList.remove('crazy-shake'); // Stop the animation after 2 seconds
     taiyaki.style.display = 'none'; // Hide the Taiyaki after
   }, 2000);

   setTimeout(() => {
    // Display the overall luck with formatted styling
    const [kanji, name] = luckLevel.split(" ");
    const overallLuckHTML = `
      <h2>${kanji}</h2>
      <div class="furigana">${name}</div>
      <p>Total Stars: ${totalLevel}</p>
    `;
    overallLevelContainer.innerHTML = overallLuckHTML;
    overallLevelContainer.classList.add('fade-in-grow'); // Add fade-in grow animation

    // Play the corresponding sound for the overall luck level
    switch (luckLevel) {
      case "大吉 (Dai-kichi)":
        daikichiSound.currentTime = 0;
        daikichiSound.play();
        break;
      case "吉 (Kichi)":
        kichiSound.currentTime = 0;
        kichiSound.play();
        break;
      case "中吉 (Chu-kichi)":
        chukichiSound.currentTime = 0;
        chukichiSound.play();
        break;
      case "小吉 (Sho-kichi)":
        shokichiSound.currentTime = 0;
        shokichiSound.play();
        break;
      case "凶 (Kyo)":
        kyoSound.currentTime = 0;
        kyoSound.play();
        break;
      case "大凶 (Dai-kyo)":
        daikyoSound.currentTime = 0;
        daikyoSound.play();
        break;
    }

    // Display fortunes one by one with a 1-second delay between each
    const fortunes = [
      {
        type: 'Grades Fortune',
        fortune: fortune1
      },
      {
        type: 'Love Fortune',
        fortune: fortune2
      },
      {
        type: 'Money Fortune',
        fortune: fortune3
      }
    ];

    fortunes.forEach((fortuneData, index) => {
      setTimeout(() => {
        const fortuneHTML = `
          <div class="fortune-type fade-in">
            <div class="fortune-stars">${fortuneData.fortune.stars}</div>
            <p><strong>${fortuneData.type}:</strong></p>
            <p>${fortuneData.fortune.fortune_english}</p>
            <button onclick="this.nextElementSibling.style.display='block'; this.style.display='none';">日本語</button>
            <p style="display:none; id="japanese">${formatRubyText(fortuneData.fortune.fortune_japanese)}</p>
          </div>
        `;
        resultContainer.insertAdjacentHTML('beforeend', fortuneHTML);
      }, 1000 + index * 1000); // Delay fortunes by 1 second each
    });
  }, 2000); // Remove Taiyaki after 2 seconds
}

// Add event listener for the button
document.getElementById('draw-fortune').addEventListener('click', drawFortune);





