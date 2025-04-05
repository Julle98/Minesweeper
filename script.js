// Globaali tila
let gameOver = false;
let totalBombs = 0;
let remainingFlags = 0;
let highScore = localStorage.getItem('highScore') || 0;

// Päivitä high score näkyville heti alussa
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
    toggleUserPanelVisibility(); // Päivitä hallintapaneelin näkyvyys

    // Päivitä näkyvä High Score arvo
    const highScore = localStorage.getItem('highScore') || 0;
    document.getElementById('high-score').textContent = highScore;
});

// "Aloita alusta" -toiminto
function restartGame() {
    console.log('Peli käynnistetään uudelleen...');
    document.getElementById('restart-btn').style.display = 'none'; // Piilota restart-nappula
    gameOver = false;
    startGame(5, 5); // Aloita uusi peli esimerkiksi helpolla vaikeustasolla
}

// Kirjaudu sisään -toiminto
function login(event) {
    event.preventDefault(); // Estetään lomakkeen oletuskäyttäytyminen

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Täytä käyttäjänimi ja salasana!');
        return;
    }

    const isProcessing = document.body.getAttribute('data-login-processing');
    if (isProcessing === 'true') return; // Estetään kaksoiskutsu

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

            // Tallenna käyttäjän tiedot
            localStorage.setItem('userLoggedIn', true); // Merkitään käyttäjä kirjautuneeksi
            localStorage.setItem('highScore', data.high_score || 0); // Päivitä High Score -tieto
            document.getElementById('high-score').textContent = data.high_score || 0; // Päivitä DOM:iin
            toggleAuth(); // Piilota kirjautumisikkuna
            toggleUserPanelVisibility(); // Näytä hallintapaneeli
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

// Kirjaudu ulos -toiminto
function logout() {
    const isProcessing = document.body.getAttribute('data-logout-processing');
    if (isProcessing === 'true') return; // Estetään kaksoiskutsu

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
            
            // Tyhjennetään käyttäjän tiedot
            localStorage.removeItem('userLoggedIn'); // Poista kirjautumistieto
            localStorage.removeItem('highScore'); // Poista High Score -tieto
            document.getElementById('high-score').textContent = 0; // Päivitä DOM:iin
            toggleUserPanelVisibility(); // Piilota hallintapaneeli
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

// Tarkista hallintapaneelin näkyvyys kirjautumistilan perusteella
function toggleUserPanelVisibility() {
    const userPanel = document.getElementById('user-panel');
    const userLoggedIn = !!localStorage.getItem('userLoggedIn'); // Tarkistetaan kirjautumistieto

    userPanel.style.display = userLoggedIn ? 'block' : 'none'; // Näytä vain, jos käyttäjä on kirjautunut
}


// "Hallintapaneeli" -nappula
function toggleUserPanel() {
    const userPanel = document.getElementById('user-panel');
    const userLoggedIn = !!localStorage.getItem('userLoggedIn');

    if (userLoggedIn) {
        // Vaihdetaan hallintapaneelin näkyvyys
        userPanel.style.display = userPanel.style.display === 'none' ? 'block' : 'none';
    } else {
        alert('Et ole kirjautunut sisään! Hallintapaneeli ei ole käytettävissä.');
    }
}


// Pelin aloitustoiminto
function startGame(rows, bombs) {
    console.log(`Peli käynnistyy: ${rows}x${rows} laudalla ja ${bombs} pommilla.`);
    const board = document.getElementById('game-board');
    board.innerHTML = ''; // Tyhjennetään edellinen pelilauta
    gameOver = false;

    const columns = rows; // Käytetään neliölautaa
    const totalCells = rows * columns;
    totalBombs = bombs;
    remainingFlags = bombs;

    setupBoard(rows, columns, bombs); // Generoi uusi pelilauta
    document.getElementById('game-info').style.display = 'flex'; // Näytä pelitiedot
    document.getElementById('restart-btn').style.display = 'none'; // Piilota uudelleenkäynnistysnappi
    updateGameInfo(); // Päivitä laskurit
}

// Luo pelilauta
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

// Liputa solu (oikea hiiren klikkaus)
function toggleFlag(cell) {
    if (gameOver || cell.classList.contains('revealed')) return;

    if (cell.classList.contains('flag')) {
        // Poista lippu
        cell.classList.remove('flag');
        cell.textContent = ''; // Tyhjennä teksti
        remainingFlags++;
    } else if (remainingFlags > 0) {
        // Aseta lippu
        cell.classList.add('flag');
        cell.textContent = '🚩';
        remainingFlags--;
    }

    // Päivitä jäljellä olevien lippujen määrä
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

        // Päivitä High Score paljastuksen jälkeen
        updateHighScore(); // Kutsu funktiota aina paljastuksen jälkeen
        checkWin(); // Tarkista, saavutettiinko voitto
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

// Lasketaan viereisten pommien määrä
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
    const userLoggedIn = !!localStorage.getItem('userLoggedIn'); // Tarkistetaan kirjautumistila

    if (userLoggedIn) {
        if (typeof forceShow === 'boolean') {
            // Näytä tai piilota hallintapaneeli riippuen "forceShow"-parametrista
            userPanel.style.display = forceShow ? 'block' : 'none';
        } else {
            // Näytetään tai piilotetaan nykytilan mukaan
            userPanel.style.display = userPanel.style.display === 'none' ? 'block' : 'none';
        }
    } else {
        // Piilotetaan, jos käyttäjä ei ole kirjautunut
        userPanel.style.display = 'none';
    }
}

// Paljasta turvallinen alue
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

// Päivitä pelitiedot
function updateGameInfo() {
    document.getElementById('bomb-count').textContent = totalBombs || 0;
    document.getElementById('flag-count').textContent = remainingFlags || 0;
}

// Näytä/piilota kirjautumisikkuna
function toggleAuth() {
    const authContainer = document.getElementById('auth');
    const userPanel = document.getElementById('user-panel');

    // Vaihdetaan vain kirjautumisruudun näkyvyyttä
    if (authContainer) {
        authContainer.style.display = authContainer.style.display === 'none' ? 'block' : 'none';

        // Jos kirjautumisruutu on näkyvissä, piilotetaan hallintapaneeli
        if (authContainer.style.display === 'block') {
            userPanel.style.display = 'none';
        }
    }
}

function toggleUserPanelVisibility(show) {
    const userPanel = document.getElementById('user-panel');
    const userLoggedIn = !!localStorage.getItem('userLoggedIn'); // Tarkistetaan kirjautumistieto

    if (!userLoggedIn || show === false) {
        userPanel.style.display = 'none'; // Piilotetaan hallintapaneeli, ellei käyttäjä ole kirjautunut
    } else if (show === true) {
        userPanel.style.display = 'block'; // Näytetään hallintapaneeli vain pyynnöstä
    }
}

// Esimerkki voittotarkistus ja pelin päättäminen
function endGame(won) {
    gameOver = true;
    document.getElementById('restart-btn').style.display = 'block'; // Näytä uudelleenkäynnistysnappi

    if (won) {
        alert('Voitit! Onnittelut!');
        updateHighScore(); // Päivitä High Score vain voiton yhteydessä
    } else {
        alert('Hävisit! Miina räjähti!');
        document.querySelectorAll('.cell[data-bomb="true"]').forEach(cell => {
            cell.textContent = '💣';
            cell.classList.add('revealed');
        });
    }
}
