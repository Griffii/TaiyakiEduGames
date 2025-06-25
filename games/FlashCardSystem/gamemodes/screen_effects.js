let sharkInterval = null;

function swimSharkOnce() {
  if (sharkInterval) return; // Prevent overlapping animations

  let x = -800;
  let mouthOpen = true;
  let frameCount = 0;

  // Get bite sound from the HTML
  const biteSound = document.getElementById("shark-sound");

  // Create shark image element
  const shark = document.createElement("img");
  shark.src = "images/shark_open.png";
  shark.id = "swimming-shark";

  // Style it
  shark.style.position = "fixed";
  shark.style.top = "50%";
  shark.style.left = `${x}px`;
  shark.style.transform = "translateY(-50%)";
  shark.style.width = "512px";
  shark.style.height = "auto";
  shark.style.pointerEvents = "none";
  shark.style.zIndex = "9999";

  // Add to the DOM
  document.body.appendChild(shark);

  sharkInterval = setInterval(() => {
    x += 10;
    shark.style.left = `${x}px`;
    if (x > window.innerWidth + 300) {
      clearInterval(sharkInterval);
      sharkInterval = null;
      shark.remove(); // clean up
    }

    frameCount++;
    if (frameCount % 20 === 0) {
      mouthOpen = !mouthOpen;
      shark.src = mouthOpen ? "images/shark_open.png" : "images/shark_closed.png";

      if (mouthOpen && biteSound) {
        biteSound.currentTime = 0;
        biteSound.play();
      }
    }
  }, 10);
}

function send_tornado() {
  let x = -800;
  let baseY = window.innerHeight * 0.10; // 10% from top
  let angle = 0; // for sine wave
  const amplitude = 10; // how much it shakes vertically
  const frequency = 0.2; // controls how fast it wiggles

  const tornado = document.createElement("img");
  tornado.src = "images/tornado.png";
  tornado.className = "tornado-flyby";

  // Style it
  tornado.style.position = "fixed";
  tornado.style.top = `${baseY}px`;
  tornado.style.left = `${x}px`;
  tornado.style.width = "600px";
  tornado.style.height = "auto";
  tornado.style.pointerEvents = "none";
  tornado.style.zIndex = "9998";

  document.body.appendChild(tornado);

  const tornadoInterval = setInterval(() => {
    x += 25;
    angle += frequency;

    // Shake vertically using sine wave
    const yOffset = Math.sin(angle) * amplitude;
    tornado.style.left = `${x}px`;
    tornado.style.top = `${baseY + yOffset}px`;

    if (x > window.innerWidth + 600) {
      clearInterval(tornadoInterval);
      tornado.remove();
    }
  }, 10);
}


// Make both functions available globally
window.swimSharkOnce = swimSharkOnce;
window.send_tornado = send_tornado;


