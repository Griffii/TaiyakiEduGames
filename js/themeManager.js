// Available themes and their settings
const themes = {
  classroom: {
    bg: "linear-gradient(to top, #fff0f5, #ffe4f0)",
    leftBorder: "",
    rightBorder: "",
    script: null,
  },
  sakura: {
    bg: "linear-gradient(to top, #ffe4f0, #f5e9ff)",
    leftBorder: "assets/Cherry_Border_03_Left.png",
    rightBorder: "assets/Cherry_Border_03_Right.png",
    script: "js/fallingcherryblossoms.js",
  },
};

// Load and apply theme
function applyTheme() {
  const themeName = localStorage.getItem("selectedTheme") || "sakura";
  const theme = themes[themeName];

  // Apply background
  document.body.style.background = theme.bg;

  // Update borders
  const left = document.querySelector(".border-left");
  const right = document.querySelector(".border-right");
  if (left && right) {
    left.style.backgroundImage = `url(${theme.leftBorder})`;
    right.style.backgroundImage = `url(${theme.rightBorder})`;
  }

  // Load script
  if (theme.script) {
    const script = document.createElement("script");
    script.src = theme.script;
    document.body.appendChild(script);
  }
}

// Dropdown toggle
function createThemeDropdown() {
  const btn = document.getElementById("theme-btn");
  const dropdown = document.getElementById("theme-dropdown");
  if (!btn || !dropdown) return;

  // Build the theme list ONCE
  if (dropdown.children.length === 0) {
    Object.keys(themes).forEach((key) => {
      const item = document.createElement("div");
      item.textContent = key.charAt(0).toUpperCase() + key.slice(1);
      item.style.cursor = "pointer";
      item.style.margin = "5px 0";
      item.onclick = () => {
        localStorage.setItem("selectedTheme", key);
        dropdown.style.display = "none";
        window.location.reload();
      };
      dropdown.appendChild(item);
    });
  }

  // Toggle dropdown visibility on button click
  btn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent outside click from immediately closing
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
  });

  // Hide dropdown if clicking outside
  document.addEventListener("click", (e) => {
    if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });
}


window.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  createThemeDropdown();
});
