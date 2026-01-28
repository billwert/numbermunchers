/* =========================================
   MAIN - Entry Point & Screen Management
   ========================================= */

const Main = {
    currentScreen: 'splash',
    selectedMenuIndex: 0,
    menuOptions: ['new-game', 'high-scores', 'how-to-play'],

    init() {
        // Initialize input system
        Input.init();

        // Initialize game
        Game.init();

        // Set up button click handlers
        this.setupButtonHandlers();

        // Show splash screen
        this.showScreen('splash');
        this.setupSplashInput();
    },

    // Show a specific screen
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show the requested screen
        const screen = document.getElementById(`${screenName}-screen`);
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenName;
        }

        // Set up screen-specific input handlers
        switch (screenName) {
            case 'splash':
                this.setupSplashInput();
                break;
            case 'menu':
                this.setupMenuInput();
                break;
            case 'highscores':
                this.displayHighScores();
                this.setupBackInput();
                break;
            case 'howtoplay':
                this.setupBackInput();
                break;
            case 'game':
                // Game handles its own input
                break;
            case 'gameover':
                this.setupGameOverInput();
                break;
        }
    },

    // Set up splash screen input
    setupSplashInput() {
        Input.clearCallbacks();
        Input.onAnyKey = () => {
            this.showScreen('menu');
        };
    },

    // Set up menu input
    setupMenuInput() {
        this.selectedMenuIndex = 0;
        this.updateMenuSelection();

        Input.clearCallbacks();

        Input.onMove = (direction) => {
            if (direction === 'up') {
                this.selectedMenuIndex = Math.max(0, this.selectedMenuIndex - 1);
            } else if (direction === 'down') {
                this.selectedMenuIndex = Math.min(this.menuOptions.length - 1, this.selectedMenuIndex + 1);
            }
            this.updateMenuSelection();
        };

        Input.onAction = () => {
            this.selectMenuOption(this.menuOptions[this.selectedMenuIndex]);
        };

        Input.onAnyKey = null;
    },

    // Update menu selection visual
    updateMenuSelection() {
        const buttons = document.querySelectorAll('.menu-options .menu-btn');
        buttons.forEach((btn, i) => {
            btn.classList.toggle('selected', i === this.selectedMenuIndex);
        });
    },

    // Handle menu option selection
    selectMenuOption(action) {
        switch (action) {
            case 'new-game':
                this.showScreen('game');
                Game.startNewGame();
                break;
            case 'high-scores':
                this.showScreen('highscores');
                break;
            case 'how-to-play':
                this.showScreen('howtoplay');
                break;
        }
    },

    // Display high scores
    displayHighScores() {
        const list = document.getElementById('highscores-list');
        const scores = Storage.getHighScores();

        list.innerHTML = scores.map((score, i) => `
            <li>
                <span class="rank">${i + 1}.</span>
                <span class="initials">${score.initials}</span>
                <span class="score">${score.score}</span>
            </li>
        `).join('');
    },

    // Set up back button input
    setupBackInput() {
        Input.clearCallbacks();

        Input.onAction = () => {
            this.showScreen('menu');
        };

        Input.onMove = null;
        Input.onAnyKey = null;
    },

    // Set up game over input
    setupGameOverInput() {
        Input.clearCallbacks();

        Input.onAction = () => {
            // If high score input is visible and focused, don't handle action
            const initialsInput = document.getElementById('initials');
            if (document.activeElement === initialsInput) {
                return;
            }
        };

        Input.onMove = null;
        Input.onAnyKey = null;
    },

    // Set up button click handlers
    setupButtonHandlers() {
        // Menu buttons
        document.querySelectorAll('.menu-btn[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                this.handleButtonAction(action);
            });
        });

        // Back buttons
        document.querySelectorAll('.back-btn[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleButtonAction(action);
            });
        });

        // Menu option hover
        document.querySelectorAll('.menu-options .menu-btn').forEach((btn, i) => {
            btn.addEventListener('mouseenter', () => {
                if (this.currentScreen === 'menu') {
                    this.selectedMenuIndex = i;
                    this.updateMenuSelection();
                }
            });
        });
    },

    // Handle button actions
    handleButtonAction(action) {
        switch (action) {
            case 'new-game':
                this.selectMenuOption('new-game');
                break;
            case 'high-scores':
                this.selectMenuOption('high-scores');
                break;
            case 'how-to-play':
                this.selectMenuOption('how-to-play');
                break;
            case 'back-to-menu':
                this.showScreen('menu');
                break;
            case 'resume':
                Game.resume();
                break;
            case 'quit-to-menu':
                Game.quitToMenu();
                break;
            case 'next-level':
                Game.nextLevel();
                break;
            case 'save-score':
                Game.saveHighScore();
                break;
            case 'play-again':
                this.showScreen('game');
                Game.startNewGame();
                break;
        }
    }
};

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Main.init();
});
