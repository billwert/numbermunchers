/* =========================================
   TROGGLE - Enemy AI (Reggies for v1)
   Reggies move in straight lines, bounce off edges
   ========================================= */

const Troggle = {
    // Array of active Troggles
    troggles: [],

    // Movement timer
    moveInterval: null,
    baseSpeed: 1000, // ms between moves

    // Directions
    DIRECTIONS: ['up', 'down', 'left', 'right'],

    init() {
        this.troggles = [];
    },

    // Spawn Troggles for a level
    spawn(count, excludePositions = []) {
        this.troggles = [];

        for (let i = 0; i < count; i++) {
            // Get position away from excluded positions (muncher)
            const pos = Grid.getRandomPosition([
                ...excludePositions,
                ...this.troggles.map(t => ({ x: t.x, y: t.y }))
            ]);

            this.troggles.push({
                x: pos.x,
                y: pos.y,
                direction: this.DIRECTIONS[Math.floor(Math.random() * this.DIRECTIONS.length)],
                id: i
            });
        }

        Grid.updateTroggles(this.troggles);
    },

    // Start Troggle movement
    startMovement(speedMultiplier = 1) {
        this.stopMovement();

        const interval = Math.max(300, this.baseSpeed / speedMultiplier);

        this.moveInterval = setInterval(() => {
            this.moveAll();
        }, interval);
    },

    // Stop Troggle movement
    stopMovement() {
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
    },

    // Move all Troggles
    moveAll() {
        this.troggles.forEach(troggle => {
            this.moveTroggle(troggle);
        });

        Grid.updateTroggles(this.troggles);

        // Check for collision with muncher
        if (typeof Game !== 'undefined') {
            Game.checkTroggleCollision();
        }
    },

    // Move a single Troggle (Reggie behavior: straight line, bounce)
    moveTroggle(troggle) {
        let { x, y, direction } = troggle;
        let newX = x;
        let newY = y;

        // Calculate new position
        switch (direction) {
            case 'up':
                newY = y - 1;
                break;
            case 'down':
                newY = y + 1;
                break;
            case 'left':
                newX = x - 1;
                break;
            case 'right':
                newX = x + 1;
                break;
        }

        // Check if new position is valid
        if (Grid.isValidPosition(newX, newY)) {
            troggle.x = newX;
            troggle.y = newY;
        } else {
            // Bounce off edge - reverse direction
            troggle.direction = this.reverseDirection(direction);

            // Try to move in new direction
            switch (troggle.direction) {
                case 'up':
                    newY = y - 1;
                    newX = x;
                    break;
                case 'down':
                    newY = y + 1;
                    newX = x;
                    break;
                case 'left':
                    newX = x - 1;
                    newY = y;
                    break;
                case 'right':
                    newX = x + 1;
                    newY = y;
                    break;
            }

            if (Grid.isValidPosition(newX, newY)) {
                troggle.x = newX;
                troggle.y = newY;
            }
            // If still invalid, Troggle stays in place (corner case)
        }

        // Small chance to randomly change direction (adds unpredictability)
        if (Math.random() < 0.1) {
            troggle.direction = this.DIRECTIONS[Math.floor(Math.random() * this.DIRECTIONS.length)];
        }
    },

    // Reverse a direction
    reverseDirection(direction) {
        const opposites = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
        };
        return opposites[direction];
    },

    // Check if any Troggle is at position
    isAtPosition(x, y) {
        return this.troggles.some(t => t.x === x && t.y === y);
    },

    // Get all Troggle positions
    getPositions() {
        return this.troggles.map(t => ({ x: t.x, y: t.y }));
    },

    // Clear all Troggles
    clear() {
        this.stopMovement();
        this.troggles = [];
        Grid.updateTroggles([]);
    }
};
