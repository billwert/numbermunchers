/* =========================================
   TROGGLE - Enemy AI System
   Types: Reggie, Bashful, Helper, Worker, Smartie
   ========================================= */

// Troggle type constants
const TroggleType = {
    REGGIE: 'reggie',     // Linear movement, bounce off edges
    BASHFUL: 'bashful',   // Random movement, flees when Muncher approaches
    HELPER: 'helper',     // Eats answers (removes from board)
    WORKER: 'worker',     // Adds/modifies answers
    SMARTIE: 'smartie'    // A* pathfinding pursuit of Muncher
};

// Emoji for each type
const TroggleEmoji = {
    reggie: '👾',
    bashful: '👻',
    helper: '🐛',
    worker: '🔧',
    smartie: '🤖'
};

const Troggle = {
    // Array of active Troggles
    troggles: [],

    // Movement timer (kept for backward compatibility, but GameLoop now manages this)
    moveInterval: null,
    baseSpeed: 1000, // ms between moves

    // Directions
    DIRECTIONS: ['up', 'down', 'left', 'right'],

    // Next ID for new troggles
    nextId: 0,

    init() {
        this.troggles = [];
        this.nextId = 0;
    },

    // Spawn Troggles for a level (legacy method - spawns all at once)
    spawn(count, excludePositions = []) {
        this.troggles = [];
        this.nextId = 0;

        for (let i = 0; i < count; i++) {
            // Get position away from excluded positions (muncher)
            const pos = Grid.getRandomPosition([
                ...excludePositions,
                ...this.troggles.map(t => ({ x: t.x, y: t.y }))
            ]);

            this.troggles.push({
                x: pos.x,
                y: pos.y,
                type: TroggleType.REGGIE, // Default to Reggie for legacy spawns
                direction: this.DIRECTIONS[Math.floor(Math.random() * this.DIRECTIONS.length)],
                id: this.nextId++,
                emoji: TroggleEmoji.reggie
            });
        }

        Grid.updateTroggles(this.troggles);
    },

    // Add a single Troggle (used by TroggleSpawner)
    addTroggle(troggle) {
        troggle.id = this.nextId++;
        this.troggles.push(troggle);
        Grid.updateTroggles(this.troggles);
    },

    // Remove a Troggle by ID
    removeTroggle(id) {
        const index = this.troggles.findIndex(t => t.id === id);
        if (index !== -1) {
            this.troggles.splice(index, 1);
            Grid.updateTroggles(this.troggles);
        }
    },

    // Start Troggle movement (legacy - for backward compatibility)
    startMovement(speedMultiplier = 1) {
        // If GameLoop is available, use it instead
        if (typeof GameLoop !== 'undefined') {
            const level = typeof Game !== 'undefined' ? Game.level : 1;
            GameLoop.start(level);
            return;
        }

        // Fallback to old interval-based movement
        this.stopMovement();
        const interval = Math.max(300, this.baseSpeed / speedMultiplier);
        this.moveInterval = setInterval(() => {
            this.moveAll();
        }, interval);
    },

    // Stop Troggle movement (legacy - for backward compatibility)
    stopMovement() {
        // If GameLoop is available, pause it instead
        if (typeof GameLoop !== 'undefined') {
            GameLoop.pause();
            return;
        }

        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
    },

    // Move all Troggles (legacy method - now called by GameLoop)
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

    /* =========================================
       COORDINATED MOVEMENT (for GameLoop)
       ========================================= */

    // Plan moves for all Troggles (returns array of planned moves)
    planMoves() {
        return this.troggles.map(troggle => {
            const planned = this.planTroggleMove(troggle);
            return {
                id: troggle.id,
                currentX: troggle.x,
                currentY: troggle.y,
                targetX: planned.x,
                targetY: planned.y,
                newDirection: planned.direction,
                offBoard: planned.offBoard || false
            };
        });
    },

    // Plan a single Troggle's move based on its type
    planTroggleMove(troggle) {
        switch (troggle.type) {
            case TroggleType.BASHFUL:
                return this.planBashfulMove(troggle);
            case TroggleType.HELPER:
                return this.planHelperMove(troggle);
            case TroggleType.WORKER:
                return this.planWorkerMove(troggle);
            case TroggleType.SMARTIE:
                return this.planSmartieMove(troggle);
            case TroggleType.REGGIE:
            default:
                return this.planReggieMove(troggle);
        }
    },

    // Execute planned moves
    executeMoves(plannedMoves) {
        const toRemove = [];

        plannedMoves.forEach(move => {
            const troggle = this.troggles.find(t => t.id === move.id);
            if (!troggle) return;

            // Check if troggle walked off board
            if (move.offBoard) {
                toRemove.push(move.id);
                return;
            }

            // Update position
            troggle.x = move.targetX;
            troggle.y = move.targetY;
            if (move.newDirection) {
                troggle.direction = move.newDirection;
            }

            // Worker special action: may restore a munched cell
            if (troggle.type === TroggleType.WORKER && Math.random() < 0.15) {
                this.workerAction(troggle);
            }

            // Helper special action: eat the number in current cell
            if (troggle.type === TroggleType.HELPER) {
                this.helperAction(troggle);
            }
        });

        // Remove troggles that walked off board
        toRemove.forEach(id => this.removeTroggle(id));
    },

    // Check for Troggle-on-Troggle collisions (they can eat each other)
    checkTroggleCollisions() {
        const positions = new Map();
        const toRemove = [];

        // Group troggles by position
        this.troggles.forEach(t => {
            const key = `${t.x},${t.y}`;
            if (!positions.has(key)) {
                positions.set(key, []);
            }
            positions.get(key).push(t);
        });

        // If multiple troggles on same cell, one survives (random)
        positions.forEach(trogglesAtPos => {
            if (trogglesAtPos.length > 1) {
                // Smarties have priority, then random
                const smarties = trogglesAtPos.filter(t => t.type === TroggleType.SMARTIE);
                const survivor = smarties.length > 0
                    ? smarties[0]
                    : trogglesAtPos[Math.floor(Math.random() * trogglesAtPos.length)];

                trogglesAtPos.forEach(t => {
                    if (t.id !== survivor.id) {
                        toRemove.push(t.id);
                    }
                });
            }
        });

        // Remove eaten troggles
        toRemove.forEach(id => this.removeTroggle(id));
    },

    /* =========================================
       MOVEMENT STRATEGIES BY TYPE
       ========================================= */

    // Reggie: Linear movement, despawns at edges
    planReggieMove(troggle) {
        let { x, y, direction } = troggle;
        let newX = x;
        let newY = y;
        let newDirection = direction;

        // Calculate new position
        const delta = this.getDirectionDelta(direction);
        newX = x + delta.dx;
        newY = y + delta.dy;

        // Check for safety squares
        if (typeof SafetySquares !== 'undefined' && SafetySquares.isAt(newX, newY)) {
            // Can't enter safety square - pick a different direction
            newDirection = this.pickAlternateDirection(x, y, direction);
            const altDelta = this.getDirectionDelta(newDirection);
            newX = x + altDelta.dx;
            newY = y + altDelta.dy;

            // Still blocked? Stay in place
            if (typeof SafetySquares !== 'undefined' && SafetySquares.isAt(newX, newY)) {
                return { x, y, direction: newDirection };
            }
        }

        // Check if new position is valid (on board)
        if (Grid.isValidPosition(newX, newY)) {
            // Small chance to randomly change direction
            if (Math.random() < 0.1) {
                newDirection = this.DIRECTIONS[Math.floor(Math.random() * this.DIRECTIONS.length)];
            }
            return { x: newX, y: newY, direction: newDirection };
        } else {
            // At edge - always walk off the board (despawn)
            return { x: newX, y: newY, direction, offBoard: true };
        }
    },

    // Bashful: Random movement, flees when Muncher approaches
    planBashfulMove(troggle) {
        const { x, y } = troggle;

        // Check if Muncher is nearby (within 2 cells)
        if (typeof Game !== 'undefined' && Game.muncher) {
            const mPos = Game.muncher.getPosition();
            const dist = Math.abs(x - mPos.x) + Math.abs(y - mPos.y);

            if (dist <= 2) {
                // Flee! Move away from Muncher
                return this.planFleeMove(troggle, mPos);
            }
        }

        // Random movement
        return this.planRandomMove(troggle);
    },

    // Helper: Seeks out correct answers to eat them
    planHelperMove(troggle) {
        const { x, y } = troggle;

        // Find nearest unmunched correct answer
        if (typeof Grid !== 'undefined') {
            const target = this.findNearestCorrectCell(x, y);
            if (target) {
                return this.planMoveToward(troggle, target);
            }
        }

        // No targets - random movement
        return this.planRandomMove(troggle);
    },

    // Worker: Random movement, but can restore munched cells
    planWorkerMove(troggle) {
        // Workers move randomly
        return this.planRandomMove(troggle);
    },

    // Smartie: A* pathfinding pursuit of Muncher
    planSmartieMove(troggle) {
        const { x, y } = troggle;

        // Use pathfinding to chase Muncher
        if (typeof Game !== 'undefined' && Game.muncher && typeof Pathfinding !== 'undefined') {
            const mPos = Game.muncher.getPosition();

            // Find path to Muncher (don't avoid other Troggles)
            const path = Pathfinding.findPath(x, y, mPos.x, mPos.y, []);

            if (path && path.length > 0) {
                // Move one step toward Muncher
                const nextStep = path[0];
                const newDirection = nextStep.direction || troggle.direction;

                // Check safety squares
                if (typeof SafetySquares !== 'undefined' && SafetySquares.isAt(nextStep.x, nextStep.y)) {
                    // Blocked by safety - try alternate
                    return this.planRandomMove(troggle);
                }

                return { x: nextStep.x, y: nextStep.y, direction: newDirection };
            }
        }

        // Fallback to random if no path
        return this.planRandomMove(troggle);
    },

    /* =========================================
       MOVEMENT HELPERS
       ========================================= */

    // Plan a flee move (away from target)
    planFleeMove(troggle, targetPos) {
        const { x, y } = troggle;
        const dx = x - targetPos.x;
        const dy = y - targetPos.y;

        // Determine primary flee direction
        let fleeDir;
        if (Math.abs(dx) > Math.abs(dy)) {
            fleeDir = dx > 0 ? 'right' : 'left';
        } else {
            fleeDir = dy > 0 ? 'down' : 'up';
        }

        // Try to move in flee direction
        const delta = this.getDirectionDelta(fleeDir);
        const newX = x + delta.dx;
        const newY = y + delta.dy;

        if (Grid.isValidPosition(newX, newY) &&
            !(typeof SafetySquares !== 'undefined' && SafetySquares.isAt(newX, newY))) {
            return { x: newX, y: newY, direction: fleeDir };
        }

        // Can't flee directly - try perpendicular
        return this.planRandomMove(troggle);
    },

    // Plan random movement
    planRandomMove(troggle) {
        const { x, y } = troggle;
        const shuffled = [...this.DIRECTIONS].sort(() => Math.random() - 0.5);

        for (const dir of shuffled) {
            const delta = this.getDirectionDelta(dir);
            const newX = x + delta.dx;
            const newY = y + delta.dy;

            if (Grid.isValidPosition(newX, newY) &&
                !(typeof SafetySquares !== 'undefined' && SafetySquares.isAt(newX, newY))) {
                return { x: newX, y: newY, direction: dir };
            }
        }

        // Completely stuck - stay in place
        return { x, y, direction: troggle.direction };
    },

    // Plan move toward a target
    planMoveToward(troggle, target) {
        const { x, y } = troggle;
        const dx = target.x - x;
        const dy = target.y - y;

        // Determine primary direction
        let primaryDir;
        if (Math.abs(dx) > Math.abs(dy)) {
            primaryDir = dx > 0 ? 'right' : 'left';
        } else if (dy !== 0) {
            primaryDir = dy > 0 ? 'down' : 'up';
        } else {
            // Already at target
            return { x, y, direction: troggle.direction };
        }

        const delta = this.getDirectionDelta(primaryDir);
        const newX = x + delta.dx;
        const newY = y + delta.dy;

        if (Grid.isValidPosition(newX, newY) &&
            !(typeof SafetySquares !== 'undefined' && SafetySquares.isAt(newX, newY))) {
            return { x: newX, y: newY, direction: primaryDir };
        }

        // Blocked - try random
        return this.planRandomMove(troggle);
    },

    // Find nearest unmunched correct cell
    findNearestCorrectCell(fromX, fromY) {
        if (typeof Grid === 'undefined') return null;

        let nearest = null;
        let nearestDist = Infinity;

        Grid.cells.forEach(cell => {
            if (cell.isCorrect && !cell.munched) {
                const dist = Math.abs(cell.x - fromX) + Math.abs(cell.y - fromY);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = { x: cell.x, y: cell.y };
                }
            }
        });

        return nearest;
    },

    // Get direction delta
    getDirectionDelta(direction) {
        switch (direction) {
            case 'up': return { dx: 0, dy: -1 };
            case 'down': return { dx: 0, dy: 1 };
            case 'left': return { dx: -1, dy: 0 };
            case 'right': return { dx: 1, dy: 0 };
            default: return { dx: 0, dy: 0 };
        }
    },

    // Pick an alternate direction (not the given one or its opposite)
    pickAlternateDirection(_x, _y, currentDir) {
        const perpendicular = {
            'up': ['left', 'right'],
            'down': ['left', 'right'],
            'left': ['up', 'down'],
            'right': ['up', 'down']
        };

        const options = perpendicular[currentDir] || this.DIRECTIONS;
        return options[Math.floor(Math.random() * options.length)];
    },

    /* =========================================
       SPECIAL ACTIONS
       ========================================= */

    // Helper eats the number in current cell
    helperAction(troggle) {
        if (typeof Grid === 'undefined') return;

        const cell = Grid.getCell(troggle.x, troggle.y);
        if (cell && !cell.munched) {
            // "Eat" the cell (mark as munched but don't give player points)
            cell.munched = true;
            Grid.render();
        }
    },

    // Worker may restore a munched cell
    workerAction(troggle) {
        if (typeof Grid === 'undefined' || typeof Levels === 'undefined') return;

        const cell = Grid.getCell(troggle.x, troggle.y);
        if (cell && cell.munched) {
            // Restore the cell with a new number
            const level = typeof Game !== 'undefined' ? Game.level : 1;
            const multiple = Levels.getMultiple(level);

            // 50% chance correct, 50% chance wrong
            const isCorrect = Math.random() < 0.5;
            let value;

            if (isCorrect) {
                const multiplier = Math.floor(Math.random() * 10) + 1;
                value = multiple * multiplier;
            } else {
                // Generate a non-multiple
                value = multiple * Math.floor(Math.random() * 10) + Math.floor(Math.random() * (multiple - 1)) + 1;
            }

            cell.value = value;
            cell.isCorrect = isCorrect;
            cell.munched = false;
            Grid.render();
        }
    },

    /* =========================================
       LEGACY METHODS (backward compatibility)
       ========================================= */

    // Move a single Troggle (legacy - for old code paths)
    moveTroggle(troggle) {
        const planned = this.planTroggleMove(troggle);
        troggle.x = planned.x;
        troggle.y = planned.y;
        if (planned.direction) {
            troggle.direction = planned.direction;
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

    // Get Troggle at position (or null)
    getAtPosition(x, y) {
        return this.troggles.find(t => t.x === x && t.y === y) || null;
    },

    // Get all Troggle positions
    getPositions() {
        return this.troggles.map(t => ({ x: t.x, y: t.y }));
    },

    // Clear all Troggles
    clear() {
        this.stopMovement();
        this.troggles = [];
        this.nextId = 0;
        if (typeof Grid !== 'undefined') {
            Grid.updateTroggles([]);
        }
    },

    // Get count of active Troggles
    getCount() {
        return this.troggles.length;
    }
};
