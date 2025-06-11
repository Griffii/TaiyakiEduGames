(function createRain() {
  const NUM_DROPS = 100; // Number of raindrops
  const dropColor = "rgba(173, 216, 230, 0.7)"; // Light blue, semi-transparent

  // Create a style tag for raindrop styles
  const style = document.createElement("style");
  style.textContent = `
    .raindrop {
      position: fixed;
      width: 2px;
      height: 12px;
      background: ${dropColor};
      top: -20px;
      pointer-events: none;
      z-index: 9999;
      animation-name: fall;
      animation-timing-function: linear;
    }

    @keyframes fall {
      to {
        transform: translateY(100vh);
      }
    }
  `;
  document.head.appendChild(style);

  for (let i = 0; i < NUM_DROPS; i++) {
    const drop = document.createElement("div");
    drop.className = "raindrop";

    // Random horizontal position
    drop.style.left = Math.random() * 100 + "vw";

    // Random animation duration and delay
    const duration = 1.5 + Math.random() * 1.5; // 1.5s to 3s
    const delay = Math.random() * 3; // up to 3s

    drop.style.animationDuration = `${duration}s`;
    drop.style.animationDelay = `${delay}s`;

    // Slightly vary size
    const height = 10 + Math.random() * 10;
    drop.style.height = `${height}px`;

    document.body.appendChild(drop);

    // Loop drops by resetting them
    drop.addEventListener("animationend", () => {
      drop.remove();
      setTimeout(() => {
        createSingleDrop();
      }, 50);
    });
  }

  function createSingleDrop() {
    const newDrop = document.createElement("div");
    newDrop.className = "raindrop";
    newDrop.style.left = Math.random() * 100 + "vw";
    const duration = 1.5 + Math.random() * 1.5;
    const delay = Math.random() * 3;
    newDrop.style.animationDuration = `${duration}s`;
    newDrop.style.animationDelay = `${delay}s`;
    newDrop.style.height = `${10 + Math.random() * 10}px`;

    newDrop.addEventListener("animationend", () => {
      newDrop.remove();
      setTimeout(() => {
        createSingleDrop();
      }, 50);
    });

    document.body.appendChild(newDrop);
  }
})();