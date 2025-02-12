// Container, Canvas, Renderer
const diceContainer = document.getElementById("diceContainer");
const diceCanvas = document.getElementById("diceCanvas");
const rollButton = document.getElementById("rollButton");
const diceCountDropdown = document.getElementById("diceCountDropdown");

const diceSound = new Audio("../../assets/sounds/flip.mp3"); // Path to dice sound effect
diceSound.volume = 1;

const renderer = new THREE.WebGLRenderer({ canvas: diceCanvas, alpha: true });
renderer.setSize(diceContainer.clientWidth, diceContainer.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Scene and Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60, // Field of view
  diceContainer.clientWidth / diceContainer.clientHeight, // Aspect ratio
  0.1, // Near clipping plane
  1000 // Far clipping plane
);
camera.position.set(7, 14, 7);
camera.lookAt(0, 0, 0);
// Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // White light, low intensity
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(3, 10, -3); // Position the light above the scene
scene.add(directionalLight);
// Cannon.js World
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Add downward gravity

// Dice Variables, dice mesh array
let diceMeshes = [];
let lastTime; // Track the last time step

// Create Dice Meshes
function createDiceMesh() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const diceMaterials = [
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: createDiceTexture(1),
    }),
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: createDiceTexture(2),
    }),
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: createDiceTexture(3),
    }),
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: createDiceTexture(4),
    }),
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: createDiceTexture(5),
    }),
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: createDiceTexture(6),
    }),
  ];
  const dice = new THREE.Mesh(geometry, diceMaterials);
  return dice;
}

// Function to spawn a dice at a random position and rotation
function spawnDice() {
  const initialPosition = {
    x: Math.random() * 4 - 2, // Limit X position to [-2, 2]
    y: Math.random() * 2 + 5, // Spawn height between 5 and 7
    z: Math.random() * 4 - 2, // Limit Z position to [-2, 2]
  };

  const initialRotation = {
    x: Math.random() * Math.PI * 2,
    y: Math.random() * Math.PI * 2,
    z: Math.random() * Math.PI * 2,
  };

  const dice = createDiceMesh();
  dice.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
  dice.rotation.set(initialRotation.x, initialRotation.y, initialRotation.z);
  scene.add(dice);

  const diceBody = new CANNON.Body({ mass: 1 });
  diceBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)));
  diceBody.position.set(
    initialPosition.x,
    initialPosition.y,
    initialPosition.z
  );
  diceBody.quaternion.setFromEuler(
    initialRotation.x,
    initialRotation.y,
    initialRotation.z
  );

  // Apply random rotational force (spin) to make spawning dynamic
  const rotationalForce = new CANNON.Vec3(
    (Math.random() - 0.5) * 20, // Random torque X
    (Math.random() - 0.5) * 20, // Random torque Y
    (Math.random() - 0.5) * 20 // Random torque Z
  );
  diceBody.angularVelocity.set(
    rotationalForce.x,
    rotationalForce.y,
    rotationalForce.z
  );

  // Attach collision event listener
  diceBody.addEventListener("collide", (event) => {
    // Determine the collision force
    const impactStrength = event.contact.getImpactVelocityAlongNormal();

    // Play sound if the impact strength exceeds a threshold
    if (impactStrength > 2) {
      // Adjust threshold as needed
      diceSound.currentTime = 0; // Reset the sound effect
      diceSound.play();
    }
  });

  world.addBody(diceBody);

  dice.physicsBody = diceBody;
  diceMeshes.push(dice);
}
spawnDice(); // Spawn one dice on load

// Function to clear all dice from the scene and physics world
function clearDiceFromScene() {
  diceMeshes.forEach((dice) => {
    scene.remove(dice);
    world.remove(dice.physicsBody);
  });
  diceMeshes = [];
}

// Event listener for the Roll Dice button
rollButton.addEventListener("click", () => {
  const diceCount = parseInt(diceCountDropdown.value);
  clearDiceFromScene();
  for (let i = 0; i < diceCount; i++) {
    spawnDice();
  }
});

// Resize handling with debounce
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    camera.aspect = diceContainer.clientWidth / diceContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(diceContainer.clientWidth, diceContainer.clientHeight);
  }, 200); // Adjust debounce delay as needed
});

// Create Dice Box
const boxWidth = 12; // Box width multiplier
const boxHeight = 2; // Walls height multiplier
createBoxWall(-boxWidth / 2, 0, boxWidth, boxHeight, "z"); // Left wall
createBoxWall(boxWidth / 2, 0, boxWidth, boxHeight, "z"); // Right wall
createBoxWall(0, -boxWidth / 2, boxWidth, boxHeight, "x"); // Bottom wall
createBoxWall(0, boxWidth / 2, boxWidth, boxHeight, "x"); // Top wall

