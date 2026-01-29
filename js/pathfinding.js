/* =========================================
   PATHFINDING - BFS Path Finding for Autopilot
   ========================================= */

const Pathfinding = {
    // Currently executing path
    currentPath: null,
    pathExecuting: false,
    pathInterval: null,

    // Delay between moves (should match animation speed)
    moveDelay: 150,

    // Find path using BFS (Breadth-First Search)
    // Returns array of {x, y, direction} steps, or null if no path
    findPath(startX, startY, endX, endY, obstacles = []) {
        // If already at destination
        if (startX === endX && startY === endY) {
            return [];
        }

        const cols = Grid.COLS;
        const rows = Grid.ROWS;

        // Create obstacle set for O(1) lookup
        const obstacleSet = new Set(obstacles.map(o => `${o.x},${o.y}`));

        // BFS queue: each item is {x, y, path}
        const queue = [{ x: startX, y: startY, path: [] }];
        const visited = new Set([`${startX},${startY}`]);

        // Direction mappings
        const directions = [
            { dx: 0, dy: -1, name: 'up' },
            { dx: 0, dy: 1, name: 'down' },
            { dx: -1, dy: 0, name: 'left' },
            { dx: 1, dy: 0, name: 'right' }
        ];

        while (queue.length > 0) {
            const current = queue.shift();

            for (const dir of directions) {
                const newX = current.x + dir.dx;
                const newY = current.y + dir.dy;
                const key = `${newX},${newY}`;

                // Check bounds
                if (newX < 0 || newX >= cols || newY < 0 || newY >= rows) {
                    continue;
                }

                // Check if visited
                if (visited.has(key)) {
                    continue;
                }

                // Check if obstacle (Troggle)
                if (obstacleSet.has(key)) {
                    continue;
                }

                // Create new path
                const newPath = [...current.path, { x: newX, y: newY, direction: dir.name }];

                // Check if reached destination
                if (newX === endX && newY === endY) {
                    return newPath;
                }

                // Add to queue
                visited.add(key);
                queue.push({ x: newX, y: newY, path: newPath });
            }
        }

        // No path found
        return null;
    },

    // Execute a path with the nosher
    async executePath(path, onComplete) {
        if (!path || path.length === 0) {
            if (onComplete) onComplete(true);
            return;
        }

        this.pathExecuting = true;
        this.currentPath = [...path];

        for (let i = 0; i < path.length; i++) {
            // Check if path was cancelled
            if (!this.pathExecuting) {
                if (onComplete) onComplete(false);
                return;
            }

            const step = path[i];

            // Check if Troggle is now blocking the next position
            if (typeof Troggle !== 'undefined' && Troggle.isAtPosition(step.x, step.y)) {
                // Path blocked, try to recalculate
                this.pathExecuting = false;
                if (onComplete) onComplete(false);
                return;
            }

            // Move nosher
            if (typeof Game !== 'undefined' && Game.state === 'playing') {
                const moved = Game.nosher.move(step.direction);
                if (moved) {
                    Sound.playMove();
                }

                // Check for Troggle collision after move
                Game.checkTroggleCollision();

                // If game state changed (collision), stop
                if (Game.state !== 'playing') {
                    this.pathExecuting = false;
                    if (onComplete) onComplete(false);
                    return;
                }
            }

            // Wait for animation
            await this.delay(this.moveDelay);
        }

        this.pathExecuting = false;
        this.currentPath = null;

        if (onComplete) onComplete(true);
    },

    // Cancel current path
    cancelPath() {
        this.pathExecuting = false;
        this.currentPath = null;
    },

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Handle click for autopilot mode
    handleAutopilotClick(targetX, targetY) {
        if (!Game.mouseAutopilot || Game.state !== 'playing') {
            return false;
        }

        // Cancel any existing path
        this.cancelPath();

        const nosherPos = Game.nosher.getPosition();

        // Get current Troggle positions as obstacles
        const obstacles = Troggle.getPositions();

        // Find path
        const path = this.findPath(nosherPos.x, nosherPos.y, targetX, targetY, obstacles);

        if (path && path.length > 0) {
            // Execute path
            this.executePath(path, (success) => {
                if (!success) {
                    // Path was blocked or cancelled
                    // Could show feedback here
                }
            });
            return true;
        } else {
            // No path available
            Game.showFeedback('No path!', 'incorrect');
            return false;
        }
    },

    // Recalculate path around updated Troggle positions (called by GameLoop)
    recalculatePath() {
        if (!this.pathExecuting || !this.currentPath || this.currentPath.length === 0) {
            return;
        }

        // Get the final destination from current path
        const destination = this.currentPath[this.currentPath.length - 1];
        if (!destination) return;

        const nosherPos = Game.nosher.getPosition();

        // Get updated Troggle positions as obstacles
        const obstacles = Troggle.getPositions();

        // Check if current next step is now blocked
        if (this.currentPath.length > 0) {
            const nextStep = this.currentPath[0];
            const isBlocked = obstacles.some(o => o.x === nextStep.x && o.y === nextStep.y);

            if (isBlocked) {
                // Try to find a new path
                const newPath = this.findPath(nosherPos.x, nosherPos.y, destination.x, destination.y, obstacles);

                if (newPath && newPath.length > 0) {
                    // Update the current path
                    this.currentPath = newPath;
                } else {
                    // No path available - cancel autopilot
                    this.cancelPath();
                    Game.showFeedback('Path blocked!', 'incorrect');
                }
            }
        }
    }
};
