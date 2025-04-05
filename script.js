let gameOver = false;
let totalBombs = 0;
let remainingFlags = 0;
let highScore = localStorage.getItem('highScore') || 0;

document.getElementById('high-score').textContent = highScore;

function showInstructions() {
    alert(`Tervetuloa pelaamaan Miinaharavaa!
    - Klikkaa ruutuja paljastaaksesi ne.
    - Merkitse epäillyt pommit oikealla hiiren painikkeella.
    - Voitat, kun kaikki turvalliset ruudut on paljastettu!`);
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginForm && !loginForm.hasAttribute('data-listener')) {
        loginForm.addEventListener('submit', login);
        loginForm.setAttribute('data-listener', true);
    }

    if (logoutBtn && !logoutBtn.hasAttribute('data-listener')) {
        logoutBtn.addEventListener('click', logout);
        logoutBtn.setAttribute('data-listener', true);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    toggleUserPanelVisibility(); 

    const highScore = localStorage.getItem('highScore') || 0;
    document.getElementById('high-score').textContent = highScore;
});

function restartGame() {
    console.log('Peli käynnistetään uudelleen...');
    document.getElementById('restart-btn').style.display = 'none'; 
    gameOver = false;
    startGame(5, 5); 
}

function login(event) {
    event.preventDefault(); 

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Täytä käyttäjänimi ja salasana!');
        return;
    }

    const isProcessing = document.body.getAttribute('data-login-processing');
    if (isProcessing === 'true') return; 

    document.body.setAttribute('data-login-processing', 'true');

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            alert(data.message);

            localStorage.setItem('userLoggedIn', true); 
            localStorage.setItem('highScore', data.high_score || 0); 
            document.getElementById('high-score').textContent = data.high_score || 0; 
            toggleAuth(); 
            toggleUserPanelVisibility(); 
        }
    })
    .catch(error => {
        console.error('Virhe kirjautumisessa:', error);
        alert('Kirjautuminen epäonnistui!');
    })
    .finally(() => {
        document.body.setAttribute('data-login-processing', 'false');
    });
}

function logout() {
    const isProcessing = document.body.getAttribute('data-logout-processing');
    if (isProcessing === 'true') return; 

    document.body.setAttribute('data-logout-processing', 'true');

    fetch('/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            alert(data.message);
            
            localStorage.removeItem('userLoggedIn'); 
            localStorage.removeItem('highScore'); 
            document.getElementById('high-score').textContent = 0; 
            toggleUserPanelVisibility(); 
        }
    })
    .catch(error => {
        console.error('Virhe uloskirjautumisessa:', error);
        alert('Uloskirjautumisessa tapahtui virhe!');
    })
    .finally(() => {
        document.body.setAttribute('data-logout-processing', 'false');
    });
}

function toggleUserPanelVisibility() {
    const userPanel = document.getElementById('user-panel');
    const userLoggedIn = !!localStorage.getItem('userLoggedIn'); 

    userPanel.style.display = userLoggedIn ? 'block' : 'none'; 
}


function toggleUserPanel() {
    const userPanel = document.getElementById('user-panel');
    const userLoggedIn = !!localStorage.getItem('userLoggedIn');

    if (userLoggedIn) {
        userPanel.style.display = userPanel.style.display === 'none' ? 'block' : 'none';
    } else {
        alert('Et ole kirjautunut sisään! Hallintapaneeli ei ole käytettävissä.');
    }
}


function startGame(rows, bombs) {
    console.log(`Peli käynnistyy: ${rows}x${rows} laudalla ja ${bombs} pommilla.`);
    const board = document.getElementById('game-board');
    board.innerHTML = ''; 
    gameOver = false;

    const columns = rows; 
    const totalCells = rows * columns;
    totalBombs = bombs;
    remainingFlags = bombs;

    setupBoard(rows, columns, bombs); 
    document.getElementById('game-info').style.display = 'flex'; 
    document.getElementById('restart-btn').style.display = 'none'; 
    updateGameInfo(); 
}

function setupBoard(rows, columns, bombs) {
    const board = document.getElementById('game-board');
    board.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    board.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

    const cells = Array.from({ length: rows * columns }, (_, index) => index);
    const bombIndexes = new Set();

    while (bombIndexes.size < bombs) {
        const bombIndex = Math.floor(Math.random() * cells.length);
        bombIndexes.add(bombIndex);
    }

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < columns; j++) {
            const cellIndex = i * columns + j;
            const cell = document.createElement('div');
            cell.className = 'cell';

            if (bombIndexes.has(cellIndex)) {
                cell.dataset.bomb = true;
            } else {
                cell.dataset.bomb = false;
            }

            // Klikkaustapahtumat
            cell.addEventListener('click', () => handleCellClick(cell, i, j, rows, columns));
            cell.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                toggleFlag(cell);
            });

            board.appendChild(cell);
        }
    }
}

