document.addEventListener("DOMContentLoaded", () => {
    const board = document.getElementById("board");
    const boardState = Array(8).fill(null).map(() => Array(8).fill(null));
    let currentPlayer = "black";

    const placeSound = document.getElementById("place-sound");
    const flipSound = document.getElementById("flip-sound");

    // Initialize center pieces
    boardState[3][3] = "white";
    boardState[3][4] = "black";
    boardState[4][3] = "black";
    boardState[4][4] = "white";

    const resetButton = document.getElementById("reset-button");
    resetButton.addEventListener("click", resetBoard);

    function renderBoard() {
        board.innerHTML = "";
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement("div");
                cell.classList.add("cell");
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                cell.addEventListener("click", () => placePiece(row, col));

                if (boardState[row][col]) {
                    const piece = document.createElement("div");
                    piece.classList.add("piece", boardState[row][col]);
                    cell.appendChild(piece);
                }
                board.appendChild(cell);
            }
        }
        updateScoreboard();
    }

    function placePiece(row, col) {
        if (!boardState[row][col]) {
            boardState[row][col] = currentPlayer;

            checkAndFlip(row, col, currentPlayer);
            playSound(placeSound);
            renderBoard();
            switchPlayer(); //Switch players after placing piece
        } else {
            flipPiece(row, col);
        }
    }

    function flipPiece(row, col) {
        const cell = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
        const piece = cell ? cell.querySelector(".piece") : null;
    
        if (piece) {
            piece.classList.add("flip"); // Trigger animation
    
            setTimeout(() => {
                // Swap board state color AFTER animation completes
                boardState[row][col] = boardState[row][col] === "black" ? "white" : "black";
    
                // Ensure the piece updates color properly
                piece.classList.remove("black", "white"); 
                piece.classList.add(boardState[row][col]);
    
                piece.classList.remove("flip"); // Reset flip class

                playSound(flipSound);
            }, 300); // Slightly longer than CSS animation to ensure smooth effect
        }
    }

    function updateTurnIndicator() {
        const turnIndicator = document.getElementById("turn-indicator");
        if (currentPlayer === "black") {
            turnIndicator.style.transform = "translateX(-40px)"; // Moves left above Black
        } else {
            turnIndicator.style.transform = "translateX(35px)"; // Moves right above White
        }
    }

    function switchPlayer() {
        // Switch current player after each placement
        currentPlayer = currentPlayer === "black" ? "white" : "black";
        updateTurnIndicator();
        updateBoardBorder();
    }

    function updateBoardBorder() {
        const board = document.getElementById("board");
        board.style.border = `5px solid ${currentPlayer}`;
    }
    
    function checkAndFlip(row, col, player) {
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1], 
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ];
    
        let flipsToAnimate = [];
    
        for (const [dx, dy] of directions) {
            let r = row + dx;
            let c = col + dy;
            let piecesToFlip = [];
    
            while (r >= 0 && r < 8 && c >= 0 && c < 8 && boardState[r][c] && boardState[r][c] !== player) {
                piecesToFlip.push([r, c]);
                r += dx;
                c += dy;
            }
    
            if (r >= 0 && r < 8 && c >= 0 && c < 8 && boardState[r][c] === player) {
                flipsToAnimate.push(...piecesToFlip);
            }
        }
    
        // Apply flipping animations in sequence
        flipsToAnimate.forEach(([flipRow, flipCol], index) => {
            setTimeout(() => flipPiece(flipRow, flipCol), index * 100); // Staggered flip effect
        });
    
        // Ensure the board re-renders *after* all flips complete
        setTimeout(renderBoard, flipsToAnimate.length * 100 + 500);
    }
    
    function updateScoreboard() {
        let blackCount = 0;
        let whiteCount = 0;
    
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (boardState[row][col] === "black") blackCount++;
                if (boardState[row][col] === "white") whiteCount++;
            }
        }
    
        document.getElementById("black-score").textContent = blackCount;
        document.getElementById("white-score").textContent = whiteCount;
    }

    function resetBoard() {
        // Reset board state
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                boardState[row][col] = null;
            }
        }

        // Reinitialize center pieces
        boardState[3][3] = "white";
        boardState[3][4] = "black";
        boardState[4][3] = "black";
        boardState[4][4] = "white";

        // Reset current player
        currentPlayer = "black"
        updateBoardBorder();
        updateTurnIndicator();
        renderBoard();
    }
    
    function playSound(audio) {
        if (audio) {
            audio.currentTime = 0; // Reset sound so it plays from the start
            audio.volume = 1.0;
            audio.play().catch(error => console.log("Sound play blocked:", error));
        }
    }

    renderBoard();
});




