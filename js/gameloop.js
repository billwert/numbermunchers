/* =========================================
   GAMELOOP - Tick-Based Game Coordination
   Coordinates Troggle movement, collisions,
   and game state updates
   ========================================= */

const GameLoop = {
    // Configuration
    tickRate: 800,           // ms per tick (default)
    tickInterval: null,
    currentTick: 0,

    // State
    running: false,

    // Initialize (called once at app start)
    init() {
        this.running = false;
        this.tickInterval = null;
        this.currentTick = 0;
    },

    // Start the game loop
    start(level = 1) {
        this.running = true;
        this.currentTick = 0;
        this.setTickRate(level);

        this.tickInterval = setInterval(() => {
            this.tick();
        }, this.tickRate);
    },

    // Stop the game loop completely
    stop() {
        this.running = false;
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    },

    // Pause (preserves state, stops ticks)
    pause() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    },

    // Resume from pause
    resume() {
        if (this.running && !this.tickInterval) {
            this.tickInterval = setInterval(() => {
                this.tick();
            }, this.tickRate);
        }
    },

    // Main tick function - called every tickRate ms
    tick() {
        if (!this.running) return;
        if (typeof Game === 'undefined' || Game.state !== 'playing') return;

        this.currentTick++;

        // Phase 1: Troggle spawning (if below limit)
        if (typeof TroggleSpawner !== 'undefined') {
            TroggleSpawner.checkSpawn(this.currentTick, this.tickRate);
        }

        // Phase 2: Safety square management
        if (typeof SafetySquares !== 'undefined') {
            SafetySquares.update();
        }

        // Phase 3: Move all Troggles simultaneously (coordinated)
        this.moveTroggles();

        // Phase 4: Check collisions after Troggle movement
        if (typeof Game !== 'undefined') {
            Game.checkTroggleCollision();
        }

        // Phase 5: Update pathfinding for autopilot if active
        if (typeof Pathfinding !== 'undefined' && Pathfinding.pathExecuting) {
            // Recalculate path around new Troggle positions
            Pathfinding.recalculatePath();
        }
    },

    // Coordinated Troggle movement
    moveTroggles() {
        if (typeof Troggle === 'undefined') return;

        // All Troggles calculate their next position
        const plannedMoves = Troggle.planMoves();

        // Resolve conflicts (two Troggles targeting same cell)
        const resolvedMoves = this.resolveConflicts(plannedMoves);

        // Execute all moves simultaneously
        Troggle.executeMoves(resolvedMoves);

        // Check for Troggle-on-Troggle collision (they can eat each other)
        Troggle.checkTroggleCollisions();

        // Update display
        if (typeof Grid !== 'undefined') {
            Grid.updateTroggles(Troggle.troggles);
        }
    },

    // Resolve movement conflicts when multiple Troggles target same cell
    resolveConflicts(plannedMoves) {
        // Group by target position
        const byTarget = new Map();
        plannedMoves.forEach(move => {
            const key = `${move.targetX},${move.targetY}`;
            if (!byTarget.has(key)) byTarget.set(key, []);
            byTarget.get(key).push(move);
        });

        // For each conflict, pick one randomly, others stay in place
        const resolved = [];
        byTarget.forEach(moves => {
            if (moves.length === 1) {
                resolved.push(moves[0]);
            } else {
                // Conflict - one moves, others stay
                const winner = moves[Math.floor(Math.random() * moves.length)];
                resolved.push(winner);
                moves.forEach(m => {
                    if (m !== winner) {
                        // Stay in current position
                        resolved.push({
                            ...m,
                            targetX: m.currentX,
                            targetY: m.currentY,
                            stayed: true
                        });
                    }
                });
            }
        });

        return resolved;
    },

    // Adjust tick rate based on level (faster at higher levels)
    setTickRate(level) {
        const baseRate = 2500;  // 2.5 seconds at level 1
        const minRate = 400;    // Minimum 400ms (fastest)
        const reduction = (level - 1) * 100;  // Speed up 100ms per level
        this.tickRate = Math.max(minRate, baseRate - reduction);

        // Restart interval with new rate if already running
        if (this.running && this.tickInterval) {
            this.pause();
            this.resume();
        }
    },

    // Get current tick rate (for display/debug)
    getTickRate() {
        return this.tickRate;
    }
};
