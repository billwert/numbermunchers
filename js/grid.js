/* =========================================
   GRID - 6x5 Game Grid Management
   ========================================= */

const Grid = {
    COLS: 6,
    ROWS: 5,

    // Grid state: array of {value, isCorrect, munched}
    cells: [],

    // DOM elements
    element: null,
    muncherSprite: null,

    // Cell dimensions (calculated from CSS)
    cellSize: 60,
    gridGap: 4,
    gridPadding: 10,

    // Detect touch device
    isTouchDevice() {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    },

    init() {
        this.element = document.getElementById('game-grid');
        this.muncherSprite = document.getElementById('muncher-sprite');
        this.createCells();
        this.calculateDimensions();
        this.setupResizeHandler();
    },

    // Set up window resize handler
    setupResizeHandler() {
        window.addEventListener('resize', () => {
            this.scaleToViewport();
        });
        // Initial scale
        this.scaleToViewport();
    },

    // Scale the grid to fill the viewport
    scaleToViewport() {
        const gameScreen = document.getElementById('game-screen');
        if (!gameScreen.classList.contains('active')) return;

        const header = document.querySelector('.game-header');
        
        // Get available space
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 20; // Padding around edges
        
        // Calculate header height
        const headerHeight = header ? header.offsetHeight + 15 : 0; // +15 for gap
        
        // Available space for grid (no touch controls anymore)
        const availableWidth = viewportWidth - padding * 2;
        const availableHeight = viewportHeight - headerHeight - padding * 2;
        
        // Grid has 6 columns, 5 rows, gaps, padding, and border
        const gridPadding = 10;
        const gridBorder = 3;
        const gap = Math.max(2, Math.min(6, availableWidth * 0.005));
        
        // Calculate cell size to fit
        const cellFromWidth = (availableWidth - gridPadding * 2 - gridBorder * 2 - gap * 5) / 6;
        const cellFromHeight = (availableHeight - gridPadding * 2 - gridBorder * 2 - gap * 4) / 5;
        
        const cellSize = Math.floor(Math.min(cellFromWidth, cellFromHeight));
        
        // Set CSS variable
        document.documentElement.style.setProperty('--cell-size', cellSize + 'px');
        document.documentElement.style.setProperty('--grid-gap', gap + 'px');
        
        // Update cached dimensions
        this.cellSize = cellSize;
        this.gridGap = gap;
        
        // Update muncher position if game is active
        if (typeof Game !== 'undefined' && Game.muncher) {
            const pos = Game.muncher.getPosition();
            this.updateMuncherPosition(pos.x, pos.y);
        }
    },

    // Calculate cell dimensions from computed styles
    calculateDimensions() {
        const computedStyle = getComputedStyle(document.documentElement);
        const cellSizeStr = computedStyle.getPropertyValue('--cell-size').trim();

        // Parse cell size (handles both px values and min() functions)
        if (cellSizeStr.includes('px')) {
            this.cellSize = parseInt(cellSizeStr);
        } else {
            // Fallback: measure first cell after rendering
            setTimeout(() => {
                const firstCell = this.element.querySelector('.grid-cell');
                if (firstCell) {
                    this.cellSize = firstCell.offsetWidth;
                }
            }, 0);
        }

        this.gridGap = parseInt(computedStyle.getPropertyValue('--grid-gap')) || 4;
        this.gridPadding = 10; // From CSS
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

                // Click/tap handler - works for both mouse and touch
                cell.addEventListener('click', () => {
                    if (typeof Game !== 'undefined' && Game.state === 'playing') {
                        const cellX = parseInt(cell.dataset.x);
                        const cellY = parseInt(cell.dataset.y);

                        // If clicking on muncher's current cell, munch
                        if (cellX === Game.muncher.x && cellY === Game.muncher.y) {
                            if (Input.onAction) Input.onAction();
                        }
                        // On touch devices or with autopilot enabled, path to any cell
                        else if (this.isTouchDevice() || Game.mouseAutopilot) {
                            if (typeof Pathfinding !== 'undefined') {
                                Pathfinding.handleAutopilotClick(cellX, cellY);
                            }
                        }
                        // Otherwise normal click: move to adjacent only
                        else {
                            Input.handleGridClick(cellX, cellY, Game.muncher.x, Game.muncher.y);
                        }
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

        // Animate the number flying to muncher's mouth
        const cellElement = this.getCellElement(x, y);
        if (cellElement) {
            const numberSpan = cellElement.querySelector('.number');
            if (numberSpan && numberSpan.textContent) {
                this.animateNumberToMouth(cellElement, numberSpan.textContent);
            }
        }

        cell.munched = true;

        // Animate the cell
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

    // Animate number flying into muncher's mouth
    animateNumberToMouth(cellElement, value) {
        // Create flying number element
        const flyingNumber = document.createElement('div');
        flyingNumber.className = 'flying-number';
        flyingNumber.textContent = value;
        
        // Get cell position
        const cellRect = cellElement.getBoundingClientRect();
        const gridRect = this.element.getBoundingClientRect();
        
        // Position at cell center (relative to grid wrapper)
        const startX = cellRect.left - gridRect.left + cellRect.width / 2;
        const startY = cellRect.top - gridRect.top + cellRect.height / 2;
        
        flyingNumber.style.left = startX + 'px';
        flyingNumber.style.top = startY + 'px';
        flyingNumber.style.transform = 'translate(-50%, -50%)';
        
        // Calculate destination (muncher's mouth)
        // Muncher body is 80% of cell, centered. Mouth is at bottom: 18% of body.
        // So mouth center is roughly at: 10% (top margin) + 80% * 0.75 = 70% from top
        const muncherRect = this.muncherSprite.getBoundingClientRect();
        const mouthX = muncherRect.left - gridRect.left + muncherRect.width / 2;
        const mouthY = muncherRect.top - gridRect.top + muncherRect.height * 0.6;
        
        // Set CSS variables for animation
        const flyX = mouthX - startX;
        const flyY = mouthY - startY;
        flyingNumber.style.setProperty('--fly-x', flyX + 'px');
        flyingNumber.style.setProperty('--fly-y', flyY + 'px');
        
        // Add to grid wrapper
        this.element.parentElement.appendChild(flyingNumber);
        
        // Open muncher's mouth
        this.muncherSprite.classList.add('eating');
        
        // Trigger animation
        requestAnimationFrame(() => {
            flyingNumber.classList.add('animate');
        });
        
        // Remove after animation
        setTimeout(() => {
            flyingNumber.remove();
            this.muncherSprite.classList.remove('eating');
        }, 300);
    },

    // Check if all correct numbers have been munched
    allCorrectMunched() {
        return this.cells.every(cell => !cell.isCorrect || cell.munched);
    },

    // Count remaining correct numbers
    countRemainingCorrect() {
        return this.cells.filter(cell => cell.isCorrect && !cell.munched).length;
    },

    // Update muncher position display (sprite-based for smooth animation)
    updateMuncherPosition(x, y, prevX, prevY) {
        // Remove highlight from previous cell
        if (prevX !== undefined && prevY !== undefined) {
            const prevCell = this.getCellElement(prevX, prevY);
            if (prevCell) {
                prevCell.classList.remove('muncher-cell');
            }
        }

        // Add highlight to new cell
        const newCell = this.getCellElement(x, y);
        if (newCell) {
            newCell.classList.add('muncher-cell');
        }

        // Move the sprite with CSS transform
        if (this.muncherSprite) {
            const pixelPos = this.getPixelPosition(x, y);
            const transform = `translate(${pixelPos.x}px, ${pixelPos.y}px)`;
            this.muncherSprite.style.transform = transform;
            // Store current transform for animations
            this.muncherSprite.style.setProperty('--current-transform', transform);

            // Add transparency when over an unmunched cell (has a number visible)
            const currentCell = this.getCell(x, y);
            if (currentCell && !currentCell.munched) {
                this.muncherSprite.classList.add('over-number');
            } else {
                this.muncherSprite.classList.remove('over-number');
            }
        }
    },

    // Calculate pixel position for a grid cell
    getPixelPosition(x, y) {
        // Recalculate cell size if needed (handles responsive sizing)
        const firstCell = this.element.querySelector('.grid-cell');
        if (firstCell) {
            this.cellSize = firstCell.offsetWidth;
            this.gridGap = parseInt(getComputedStyle(this.element).gap) || 4;
        }
        
        // Account for grid border (3px) + padding (dynamic)
        const gridBorder = 3;
        const gridPadding = parseInt(getComputedStyle(this.element).padding) || 10;
        const offset = gridPadding + gridBorder;

        return {
            x: offset + x * (this.cellSize + this.gridGap),
            y: offset + y * (this.cellSize + this.gridGap)
        };
    },

    // Update Troggle positions display
    updateTroggles(troggles) {
        // Clear all Troggle markers and type classes
        this.element.querySelectorAll('.has-troggle').forEach(cell => {
            cell.classList.remove('has-troggle', 'troggle-reggie', 'troggle-bashful',
                'troggle-helper', 'troggle-worker', 'troggle-smartie');
            cell.removeAttribute('data-troggle-emoji');
        });

        // Add Troggle to each position
        troggles.forEach(troggle => {
            const cell = this.getCellElement(troggle.x, troggle.y);
            if (cell) {
                cell.classList.add('has-troggle');
                // Add type-specific class
                if (troggle.type) {
                    cell.classList.add(`troggle-${troggle.type}`);
                }
                // Set emoji for CSS to use
                if (troggle.emoji) {
                    cell.setAttribute('data-troggle-emoji', troggle.emoji);
                }
            }
        });
    },

    // Celebrate muncher on successful munch (animate the sprite)
    celebrateMunch() {
        if (this.muncherSprite) {
            this.muncherSprite.classList.add('happy');
            setTimeout(() => {
                this.muncherSprite.classList.remove('happy');
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
    },

    // Mark/unmark a cell as a safety square
    markSafetySquare(x, y, active) {
        const cell = this.getCellElement(x, y);
        if (cell) {
            if (active) {
                cell.classList.add('safety-square');
            } else {
                cell.classList.remove('safety-square');
            }
        }
    },

    // Show spawn warning indicator at position
    showSpawnWarning(x, y) {
        const cell = this.getCellElement(x, y);
        if (cell) {
            cell.classList.add('spawn-warning');
        }
    },

    // Hide spawn warning indicator at position
    hideSpawnWarning(x, y) {
        const cell = this.getCellElement(x, y);
        if (cell) {
            cell.classList.remove('spawn-warning');
        }
    },

    // Clear all safety squares and spawn warnings
    clearSpecialCells() {
        this.element.querySelectorAll('.safety-square').forEach(cell => {
            cell.classList.remove('safety-square');
        });
        this.element.querySelectorAll('.spawn-warning').forEach(cell => {
            cell.classList.remove('spawn-warning');
        });
    }
};
