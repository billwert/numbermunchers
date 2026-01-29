/* =========================================
   SAFETY SQUARES - Protected Cells
   Troggles cannot enter these cells
   ========================================= */

const SafetySquares = {
    // Array of safety square positions
    squares: [],

    // Maximum number of safety squares
    maxSquares: 3,

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

        // Build exclusion list: muncher, troggles, existing safety squares
        const exclude = [...this.squares];

        if (typeof Game !== 'undefined' && Game.muncher) {
            const mPos = Game.muncher.getPosition();
            exclude.push(mPos);
        }

        if (typeof Troggle !== 'undefined') {
            exclude.push(...Troggle.getPositions());
        }

        // Get random valid position
        if (typeof Grid !== 'undefined') {
            const pos = Grid.getRandomPosition(exclude);
            if (pos) {
                this.squares.push(pos);
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

    // Update called each tick - may spawn/remove safety squares
    update() {
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

        // Small chance for a safety square to disappear
        if (this.squares.length > 0 && Math.random() < 0.02) {
            const idx = Math.floor(Math.random() * this.squares.length);
            const sq = this.squares[idx];
            this.removeSafetySquare(sq.x, sq.y);
        }
    },

    // Clear all safety squares
    clear() {
        this.squares.forEach(sq => {
            if (typeof Grid !== 'undefined') {
                Grid.markSafetySquare(sq.x, sq.y, false);
            }
        });
        this.squares = [];
    },

    // Get all safety square positions
    getPositions() {
        return [...this.squares];
    },

    // Get count
    getCount() {
        return this.squares.length;
    }
};
