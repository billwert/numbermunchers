/* =========================================
   GAME - Core Game Loop & State Management
   ========================================= */

const Game = {
    // Game state
    state: 'idle', // 'idle', 'playing', 'paused', 'gameover', 'levelcomplete'

    // Player stats
    score: 0,
    lives: 4,
    level: 1,
    correctInARow: 0,
    lastExtraLifeScore: 0,

    // Settings
    mouseAutopilot: false,
    testingMode: false,

    // Muncher reference
    muncher: Muncher,

    // DOM elements
    elements: {
        score: null,
        level: null,
        lives: null,
        rule: null,
        feedback: null,
        confetti: null
    },

    init() {
        // Cache DOM elements
        this.elements.score = document.getElementById('score');
        this.elements.level = document.getElementById('level');
        this.elements.lives = document.getElementById('lives');
        this.elements.rule = document.getElementById('current-rule');
        this.elements.feedback = document.getElementById('feedback');
        this.elements.confetti = document.getElementById('confetti-container');

        // Initialize grid
        Grid.init();

        // Initialize Troggles
        Troggle.init();
    },

    // Start a new game
    startNewGame() {
        this.score = 0;
        this.lives = 4;
        this.level = 1;
        this.correctInARow = 0;
        this.lastExtraLifeScore = 0;

        // Initialize and start sound/music
        Sound.init();
        Sound.resume();
        Sound.startMusic();

        this.updateDisplay();
        this.startLevel();
    },

    // Start a level
    startLevel() {
        this.state = 'playing';

        // Update rule display
        this.elements.rule.textContent = Levels.getRuleText(this.level);

        // Populate grid
        Grid.populate(this.level);

        // Position muncher at center-ish
        const startX = Math.floor(Grid.COLS / 2);
        const startY = Math.floor(Grid.ROWS / 2);
        this.muncher.init(startX, startY);
        Grid.updateMuncherPosition(startX, startY);

        // Spawn Troggles
        const troggleCount = Levels.getTroggleCount(this.level);
        Troggle.spawn(troggleCount, [{ x: startX, y: startY }]);

        // Start Troggle movement
        const speed = Levels.getTroggleSpeed(this.level);
        Troggle.startMovement(speed);

        // Set up input handlers
        this.setupInputHandlers();

        this.updateDisplay();
    },

    // Setup input handlers for gameplay
    setupInputHandlers() {
        Input.onMove = (direction) => {
            if (this.state !== 'playing') return;
            const moved = this.muncher.move(direction);
            if (moved) {
                Sound.playMove();
            }

            // Check collision after move
            this.checkTroggleCollision();
        };

        Input.onAction = () => {
            if (this.state === 'playing') {
                this.handleMunch();
            } else if (this.state === 'levelcomplete') {
                this.nextLevel();
            }
        };

        Input.onPause = () => {
            if (this.state === 'playing') {
                this.pause();
            } else if (this.state === 'paused') {
                this.resume();
            }
        };

        Input.onAnyKey = null;
    },

    // Handle munch action
    handleMunch() {
        const result = this.muncher.munch();

        if (!result.success) {
            // Cell was already munched, do nothing
            return;
        }

        if (result.isCorrect) {
            // Correct munch!
            this.correctInARow++;
            Sound.playMunchCorrect();

            // Add points
            const points = Levels.getPointsForMunch(this.level);
            this.addScore(points);

            // Show feedback
            const message = Levels.getEncouragingMessage(this.correctInARow);
            this.showFeedback(message, 'correct');

            // Celebrate
            Grid.celebrateMunch();
            this.spawnConfetti(5);

            // Check if level complete
            if (Grid.allCorrectMunched()) {
                this.completeLevel();
            }
        } else {
            // Wrong munch!
            this.correctInARow = 0;
            Sound.playMunchWrong();

            // Lose a life
            this.loseLife();

            // Show feedback
            const message = Levels.getWrongMessage();
            this.showFeedback(message, 'incorrect');

            // Screen shake
            document.getElementById('game-screen').classList.add('screen-shake');
            setTimeout(() => {
                document.getElementById('game-screen').classList.remove('screen-shake');
            }, 300);
        }

        this.updateDisplay();
    },

    // Add score and check for extra life
    addScore(points) {
        this.score += points;

        // Check for extra life
        const threshold = Levels.getExtraLifeThreshold();
        const livesEarned = Math.floor(this.score / threshold);
        const previousLivesEarned = Math.floor(this.lastExtraLifeScore / threshold);

        if (livesEarned > previousLivesEarned) {
            this.lives = Math.min(this.lives + 1, 9); // Max 9 lives
            this.showFeedback('Extra Life!', 'correct');
            this.lastExtraLifeScore = this.score;
            Sound.playExtraLife();
        }
    },

    // Lose a life
    loseLife() {
        this.lives--;

        if (this.lives <= 0) {
            this.gameOver();
        }
    },

    // Check for collision with Troggles
    checkTroggleCollision() {
        if (this.state !== 'playing') return;

        const muncherPos = this.muncher.getPosition();
        if (Troggle.isAtPosition(muncherPos.x, muncherPos.y)) {
            this.handleTroggleCollision();
        }
    },

    // Handle Troggle collision
    handleTroggleCollision() {
        this.correctInARow = 0;
        this.showFeedback('Caught!', 'incorrect');
        Sound.playTroggleHit();

        // Screen shake
        document.getElementById('game-screen').classList.add('screen-shake');
        setTimeout(() => {
            document.getElementById('game-screen').classList.remove('screen-shake');
        }, 300);

        this.loseLife();
        this.updateDisplay();

        // If still alive, respawn muncher at safe position
        if (this.lives > 0) {
            const safePos = Grid.getRandomPosition(Troggle.getPositions());
            this.muncher.setPosition(safePos.x, safePos.y);
        }
    },

    // Complete level
    completeLevel() {
        this.state = 'levelcomplete';

        // Stop Troggles
        Troggle.stopMovement();

        // Play level complete sound
        Sound.playLevelComplete();

        // Add bonus points
        const bonus = Levels.getLevelClearBonus(this.level);
        this.addScore(bonus);

        // Show celebration
        this.spawnConfetti(30);
        this.showLevelCompleteOverlay();

        this.updateDisplay();
    },

    // Show level complete overlay
    showLevelCompleteOverlay() {
        const overlay = document.getElementById('level-complete-overlay');
        const message = document.getElementById('level-complete-message');

        const messages = [
            'Fantastic!',
            'You did it!',
            'Amazing work!',
            'Super smart!',
            'Math wizard!'
        ];
        message.textContent = messages[Math.floor(Math.random() * messages.length)];

        overlay.classList.add('active');
    },

    // Proceed to next level
    nextLevel() {
        document.getElementById('level-complete-overlay').classList.remove('active');
        this.level++;
        this.startLevel();
    },

    // Pause menu state
    pauseSelectedIndex: 0,

    // Pause game
    pause() {
        if (this.state !== 'playing') return;

        this.state = 'paused';
        Troggle.stopMovement();
        document.getElementById('pause-overlay').classList.add('active');
        
        // Set up pause menu navigation
        this.pauseSelectedIndex = 0;
        this.updatePauseSelection();
        this.setupPauseInput();
    },
    
    // Set up pause menu input handlers
    setupPauseInput() {
        Input.clearCallbacks();
        
        Input.onMove = (direction) => {
            const buttons = this.getPauseButtons();
            if (direction === 'up') {
                this.pauseSelectedIndex = Math.max(0, this.pauseSelectedIndex - 1);
            } else if (direction === 'down') {
                this.pauseSelectedIndex = Math.min(buttons.length - 1, this.pauseSelectedIndex + 1);
            }
            this.updatePauseSelection();
        };
        
        Input.onAction = () => {
            const buttons = this.getPauseButtons();
            if (buttons[this.pauseSelectedIndex]) {
                const action = buttons[this.pauseSelectedIndex].dataset.action;
                Main.handleButtonAction(action);
            }
        };
        
        Input.onPause = () => {
            this.resume();
        };
        
        Input.onAnyKey = null;
    },
    
    // Get pause menu buttons
    getPauseButtons() {
        return Array.from(document.querySelectorAll('#pause-overlay .menu-btn'));
    },
    
    // Update pause menu selection visual
    updatePauseSelection() {
        const buttons = this.getPauseButtons();
        buttons.forEach((btn, i) => {
            btn.classList.toggle('selected', i === this.pauseSelectedIndex);
        });
    },

    // Resume game
    resume() {
        if (this.state !== 'paused') return;

        document.getElementById('pause-overlay').classList.remove('active');
        this.state = 'playing';
        
        // Clear pause selection
        this.getPauseButtons().forEach(btn => btn.classList.remove('selected'));
        
        // Restore game input handlers
        this.setupInputHandlers();

        const speed = Levels.getTroggleSpeed(this.level);
        Troggle.startMovement(speed);
    },

    // Game over
    gameOver() {
        this.state = 'gameover';

        // Stop everything
        Troggle.stopMovement();
        Sound.stopMusic();
        Sound.playGameOver();

        // Show game over screen
        setTimeout(() => {
            Main.showScreen('gameover');

            // Display final score
            document.getElementById('final-score').textContent = this.score;

            // Check for high score
            const newHighscoreDiv = document.getElementById('new-highscore');
            if (Storage.isHighScore(this.score)) {
                newHighscoreDiv.classList.remove('hidden');
                document.getElementById('player-name').value = '';
                document.getElementById('player-name').focus();
            } else {
                newHighscoreDiv.classList.add('hidden');
            }
        }, 500);
    },

    // Save high score
    saveHighScore() {
        const name = document.getElementById('player-name').value || 'Player';
        Storage.addHighScore(name, this.score);
        document.getElementById('new-highscore').classList.add('hidden');
    },

    // Quit to menu
    quitToMenu() {
        this.state = 'idle';
        Troggle.clear();
        Sound.stopMusic();
        document.getElementById('pause-overlay').classList.remove('active');
        document.getElementById('level-complete-overlay').classList.remove('active');
        Main.showScreen('menu');
    },

    // Update display
    updateDisplay() {
        this.elements.score.textContent = this.score;
        this.elements.level.textContent = this.level;

        // Update lives with hearts
        let hearts = '';
        for (let i = 0; i < this.lives; i++) {
            hearts += '❤️';
        }
        this.elements.lives.textContent = hearts || '💔';
    },

    // Show feedback message
    showFeedback(message, type) {
        const feedback = this.elements.feedback;
        feedback.textContent = message;
        feedback.className = `feedback show ${type}`;

        setTimeout(() => {
            feedback.classList.remove('show');
        }, 800);
    },

    // Spawn confetti
    spawnConfetti(count) {
        const container = this.elements.confetti;
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFD93D'];

        for (let i = 0; i < count; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

            container.appendChild(confetti);

            // Remove after animation
            setTimeout(() => {
                confetti.remove();
            }, 3000);
        }
    }
};
