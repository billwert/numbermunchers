/* =========================================
   SAFETY SQUARES - Protected Cells
   Troggles cannot enter these cells
   ========================================= */

const SafetySquares = {
    // Array of safety square objects with position and lifetime
    squares: [],

    // Maximum number of safety squares
    maxSquares: 3,

    // Lifetime range in ticks (not real-time, so pause doesn't affect it)
    minLifetimeTicks: 3,
    maxLifetimeTicks: 8,
    flashTicks: 1, // Flash warning in last tick before expiring

    // Initialize for a level
    init(level) {
        this.squares = [];

        // Start with 1 safety square, chance for more based on level
        const initialCount = Math.min(this.maxSquares, 1 + Math.floor(level / 5));

        for (let i = 0; i < initialCount; i++) {
            this.addSafetySquare();
        }
    },

    // Add a new safety square at random valid position
    addSafetySquare() {
        if (this.squares.length >= this.maxSquares) return false;

        // Build exclusion list: nosher, troggles, existing safety squares
        const exclude = this.squares.map(s => ({ x: s.x, y: s.y }));

        if (typeof Game !== 'undefined' && Game.nosher) {
            const mPos = Game.nosher.getPosition();
            exclude.push(mPos);
        }

        if (typeof Troggle !== 'undefined') {
            exclude.push(...Troggle.getPositions());
        }

        // Get random valid position
        if (typeof Grid !== 'undefined') {
            const pos = Grid.getRandomPosition(exclude);
            if (pos) {
                const lifetimeTicks = this.minLifetimeTicks + Math.floor(Math.random() * (this.maxLifetimeTicks - this.minLifetimeTicks + 1));
                const currentTick = (typeof GameLoop !== 'undefined') ? GameLoop.currentTick : 0;
                const square = {
                    x: pos.x,
                    y: pos.y,
                    lifetimeTicks: lifetimeTicks,
                    createdAtTick: currentTick
                };
                this.squares.push(square);
                Grid.markSafetySquare(pos.x, pos.y, true);
                return true;
            }
        }

        return false;
    },

    // Remove a safety square
    removeSafetySquare(x, y) {
        const index = this.squares.findIndex(s => s.x === x && s.y === y);
        if (index !== -1) {
            this.squares.splice(index, 1);
            if (typeof Grid !== 'undefined') {
                Grid.markSafetySquare(x, y, false);
            }
            return true;
        }
        return false;
    },

    // Check if position is a safety square
    isAt(x, y) {
        return this.squares.some(s => s.x === x && s.y === y);
    },

    // Update called each tick - check lifetimes and spawn new ones
    update() {
        const currentTick = (typeof GameLoop !== 'undefined') ? GameLoop.currentTick : 0;
        const toRemove = [];

        // Check each square's lifetime
        this.squares.forEach(sq => {
            const elapsedTicks = currentTick - sq.createdAtTick;
            const remainingTicks = sq.lifetimeTicks - elapsedTicks;

            if (remainingTicks <= 0) {
                // Expired - mark for removal
                toRemove.push(sq);
            } else if (remainingTicks <= this.flashTicks) {
                // Flash warning - about to expire
                Grid.markSafetySquareExpiring(sq.x, sq.y, true);
            }
        });

        // Remove expired squares
        toRemove.forEach(sq => {
            Grid.markSafetySquareExpiring(sq.x, sq.y, false);
            this.removeSafetySquare(sq.x, sq.y);
        });

        // If no safety squares, high chance to spawn one
        if (this.squares.length === 0) {
            if (Math.random() < 0.3) { // 30% chance per tick
                this.addSafetySquare();
            }
        }
        // If fewer than max, small chance to add more
        else if (this.squares.length < this.maxSquares) {
            // Decreasing probability for each additional square
            const chance = 0.05 / this.squares.length;
            if (Math.random() < chance) {
                this.addSafetySquare();
            }
        }
    },

    // Clear all safety squares
    clear() {
        this.squares.forEach(sq => {
            if (typeof Grid !== 'undefined') {
                Grid.markSafetySquare(sq.x, sq.y, false);
                Grid.markSafetySquareExpiring(sq.x, sq.y, false);
            }
        });
        this.squares = [];
    },

    // Get all safety square positions
    getPositions() {
        return this.squares.map(s => ({ x: s.x, y: s.y }));
    },

    // Get count
    getCount() {
        return this.squares.length;
    }
};
