/* =========================================
   GRID - 6x5 Game Grid Management
   ========================================= */

const Grid = {
    COLS: 6,
    ROWS: 5,

    // Grid state: array of {value, isCorrect, munched}
    cells: [],

    // DOM element
    element: null,

    init() {
        this.element = document.getElementById('game-grid');
        this.createCells();
    },

    // Create the grid cell DOM elements
    createCells() {
        this.element.innerHTML = '';

        for (let y = 0; y < this.ROWS; y++) {
            for (let x = 0; x < this.COLS; x++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                // Random wiggle delay for animation variety
                cell.style.setProperty('--wiggle-delay', Math.floor(Math.random() * 20));

                // Add number span
                const numberSpan = document.createElement('span');
                numberSpan.className = 'number';
                cell.appendChild(numberSpan);

                // Click handler
                cell.addEventListener('click', () => {
                    if (typeof Game !== 'undefined' && Game.state === 'playing') {
                        const cellX = parseInt(cell.dataset.x);
                        const cellY = parseInt(cell.dataset.y);
                        Input.handleGridClick(cellX, cellY, Game.muncher.x, Game.muncher.y);
                    }
                });

                this.element.appendChild(cell);
            }
        }
    },

    // Populate grid with numbers for a level
    populate(level) {
        const numbers = Levels.generateGridNumbers(level, this.COLS * this.ROWS);
        this.cells = numbers.map((n, i) => ({
            ...n,
            munched: false,
            x: i % this.COLS,
            y: Math.floor(i / this.COLS)
        }));

        this.render();
    },

    // Render the grid
    render() {
        const cellElements = this.element.querySelectorAll('.grid-cell');

        cellElements.forEach((cell, i) => {
            const data = this.cells[i];
            const numberSpan = cell.querySelector('.number');

            // Reset classes
            cell.className = 'grid-cell';

            if (data.munched) {
                cell.classList.add('munched');
                numberSpan.textContent = '';
            } else {
                numberSpan.textContent = data.value;
            }
        });
    },

    // Get cell at position
    getCell(x, y) {
        if (x < 0 || x >= this.COLS || y < 0 || y >= this.ROWS) {
            return null;
        }
        return this.cells[y * this.COLS + x];
    },

    // Get DOM element for cell at position
    getCellElement(x, y) {
        return this.element.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    },

    // Munch a cell - returns {success, isCorrect, value}
    munchCell(x, y) {
        const cell = this.getCell(x, y);
        if (!cell || cell.munched) {
            return { success: false, isCorrect: false, value: null };
        }

        cell.munched = true;

        // Animate the cell
        const cellElement = this.getCellElement(x, y);
        if (cellElement) {
            cellElement.classList.add(cell.isCorrect ? 'correct-munch' : 'incorrect-munch');
            cellElement.classList.add('munched');

            // Remove animation class after it completes
            setTimeout(() => {
                cellElement.classList.remove('correct-munch', 'incorrect-munch');
            }, 300);
        }

        return {
            success: true,
            isCorrect: cell.isCorrect,
            value: cell.value
        };
    },

    // Check if all correct numbers have been munched
    allCorrectMunched() {
        return this.cells.every(cell => !cell.isCorrect || cell.munched);
    },

    // Count remaining correct numbers
    countRemainingCorrect() {
        return this.cells.filter(cell => cell.isCorrect && !cell.munched).length;
    },

    // Update muncher position display
    updateMuncherPosition(x, y, prevX, prevY) {
        // Remove muncher from previous cell
        if (prevX !== undefined && prevY !== undefined) {
            const prevCell = this.getCellElement(prevX, prevY);
            if (prevCell) {
                prevCell.classList.remove('has-muncher');
            }
        }

        // Add muncher to new cell
        const newCell = this.getCellElement(x, y);
        if (newCell) {
            newCell.classList.add('has-muncher');
        }
    },

    // Update Troggle positions display
    updateTroggles(troggles) {
        // Clear all Troggle markers
        this.element.querySelectorAll('.has-troggle').forEach(cell => {
            cell.classList.remove('has-troggle');
        });

        // Add Troggle to each position
        troggles.forEach(troggle => {
            const cell = this.getCellElement(troggle.x, troggle.y);
            if (cell) {
                cell.classList.add('has-troggle');
            }
        });
    },

    // Highlight muncher cell on successful munch
    celebrateMunch(x, y) {
        const cell = this.getCellElement(x, y);
        if (cell) {
            cell.classList.add('muncher-happy');
            setTimeout(() => {
                cell.classList.remove('muncher-happy');
            }, 400);
        }
    },

    // Check if position is valid
    isValidPosition(x, y) {
        return x >= 0 && x < this.COLS && y >= 0 && y < this.ROWS;
    },

    // Get random empty position (for spawning)
    getRandomPosition(excludePositions = []) {
        const available = [];

        for (let y = 0; y < this.ROWS; y++) {
            for (let x = 0; x < this.COLS; x++) {
                const isExcluded = excludePositions.some(p => p.x === x && p.y === y);
                if (!isExcluded) {
                    available.push({ x, y });
                }
            }
        }

        if (available.length === 0) {
            return { x: 0, y: 0 };
        }

        return available[Math.floor(Math.random() * available.length)];
    }
};