function toggleFlag(cell) {
    if (gameOver || cell.classList.contains('revealed')) return;

    if (cell.classList.contains('flag')) {
        // Poista lippu
        cell.classList.remove('flag');
        cell.textContent = ''; 
        remainingFlags++;
    } else if (remainingFlags > 0) {
        // Aseta lippu
        cell.classList.add('flag');
        cell.textContent = '🚩';
        remainingFlags--;
    }

    updateGameInfo();
}

function handleCellClick(cell, row, column, rows, columns) {
    if (gameOver || cell.classList.contains('revealed')) return;

    cell.classList.add('revealed');

    if (cell.dataset.bomb === 'true') {
        cell.textContent = '💣';
        endGame(false); // Häviö
    } else {
        const bombCount = countAdjacentBombs(row, column, rows, columns);
        cell.textContent = bombCount || '';
        if (bombCount === 0) revealSafeArea(row, column, rows, columns);

        updateHighScore(); 
        checkWin(); 
    }
}

function updateHighScore() {
    const revealedCells = document.querySelectorAll('.cell.revealed').length;

    if (gameOver && revealedCells > highScore) {
        highScore = revealedCells;
        localStorage.setItem('highScore', highScore); 
        document.getElementById('high-score').textContent = highScore;

        fetch('/update_score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: highScore })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error(`Virhe palvelimella: ${data.error}`);
            } else {
                console.log(`High Score tallennettu tietokantaan: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('High Score tallentaminen epäonnistui:', error);
        });
    }
}

function countAdjacentBombs(row, column, rows, columns) {
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],          [0, 1],
        [1, -1], [1, 0], [1, 1],
    ];

    return directions.reduce((count, [dr, dc]) => {
        const newRow = row + dr;
        const newCol = column + dc;
        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < columns) {
            const adjacentCell = document.querySelector(`.cell:nth-child(${newRow * columns + newCol + 1})`);
            if (adjacentCell && adjacentCell.dataset.bomb === 'true') {
                count++;
            }
        }
        return count;
    }, 0);
}

function toggleUserPanelVisibility(forceShow) {
    const userPanel = document.getElementById('user-panel');
    const userLoggedIn = !!localStorage.getItem('userLoggedIn'); 

    if (userLoggedIn) {
        if (typeof forceShow === 'boolean') {
            
            userPanel.style.display = forceShow ? 'block' : 'none';
        } else {
            userPanel.style.display = userPanel.style.display === 'none' ? 'block' : 'none';
        }
    } else {
        userPanel.style.display = 'none';
    }
}


function revealSafeArea(row, column, rows, columns) {
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],          [0, 1],
        [1, -1], [1, 0], [1, 1],
    ];

    directions.forEach(([dr, dc]) => {
        const newRow = row + dr;
        const newCol = column + dc;
        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < columns) {
            const adjacentCell = document.querySelector(`.cell:nth-child(${newRow * columns + newCol + 1})`);
            if (adjacentCell && !adjacentCell.classList.contains('revealed') && adjacentCell.dataset.bomb === 'false') {
                handleCellClick(adjacentCell, newRow, newCol, rows, columns);
            }
        }
    });
}


function updateGameInfo() {
    document.getElementById('bomb-count').textContent = totalBombs || 0;
    document.getElementById('flag-count').textContent = remainingFlags || 0;
}


function toggleAuth() {
    const authContainer = document.getElementById('auth');
    const userPanel = document.getElementById('user-panel');

    
    if (authContainer) {
        authContainer.style.display = authContainer.style.display === 'none' ? 'block' : 'none';

        
        if (authContainer.style.display === 'block') {
            userPanel.style.display = 'none';
        }
    }
}

function toggleUserPanelVisibility(show) {
    const userPanel = document.getElementById('user-panel');
    const userLoggedIn = !!localStorage.getItem('userLoggedIn'); 

    if (!userLoggedIn || show === false) {
        userPanel.style.display = 'none'; 
    } else if (show === true) {
        userPanel.style.display = 'block'; 
    }
}


function endGame(won) {
    gameOver = true;
    document.getElementById('restart-btn').style.display = 'block'; 

    if (won) {
        alert('Voitit! Onnittelut!');
        updateHighScore(); 
    } else {
        alert('Hävisit! Miina räjähti!');
        document.querySelectorAll('.cell[data-bomb="true"]').forEach(cell => {
            cell.textContent = '💣';
            cell.classList.add('revealed');
        });
    }
}
