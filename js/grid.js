/* =========================================
   GRID - 6x5 Game Grid Management
   ========================================= */

const Grid = {
    COLS: 6,
    ROWS: 5,

    // Grid state: array of {value, isCorrect, noshed}
    cells: [],

    // DOM elements
    element: null,
    nosherSprite: null,

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
        this.nosherSprite = document.getElementById('nosher-sprite');
        this.createCells();
        this.calculateDimensions();
        this.setupResizeHandler();
    },

    // Set up window resize handler with debouncing for orientation changes
    setupResizeHandler() {
        let resizeTimer = null;
        let orientationTimer = null;
        
        // Debounced resize handler
        const handleResize = () => {
            // Clear any pending resize
            if (resizeTimer) clearTimeout(resizeTimer);
            
            // Wait for layout to settle (150ms debounce)
            resizeTimer = setTimeout(() => {
                // Use requestAnimationFrame to ensure DOM is ready
                requestAnimationFrame(() => {
                    this.scaleToViewport();
                });
            }, 150);
        };
        
        // Orientation change needs longer delay
        const handleOrientation = () => {
            // Clear any pending orientation change
            if (orientationTimer) clearTimeout(orientationTimer);
            
            // Wait longer for orientation (300ms) as it's more disruptive
            orientationTimer = setTimeout(() => {
                requestAnimationFrame(() => {
                    // Force a double-check by reading dimensions first
                    const gameArea = document.querySelector('.game-area');
                    if (gameArea) {
                        // Force reflow by reading a layout property
                        void gameArea.offsetHeight;
                    }
                    this.scaleToViewport();
                });
            }, 300);
        };
        
        // Listen to both events
        window.addEventListener('resize', handleResize);
        
        // Orientation change is more critical for mobile
        if ('onorientationchange' in window) {
            window.addEventListener('orientationchange', handleOrientation);
        }
        
        // Also listen to screen.orientation API if available (more reliable)
        if (window.screen?.orientation) {
            window.screen.orientation.addEventListener('change', handleOrientation);
        }
        
        // Initial scale (with small delay to ensure DOM ready)
        setTimeout(() => {
            requestAnimationFrame(() => {
                this.scaleToViewport();
            });
        }, 100);
    },

    // Scale the grid to fill the viewport
    // 
    // KEY INSIGHT: CSS perspective distorts the grid - points closer to the viewer
    // appear larger. We must project corners through perspective to find the TRUE
    // visual bounding box and center.
    //
    scaleToViewport() {
        const gameScreen = document.getElementById('game-screen');
        if (!gameScreen.classList.contains('active')) return;

        const gameArea = document.querySelector('.game-area');
        if (!gameArea) return;

        const availableWidth = gameArea.clientWidth;
        const availableHeight = gameArea.clientHeight;
        
        // Safety check: skip if dimensions are too small (can happen mid-rotation)
        if (availableWidth < 100 || availableHeight < 100) {
            return;  // Will retry on next resize event
        }
        
        const padding = 20;

        // Read current preset and perspective
        const style = getComputedStyle(document.documentElement);
        const preset = parseInt(style.getPropertyValue('--iso-preset')) || 4;
        const perspective = parseFloat(style.getPropertyValue('--iso-perspective')) || 800;
        const isoScale = parseFloat(style.getPropertyValue('--iso-scale')) || 1;

        // Presets: [rotateX, rotateZ, name]
        const presets = [
            [0, 0, 'Flat (2D)'],
            [30, 0, 'Slight Tilt'],
            [45, 0, 'Medium Tilt'],
            [55, 0, 'Classic Iso'],
            [55, 45, 'Diamond'],
        ];

        const [rotXDeg, rotZDeg, presetName] = presets[preset - 1] || presets[0];
        const rotX = rotXDeg * Math.PI / 180;
        const rotZ = rotZDeg * Math.PI / 180;

        // Grid layout constants
        const gridPadding = 10;
        const gridBorder = 3;
        const gap = Math.max(2, Math.min(6, availableWidth * 0.005));
        const fixedOverhead = gridPadding * 2 + gridBorder * 2;
        const gapW = 5 * gap + fixedOverhead;
        const gapH = 4 * gap + fixedOverhead;

        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const cosZ = Math.cos(rotZ);
        const sinZ = Math.sin(rotZ);

        const is3DMode = rotXDeg !== 0 || rotZDeg !== 0;

        // Transform a point through rotateX, rotateZ, then perspective projection
        // Input: (x, y) in grid plane (z=0), relative to grid center
        // Output: (screenX, screenY) after perspective projection
        const projectPoint = (x, y) => {
            // After rotateX(rx): the point rotates around X axis
            // y' = y * cos(rx), z' = y * sin(rx)
            // (top of grid goes back into screen, bottom comes forward)
            const y1 = y * cosX;
            const z1 = y * sinX;  // positive = closer to viewer

            // After rotateZ(rz): rotate around Z axis in XY plane
            const x2 = x * cosZ - y1 * sinZ;
            const y2 = x * sinZ + y1 * cosZ;
            const z2 = z1;  // Z unchanged by rotateZ

            // Perspective projection: scale = P / (P - z)
            // Points with positive z (closer) get scale > 1 (appear larger)
            const scale = perspective / (perspective - z2);
            
            return {
                x: x2 * scale,
                y: y2 * scale,
                z: z2,
                scale: scale
            };
        };

        // Calculate visual bounding box for a given cell size
        // Returns the bounding box in screen space AFTER perspective projection
        const computeProjectedBoundingBox = (cellSize) => {
            const gridW = 6 * cellSize + gapW;
            const gridH = 5 * cellSize + gapH;
            const halfW = gridW / 2;
            const halfH = gridH / 2;

            // Four corners of grid in grid-plane coordinates (before any transform)
            const corners = [
                { x: -halfW, y: -halfH },  // top-left
                { x:  halfW, y: -halfH },  // top-right
                { x:  halfW, y:  halfH },  // bottom-right
                { x: -halfW, y:  halfH },  // bottom-left
            ];

            // Project each corner through the full transform chain
            const projected = corners.map(c => projectPoint(c.x, c.y));

            // Find bounding box of projected points
            const xs = projected.map(p => p.x);
            const ys = projected.map(p => p.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);

            return {
                width: maxX - minX,
                height: maxY - minY,
                // Visual center (center of projected bounding box) relative to grid center
                centerX: (minX + maxX) / 2,
                centerY: (minY + maxY) / 2,
                // For debugging
                corners: projected
            };
        };

        // Binary search for largest cell size that fits
        const targetW = (availableWidth - padding * 2) / isoScale;
        const targetH = (availableHeight - padding * 2) / isoScale;

        let lo = 30, hi = 300;
        while (hi - lo > 1) {
            const mid = Math.floor((lo + hi) / 2);
            const bb = computeProjectedBoundingBox(mid);
            if (bb.width <= targetW && bb.height <= targetH) {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        const cellSize = lo;

        // Compute final bounding box
        const bb = computeProjectedBoundingBox(cellSize);

        // The visual center (after perspective) is offset from grid center.
        // To center the visual, we offset the grid position by the negative of this.
        // These offsets are in screen space, so we apply them via CSS left/top.
        const offsetX = -bb.centerX * isoScale;
        const offsetY = -bb.centerY * isoScale;

        // Set CSS variables
        document.documentElement.style.setProperty('--cell-size', cellSize + 'px');
        document.documentElement.style.setProperty('--grid-gap', gap + 'px');
        document.documentElement.style.setProperty('--iso-rotate-x', rotXDeg + 'deg');
        document.documentElement.style.setProperty('--iso-rotate-z', rotZDeg + 'deg');
        document.documentElement.style.setProperty('--iso-effective-scale', isoScale);
        document.documentElement.style.setProperty('--iso-offset-x', offsetX + 'px');
        document.documentElement.style.setProperty('--iso-offset-y', offsetY + 'px');
        document.documentElement.style.setProperty('--iso-3d-mode', is3DMode ? '1' : '0');
        this.element.classList.toggle('iso-3d-mode', is3DMode);

        this.cellSize = cellSize;
        this.gridGap = gap;

        if (typeof Game !== 'undefined' && Game.nosher) {
            const pos = Game.nosher.getPosition();
            this.updateNosherPosition(pos.x, pos.y);
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

                        // If clicking on nosher's current cell, nosh
                        if (cellX === Game.nosher.x && cellY === Game.nosher.y) {
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
                            Input.handleGridClick(cellX, cellY, Game.nosher.x, Game.nosher.y);
                        }
                    }
                });

                this.element.appendChild(cell);
            }
        }
    },

    // Populate grid with numbers for a level
    populate(level, mode) {
        const numbers = Levels.generateGridNumbers(level, this.COLS * this.ROWS, mode);
        this.cells = numbers.map((n, i) => ({
            ...n,
            noshed: false,
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

            if (data.noshed) {
                cell.classList.add('noshed');
                numberSpan.textContent = '';
            } else {
                numberSpan.textContent = data.value;
                // Add expression class for wider values (equality/inequality modes)
                if (typeof data.value === 'string' && data.value.length > 3) {
                    cell.classList.add('expression-cell');
                }
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

    // Nosh a cell - returns {success, isCorrect, value}
    noshCell(x, y) {
        const cell = this.getCell(x, y);
        if (!cell || cell.noshed) {
            return { success: false, isCorrect: false, value: null };
        }

        // Animate the number flying to nosher's mouth
        const cellElement = this.getCellElement(x, y);
        if (cellElement) {
            const numberSpan = cellElement.querySelector('.number');
            if (numberSpan && numberSpan.textContent) {
                this.animateNumberToMouth(cellElement, numberSpan.textContent);
            }
        }

        cell.noshed = true;

        // Animate the cell
        if (cellElement) {
            cellElement.classList.add(cell.isCorrect ? 'correct-nosh' : 'incorrect-nosh');
            cellElement.classList.add('noshed');

            // Remove animation class after it completes
            setTimeout(() => {
                cellElement.classList.remove('correct-nosh', 'incorrect-nosh');
            }, 300);
        }

        return {
            success: true,
            isCorrect: cell.isCorrect,
            value: cell.value
        };
    },

    // Animate number flying into nosher's mouth
    animateNumberToMouth(cellElement, value) {
        // Create flying number element
        const flyingNumber = document.createElement('div');
        flyingNumber.className = 'flying-number';
        flyingNumber.textContent = value;

        // Use grid-based coordinates (pre-transform space) instead of
        // getBoundingClientRect (post-transform screen space), so the
        // animation works correctly with isometric 3D transforms.
        const cellX = parseInt(cellElement.dataset.x);
        const cellY = parseInt(cellElement.dataset.y);
        const cellPos = this.getPixelPosition(cellX, cellY);
        const halfCell = this.cellSize / 2;
        const startX = cellPos.x + halfCell;
        const startY = cellPos.y + halfCell;

        flyingNumber.style.left = startX + 'px';
        flyingNumber.style.top = startY + 'px';
        flyingNumber.style.transform = 'translate(-50%, -50%)';

        // Calculate destination (nosher's mouth) using grid coordinates
        const nosherPos = this.getPixelPosition(Game.nosher.x, Game.nosher.y);
        const mouthX = nosherPos.x + halfCell;
        const mouthY = nosherPos.y + this.cellSize * 0.6;

        // Set CSS variables for animation
        const flyX = mouthX - startX;
        const flyY = mouthY - startY;
        flyingNumber.style.setProperty('--fly-x', flyX + 'px');
        flyingNumber.style.setProperty('--fly-y', flyY + 'px');

        // Add to grid wrapper
        this.element.parentElement.appendChild(flyingNumber);

        // Open nosher's mouth
        this.nosherSprite.classList.add('eating');

        // Trigger animation
        requestAnimationFrame(() => {
            flyingNumber.classList.add('animate');
        });

        // Remove after animation
        setTimeout(() => {
            flyingNumber.remove();
            this.nosherSprite.classList.remove('eating');
        }, 300);
    },

    // Check if all correct numbers have been noshed
    allCorrectNoshed() {
        return this.cells.every(cell => !cell.isCorrect || cell.noshed);
    },

    // Count remaining correct numbers
    countRemainingCorrect() {
        return this.cells.filter(cell => cell.isCorrect && !cell.noshed).length;
    },

    // Update nosher position display (sprite-based for smooth animation)
    updateNosherPosition(x, y, prevX, prevY) {
        // Remove highlight from previous cell
        if (prevX !== undefined && prevY !== undefined) {
            const prevCell = this.getCellElement(prevX, prevY);
            if (prevCell) {
                prevCell.classList.remove('nosher-cell');
            }
        }

        // Add highlight to new cell
        const newCell = this.getCellElement(x, y);
        if (newCell) {
            newCell.classList.add('nosher-cell');
        }

        // Move the sprite with CSS transform, counter-rotating to stay upright
        if (this.nosherSprite) {
            const pixelPos = this.getPixelPosition(x, y);
            // Read isometric angles for counter-rotation (billboard sprite)
            const style = getComputedStyle(document.documentElement);
            const rx = parseFloat(style.getPropertyValue('--iso-rotate-x')) || 0;
            const rz = parseFloat(style.getPropertyValue('--iso-rotate-z')) || 0;
            
            // 2D/3D mode: In 3D mode (any rotation), pin bottom of sprite to cell center
            // In 2D mode (no rotation), center sprite on cell center
            const is3DMode = rx !== 0 || rz !== 0;
            const halfCell = this.cellSize / 2;
            
            // In 3D mode, shift sprite up by half its height so bottom aligns with cell center
            const yOffset = is3DMode ? -halfCell : 0;
            
            const transform = `translate(${pixelPos.x}px, ${pixelPos.y + yOffset}px) rotateZ(${-rz}deg) rotateX(${-rx}deg)`;
            this.nosherSprite.style.transform = transform;
            // Store current transform for animations (bounce composites on top)
            this.nosherSprite.style.setProperty('--current-transform', transform);
            
            // Toggle 3D mode class for CSS adjustments
            this.nosherSprite.classList.toggle('iso-3d-mode', is3DMode);

            // Add transparency when over an unnoshed cell (has a number visible)
            const currentCell = this.getCell(x, y);
            if (currentCell && !currentCell.noshed) {
                this.nosherSprite.classList.add('over-number');
            } else {
                this.nosherSprite.classList.remove('over-number');
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

    // Celebrate nosher on successful nosh (animate the sprite)
    celebrateNosh() {
        if (this.nosherSprite) {
            this.nosherSprite.classList.add('happy');
            setTimeout(() => {
                this.nosherSprite.classList.remove('happy');
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
                cell.classList.remove('expiring');
            }
        }
    },

    // Mark/unmark a safety square as expiring (flashing)
    markSafetySquareExpiring(x, y, expiring) {
        const cell = this.getCellElement(x, y);
        if (cell) {
            if (expiring) {
                cell.classList.add('expiring');
            } else {
                cell.classList.remove('expiring');
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
            cell.classList.remove('expiring');
        });
        this.element.querySelectorAll('.spawn-warning').forEach(cell => {
            cell.classList.remove('spawn-warning');
        });
    }
};
