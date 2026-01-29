/* =========================================
   TROGGLE SPAWNER - Manages Troggle Spawning
   Handles spawn timing, type selection, edge entry
   ========================================= */

const TroggleSpawner = {
    // Spawn timing
    spawnCooldownMs: 3000,  // Minimum ms between spawns
    maxTimeWithoutTroggle: 5000,  // Force spawn if no troggles for this long
    lastSpawnTick: 0,
    lastTroggleExistedTick: 0,  // Track when we last had a troggle
    
    // First troggle delay (decreases per level)
    baseFirstSpawnDelay: 3000,  // 3 seconds at level 1
    firstSpawnReductionPerLevel: 100,  // 100ms faster per level
    minFirstSpawnDelay: 1000,  // Never faster than 1 second

    // Pending spawns (showing warning before entry)
    pendingSpawns: [],

    // Warning duration in ms
    warningDuration: 500,
    
    // Track if first spawn has happened this level
    firstSpawnDone: false,

    // Initialize for a level
    init(level) {
        this.lastSpawnTick = 0;
        this.lastTroggleExistedTick = 0;
        this.pendingSpawns = [];
        this.firstSpawnDone = false;
        this.currentLevel = level;
    },
    
    // Get first spawn delay for current level
    getFirstSpawnDelay(level) {
        const delay = this.baseFirstSpawnDelay - (level - 1) * this.firstSpawnReductionPerLevel;
        return Math.max(this.minFirstSpawnDelay, delay);
    },

    // Get maximum Troggles allowed for a level
    getMaxTroggles(level) {
        if (level <= 3) return 1;
        if (level <= 7) return 2;
        return 3;
    },

    // Get type weights (probabilities) for a level
    getTypeWeights(level) {
        if (level <= 2) {
            // Early levels: only Reggies
            return { reggie: 1 };
        } else if (level <= 5) {
            // Add Bashfuls
            return { reggie: 0.6, bashful: 0.4 };
        } else if (level <= 8) {
            // Add Helpers and Smarties
            return { reggie: 0.35, bashful: 0.25, helper: 0.25, smartie: 0.15 };
        } else {
            // All types including Workers
            return { reggie: 0.2, bashful: 0.2, helper: 0.2, worker: 0.2, smartie: 0.2 };
        }
    },

    // Check if should spawn (called each tick by GameLoop)
    checkSpawn(currentTick, tickRateMs) {
        if (typeof Troggle === 'undefined') return;

        const level = typeof Game !== 'undefined' ? Game.level : 1;
        const currentCount = Troggle.getCount();
        const maxCount = this.getMaxTroggles(level);

        // Track when we last had a troggle
        if (currentCount > 0) {
            this.lastTroggleExistedTick = currentTick;
            this.firstSpawnDone = true;
        }

        // Don't spawn if at or above limit
        if (currentCount >= maxCount) return;

        // Calculate elapsed time since level start (tick 0)
        const elapsedMs = currentTick * tickRateMs;
        
        // First spawn has a special delay based on level
        if (!this.firstSpawnDone) {
            const firstSpawnDelay = this.getFirstSpawnDelay(level);
            if (elapsedMs < firstSpawnDelay) return;
        }

        // Calculate time since last spawn
        const ticksSinceSpawn = currentTick - this.lastSpawnTick;
        const msSinceSpawn = ticksSinceSpawn * tickRateMs;

        // Calculate time since we had any troggle
        const ticksSinceTroggle = currentTick - this.lastTroggleExistedTick;
        const msSinceTroggle = ticksSinceTroggle * tickRateMs;

        // Force spawn if no troggles for too long (and we're below max)
        const forceSpawn = this.firstSpawnDone && currentCount === 0 && msSinceTroggle >= this.maxTimeWithoutTroggle;

        // Check cooldown (unless forced or first spawn)
        if (!forceSpawn && this.firstSpawnDone && msSinceSpawn < this.spawnCooldownMs) return;

        // Spawn a new Troggle
        this.startSpawn(level);
        this.lastSpawnTick = currentTick;
    },

    // Start the spawn process (show warning, then spawn)
    startSpawn(level) {
        const edge = this.pickEdgePosition();
        if (!edge) return;

        const type = this.pickType(level);

        // Show warning indicator at edge
        if (typeof Grid !== 'undefined') {
            Grid.showSpawnWarning(edge.x, edge.y);
        }

        // Create pending spawn
        const spawn = {
            x: edge.x,
            y: edge.y,
            direction: edge.direction,
            type: type,
            timeout: setTimeout(() => {
                this.completeSpawn(spawn);
            }, this.warningDuration)
        };

        this.pendingSpawns.push(spawn);
    },

    // Complete a spawn (warning period ended)
    completeSpawn(spawn) {
        // Remove from pending
        const idx = this.pendingSpawns.indexOf(spawn);
        if (idx !== -1) {
            this.pendingSpawns.splice(idx, 1);
        }

        // Hide warning
        if (typeof Grid !== 'undefined') {
            Grid.hideSpawnWarning(spawn.x, spawn.y);
        }

        // Check if position is now blocked (by safety square or muncher)
        if (typeof SafetySquares !== 'undefined' && SafetySquares.isAt(spawn.x, spawn.y)) {
            // Blocked by safety square - spawn fails
            return;
        }

        if (typeof Game !== 'undefined' && Game.muncher) {
            const mPos = Game.muncher.getPosition();
            if (mPos.x === spawn.x && mPos.y === spawn.y) {
                // Muncher is at spawn point - this counts as a collision!
                // The troggle still spawns, triggering collision check
            }
        }

        // Create the Troggle
        const troggle = {
            x: spawn.x,
            y: spawn.y,
            type: spawn.type,
            direction: spawn.direction,
            emoji: TroggleEmoji[spawn.type] || '👾'
        };

        if (typeof Troggle !== 'undefined') {
            Troggle.addTroggle(troggle);

            // Check for collision immediately
            if (typeof Game !== 'undefined') {
                Game.checkTroggleCollision();
            }
        }
    },

    // Pick a random edge position
    pickEdgePosition() {
        if (typeof Grid === 'undefined') return null;

        const edges = [];

        // Top row - enter moving down
        for (let x = 0; x < Grid.COLS; x++) {
            edges.push({ x, y: 0, direction: 'down' });
        }

        // Bottom row - enter moving up
        for (let x = 0; x < Grid.COLS; x++) {
            edges.push({ x, y: Grid.ROWS - 1, direction: 'up' });
        }

        // Left column - enter moving right
        for (let y = 0; y < Grid.ROWS; y++) {
            edges.push({ x: 0, y, direction: 'right' });
        }

        // Right column - enter moving left
        for (let y = 0; y < Grid.ROWS; y++) {
            edges.push({ x: Grid.COLS - 1, y, direction: 'left' });
        }

        // Filter out blocked positions
        const available = edges.filter(e => {
            // Check safety squares
            if (typeof SafetySquares !== 'undefined' && SafetySquares.isAt(e.x, e.y)) {
                return false;
            }
            // Check existing Troggles
            if (typeof Troggle !== 'undefined' && Troggle.isAtPosition(e.x, e.y)) {
                return false;
            }
            // Check pending spawns
            if (this.pendingSpawns.some(p => p.x === e.x && p.y === e.y)) {
                return false;
            }
            return true;
        });

        if (available.length === 0) {
            // All edges blocked - use any edge
            return edges[Math.floor(Math.random() * edges.length)];
        }

        return available[Math.floor(Math.random() * available.length)];
    },

    // Pick a Troggle type based on level weights
    pickType(level) {
        const weights = this.getTypeWeights(level);
        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * total;

        for (const [type, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) {
                return type;
            }
        }

        return 'reggie'; // Fallback
    },

    // Cancel all pending spawns
    cancelPending() {
        this.pendingSpawns.forEach(spawn => {
            clearTimeout(spawn.timeout);
            if (typeof Grid !== 'undefined') {
                Grid.hideSpawnWarning(spawn.x, spawn.y);
            }
        });
        this.pendingSpawns = [];
    },

    // Clear state
    clear() {
        this.cancelPending();
        this.lastSpawnTick = 0;
    }
};