function createBoxWall(x, y, width, height, orientation) {
  const tallWallHeight = 10; // Taller than the short dice box walls
  const wallWidth = 0.1; // Wall thickness

  // Create wall geometry
  const shortWallGeometry = new THREE.BoxGeometry(
    orientation === "z" ? wallWidth : width,
    height,
    orientation === "z" ? width : wallWidth
  );

  const shortWallMaterial = new THREE.MeshStandardMaterial({
    color: "#DAA520", // Muted Gold
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide, // Render both sides
  });

  const shortWallMesh = new THREE.Mesh(shortWallGeometry, shortWallMaterial);

  // Flip the wall if necessary
  if (orientation === "z") {
    shortWallMesh.scale.z = -1; // Flip Z walls
  } else {
    shortWallMesh.scale.x = -1; // Flip X walls
  }

  shortWallMesh.position.set(x, height / 2 - 1, y);
  scene.add(shortWallMesh);

  const tallWallBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(
      new CANNON.Vec3(
        orientation === "z" ? wallWidth / 2 : width / 2,
        tallWallHeight / 2,
        orientation === "z" ? width / 2 : wallWidth / 2
      )
    ),
    position: new CANNON.Vec3(x, tallWallHeight / 2 - 1, y),
  });
  world.addBody(tallWallBody);
}

// Add ground
const groundWidth = 12;
const groundHeight = 12;
const groundBody = new CANNON.Body({
  mass: 0,
  shape: new CANNON.Box(
    new CANNON.Vec3(groundWidth / 2, 0.1, groundHeight / 2)
  ),
  position: new CANNON.Vec3(0, -1.05, 0),
});
world.addBody(groundBody);

const groundMesh = new THREE.Mesh(
  new THREE.BoxGeometry(groundWidth, 0.2, groundHeight),
  new THREE.MeshStandardMaterial({
    color: "#556B2F",
    transparent: true,
    opacity: 0.8,
  })
);
groundMesh.position.set(0, -1.05, 0);
scene.add(groundMesh);

// Utility Function for Dice Textures
function createDiceTexture(number) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 256; // High resolution for clarity
  canvas.height = 256; // Background color: white

  ctx.fillStyle = "#ffffff"; // White background
  ctx.fillRect(0, 0, canvas.width, canvas.height); // Text color: black

  ctx.fillStyle = "#000000"; // Black writing
  ctx.font = "bold 200px Arial"; // Bold font for better visibility
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(number, canvas.width / 2, canvas.height / 2); // Draw number in the center

  return new THREE.CanvasTexture(canvas);
}




//// Logic for grabbing and dragging dice ////
//// Mouse interaction with Dice ////

// Global variables for interaction
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let selectedDice = null;
let isDragging = false;

// Handle mouse down
window.addEventListener("mousedown", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera); // Check for intersections with dice
  const intersects = raycaster.intersectObjects(diceMeshes);

  if (intersects.length > 0) {
    selectedDice = intersects[0].object; // Pick the first intersected dice
    isDragging = true; // Temporarily increase linear damping for smoother dragging
    selectedDice.physicsBody.linearDamping = 0.9;
  }
});

// Handle mouse move (track the mouse position)
window.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Continuous pulling logic (runs in the animation loop)
function pullDiceToMouse() {
  if (isDragging && selectedDice) {
    raycaster.setFromCamera(mouse, camera); // Determine the target drag position on the horizontal plane
    const dragPosition = new THREE.Vector3();

    raycaster.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0)),
      dragPosition
    ); // Calculate the target position

    const target = new CANNON.Vec3(dragPosition.x, 1, dragPosition.z); // Fixed Y-axis
    const current = selectedDice.physicsBody.position; // Clamp the force multiplier to prevent excessive movement
    const forceMultiplier = 50;
    const maxForce = 500; 

    // Calculate the force to apply
    const force = new CANNON.Vec3(
      Math.min((target.x - current.x) * forceMultiplier, maxForce),
      Math.min((target.y - current.y) * forceMultiplier, maxForce),
      Math.min((target.z - current.z) * forceMultiplier, maxForce)
    );
    selectedDice.physicsBody.applyForce(force, current); // Apply force to move the dice
  }
}

// Handle mouse up
window.addEventListener("mouseup", () => {
  if (isDragging && selectedDice) {
    isDragging = false; // Restore default damping for normal physics
    selectedDice.physicsBody.linearDamping = 0.01; // Low damping for realistic motion
    selectedDice = null;
  }
});

// Animate function
function animate(time) {
  requestAnimationFrame(animate);

  if (lastTime !== undefined) {
    const deltaTime = (time - lastTime) / 1000; // Convert to seconds
    world.step(1 / 60, deltaTime, 3); // Adjust time step based on frame rate
  }
  lastTime = time;

  pullDiceToMouse();

  diceMeshes.forEach((dice) => {
    dice.position.copy(dice.physicsBody.position);
    dice.quaternion.copy(dice.physicsBody.quaternion);
  });

  renderer.render(scene, camera);
}
animate();
