const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.lineWidth = 1;


// Game settings
const gridSize = 10;
const cellSize = canvas.width / (gridSize * 2); // Two grids side by side
const playerBoard = createBoard(gridSize);
const opponentBoard = createBoard(gridSize);
const playerShips = createShipsArray();
const opponentShips = createShipsArray();


// Initialize game
drawBoards();

// Init sever connection
const socket = new WebSocket('ws://localhost:3000');

socket.onopen = function(event) {
    console.log("Connection established");
};

socket.onmessage = handleServerMessage; //function to process messages

socket.onclose = function(event) {
    console.log("Connection closed");
};

canvas.addEventListener('click', handleCanvasClick);

function createBoard(size) {
    return Array.from({ length: size }, () => Array(size).fill(0));
}

function createShipsArray() {
    return [5, 4, 3, 3, 2].map(size => ({ size }));
}

function placeShipsCaller() {
    placeShips(playerBoard, playerShips);
    document.getElementById('placeShipsButton').disabled = true;
}

function placeShips(board, ships) {
    let shipPlacements = [];
    ships.forEach(ship => {
        let placed = false;
        while (!placed) {
            const x = Math.floor(Math.random() * gridSize);
            const y = Math.floor(Math.random() * gridSize);
            const direction = Math.random() > 0.5 ? 'H' : 'V';
            placed = canPlaceShip(board, x, y, ship.size, direction);
            if (placed) {
                let shipCoordinates = [];
                for (let i = 0; i < ship.size; i++) {
                    coordY = y + (direction === 'V' ? i : 0);
                    coordX = x + (direction === 'H' ? i : 0);
                    board[coordY][coordX] = 1;
                    shipCoordinates.push([coordX, coordY]);
                    ctx.fillStyle = 'gray';
                    ctx.fillRect(coordX * cellSize + 2, coordY * cellSize + 2, cellSize - 4, cellSize - 4);
                }
                shipPlacements.push({ type: ship.type, coordinates: shipCoordinates, direction });
            }
        }
    });
    const message = {
        type: "shipPlacement",
        data: { shipPlacements }
    };
    socket.send(JSON.stringify(message));
}

function canPlaceShip(board, x, y, size, direction) {
    for (let i = 0; i < size; i++) {
        if (direction === 'H' && (x + i >= gridSize || board[y][x + i] === 1)) {
            return false;
        }
        if (direction === 'V' && (y + i >= gridSize || board[y + i][x] === 1)) {
            return false;
        }
    }
    return true;
}

function drawBoards() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(0); // Player's grid
    drawGrid(gridSize * cellSize); // Player 2's grid
    drawShips(playerBoard, 0); // Draw player's ships
    updateopponentGrid();
    updatePlayerGrid();
}

function drawGrid(offsetX) {
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            ctx.strokeRect(i * cellSize + offsetX, j * cellSize, cellSize, cellSize);
        }
    }
}

function drawShips(board, offsetX) {
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (board[y][x] === 1) {
                ctx.fillStyle = 'gray';
                ctx.fillRect(x * cellSize + offsetX + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
            }
        }
    }
}

function updateopponentGrid() {
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (opponentBoard[y][x] === 2) {
                ctx.fillStyle = 'red';
                ctx.fillRect((x + gridSize) * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
            } else if (opponentBoard[y][x] === 3) {
                ctx.fillStyle = 'blue';
                ctx.fillRect((x + gridSize) * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
            }
        }
    }
}

function updatePlayerGrid() {
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (playerBoard[y][x] === 2) {
                ctx.fillStyle = 'red';
                ctx.fillRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
            } else if (playerBoard[y][x] === 3) {
                ctx.fillStyle = 'orange';
                ctx.fillRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
            }
        }
    }
}

function handleCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / cellSize);
    const y = Math.floor((event.clientY - rect.top) / cellSize);
    if (x >= gridSize) {
        playerMove(x - gridSize, y);
    }
}

function playerMove(x, y) {
    //if cell is not a ship cell
    if (opponentBoard[y][x] === 0) {
        opponentBoard[y][x] = 3;
        ctx.fillStyle = 'blue'; //mark as miss
        ctx.fillRect((x + gridSize) * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
    //if cell is a ship cell
    } else if (opponentBoard[y][x] === 1) {
        opponentBoard[y][x] = 2;
        ctx.fillStyle = 'red'; //mark as hit
        ctx.fillRect((x + gridSize) * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
    }
    //if game is over, send a 'finished' message
    if (checkGameOver(opponentShips, opponentBoard)) {
        alert("You win!");
        canvas.removeEventListener('click', handleCanvasClick);
        const message = {
            type: "finished"
        };
        socket.send(JSON.stringify(message));
    //if game is not over, send a 'move' message
    } else {
        const message = {
            type: "move",
            data: { coordinates: [x, y] }
        };
        socket.send(JSON.stringify(message));
    }
}

function checkGameOver(ships, board) {
    return ships.every(ship => {
        let count = 0;
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (board[y][x] === 2) {
                    count++;
                }
            }
        }
        return count === ships.reduce((acc, ship) => acc + ship.size, 0);
    });
}

function handleShipPlacement(shipPlacements) {
    console.log('Received ship placements:', shipPlacements);
    //place ship on opponent's page, without filling in the cells gray
    shipPlacements.forEach(ship => {
        ship.coordinates.forEach(coord => {
            const x = coord[0];
            const y = coord[1];
            opponentBoard[y][x] = 1;
        });
    });
}

function handleMove(coordinates) {
    console.log('Received move:', coordinates);
    const x = coordinates[0];
    const y = coordinates[1];
    //if cell is a ship cell
    if (playerBoard[coordinates[1]][coordinates[0]] === 1) {
        playerBoard[coordinates[1]][coordinates[0]] === 2;
        ctx.fillStyle = 'red'; //mark as hit
        ctx.fillRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
    }
    //if cell is not a ship cell
    else if (playerBoard[coordinates[1]][coordinates[0]] === 0) {
        ctx.fillStyle = 'orange'; //mark as miss
        ctx.fillRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
    }
}

function handleFinish() {
    //display lost game message
    alert("You Lost!");
    canvas.removeEventListener('click', handleCanvasClick);
}

function handleServerMessage(event) {
    //if data is blob object, convert to string first, then parse data
    if (event.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = function() {
            try {
                const message = JSON.parse(reader.result);
                //call function that will process the message
                processServerMessage(message);
            } catch (e) {
                console.error("Failed to parse the message as JSON:", e);
            }
        };
        reader.onerror = function(e) {
            console.error("Error reading the Blob:", e);
        };
        reader.readAsText(event.data);
    //if data is already string, parse data
    } else {
        try {
            const message = JSON.parse(event.data);
            //call function that will process the message
            processServerMessage(message);
        } catch (e) {
            console.error("Failed to parse the message as JSON:", e);
        }
    }
}

function processServerMessage(message) {
    //if message is a ship placement message, call the handleShipPlacement function
    if (message.type === "shipPlacement") {
        console.log('Handling ship placement');
        handleShipPlacement(message.data.shipPlacements);
    //if message is a move message, call the handleMove function
    } else if (message.type === "move") {
        handleMove(message.data.coordinates);
    //if message is a game finished message, call the handleFinish function
    } else if (message.type === "finished") {
        handleFinish();
    }
    console.log('Message from server:', message);
}
