function createSakuraPetal() {
    const petal = document.createElement("div");
    petal.classList.add("sakura");

    // Random horizontal position (0% to 100% of screen width)
    petal.style.left = Math.random() * 100 + "vw";

    // Random duration and delay
    const duration = 8 + Math.random() * 5; // 8–13s
    petal.style.animation = `fall ${duration}s linear`;
    
    document.body.appendChild(petal);

    // Remove the petal once animation is done
    setTimeout(() => {
      petal.remove();
    }, duration * 1000);
  }

  // Start spawning petals at random intervals
  setInterval(() => {
    createSakuraPetal();
  }, 1000 + Math.random() * 1000); // Every 1.0–1.5 seconds