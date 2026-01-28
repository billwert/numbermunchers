/* =========================================
   MAIN - Entry Point & Screen Management
   ========================================= */

const Main = {
    currentScreen: 'splash',
    selectedMenuIndex: 0,
    menuOptions: ['new-game', 'high-scores', 'how-to-play', 'settings'],
    cameFromPause: false,  // Track if settings was opened from pause menu

    init() {
        // Initialize input system
        Input.init();

        // Initialize game
        Game.init();

        // Load saved game settings
        this.loadGameSettings();

        // Set up button click handlers
        this.setupButtonHandlers();

        // Set up settings UI
        this.setupSettingsUI();

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
            case 'settings':
                this.loadSettingsUI();
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
        
        // Add click handler for splash screen
        const splashScreen = document.getElementById('splash-screen');
        const splashClickHandler = () => {
            if (this.currentScreen === 'splash') {
                this.showScreen('menu');
            }
        };
        splashScreen.addEventListener('click', splashClickHandler);
    },

    // Set up menu input
    setupMenuInput() {
        this.selectedMenuIndex = 0;
        this.updateMenuSelection();

        // Start background music on menu (requires user interaction first)
        Sound.init();
        Sound.resume();
        Sound.startMusic();

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
        Sound.playMenuSelect();

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
            case 'settings':
                this.showScreen('settings');
                break;
        }
    },

    // Display high scores
    displayHighScores() {
        const list = document.getElementById('highscores-list');
        const scores = Storage.getHighScores();

        list.innerHTML = scores.map((entry, i) => `
            <li>
                <span class="rank">${i + 1}.</span>
                <span class="player-name">${entry.name || entry.initials || 'Player'}</span>
                <span class="score">${entry.score}</span>
            </li>
        `).join('');
    },

    // Set up back button input
    setupBackInput() {
        Input.clearCallbacks();

        Input.onAction = () => {
            this.showScreen('menu');
        };
        
        // Add ESC key support for settings screen
        Input.onPause = () => {
            if (this.currentScreen === 'settings') {
                // Return from settings
                if (this.cameFromPause) {
                    // Return to paused game from settings
                    this.cameFromPause = false;
                    this.showScreen('game');
                    document.getElementById('pause-overlay').classList.add('active');
                    // Re-setup game input handlers including pause
                    Game.setupInputHandlers();
                } else {
                    this.showScreen('menu');
                }
            }
        };

        Input.onMove = null;
        Input.onAnyKey = null;
    },

    // Set up game over input
    setupGameOverInput() {
        Input.clearCallbacks();
        
        // Track which item is selected (-1 = name input, 0+ = buttons)
        // Start at -1 (name input) if high score, otherwise 0 (first button)
        const newHighscoreDiv = document.getElementById('new-highscore');
        const isHighScore = !newHighscoreDiv.classList.contains('hidden');
        this.gameOverSelectedIndex = isHighScore ? -1 : 0;
        this.updateGameOverSelection();

        Input.onMove = (direction) => {
            const items = this.getGameOverItems();
            if (direction === 'up') {
                this.gameOverSelectedIndex = Math.max(-1, this.gameOverSelectedIndex - 1);
                // Skip -1 if no high score input
                if (this.gameOverSelectedIndex === -1 && !this.isHighScoreInputVisible()) {
                    this.gameOverSelectedIndex = 0;
                }
            } else if (direction === 'down') {
                this.gameOverSelectedIndex = Math.min(items.length - 1, this.gameOverSelectedIndex + 1);
            }
            this.updateGameOverSelection();
        };

        Input.onAction = () => {
            const nameInput = document.getElementById('player-name');
            
            // If name input is selected, focus it or save if already focused
            if (this.gameOverSelectedIndex === -1) {
                if (document.activeElement === nameInput) {
                    Game.saveHighScore();
                    nameInput.blur();
                    this.gameOverSelectedIndex = 0;
                    this.updateGameOverSelection();
                } else {
                    nameInput.focus();
                }
                return;
            }
            
            // Otherwise activate the selected button
            const items = this.getGameOverItems();
            if (items[this.gameOverSelectedIndex]) {
                const action = items[this.gameOverSelectedIndex].dataset.action;
                this.handleButtonAction(action);
            }
        };

        Input.onAnyKey = null;
    },
    
    // Check if high score input is visible
    isHighScoreInputVisible() {
        const newHighscoreDiv = document.getElementById('new-highscore');
        return !newHighscoreDiv.classList.contains('hidden');
    },
    
    // Get visible game over buttons (not including name input)
    getGameOverItems() {
        const newHighscoreDiv = document.getElementById('new-highscore');
        const isHighScore = !newHighscoreDiv.classList.contains('hidden');
        const saveScoreBtn = document.querySelector('#new-highscore .menu-btn[data-action="save-score"]');
        
        const buttons = [];
        if (isHighScore && saveScoreBtn) {
            buttons.push(saveScoreBtn);
        }
        buttons.push(document.querySelector('#gameover-screen > .gameover-content > .menu-btn[data-action="play-again"]'));
        buttons.push(document.querySelector('#gameover-screen > .gameover-content > .menu-btn[data-action="back-to-menu"]'));
        return buttons.filter(b => b !== null);
    },
    
    // Update game over selection visual
    updateGameOverSelection() {
        const nameInput = document.getElementById('player-name');
        const nameInputContainer = document.querySelector('#new-highscore .name-input');
        const items = this.getGameOverItems();
        
        // Handle name input highlight
        if (nameInputContainer) {
            nameInputContainer.classList.toggle('selected', this.gameOverSelectedIndex === -1);
            if (this.gameOverSelectedIndex === -1) {
                nameInput.focus();
            } else {
                nameInput.blur();
            }
        }
        
        // Handle button highlights
        items.forEach((btn, i) => {
            btn.classList.toggle('selected', i === this.gameOverSelectedIndex);
        });
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
        
        // Game over button hover
        document.querySelectorAll('#gameover-screen .menu-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                if (this.currentScreen === 'gameover') {
                    const buttons = this.getGameOverButtons();
                    const index = buttons.indexOf(btn);
                    if (index !== -1) {
                        this.gameOverSelectedIndex = index;
                        this.updateGameOverSelection();
                    }
                }
            });
        });
        
        // Level complete overlay - click anywhere to continue
        document.getElementById('level-complete-overlay').addEventListener('click', () => {
            if (typeof Game !== 'undefined' && Game.state === 'levelcomplete') {
                this.handleButtonAction('next-level');
            }
        });
    },

    // Handle button actions
    handleButtonAction(action) {
        Sound.playMenuSelect();

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
            case 'settings':
                this.selectMenuOption('settings');
                break;
            case 'back-to-menu':
                if (this.cameFromPause) {
                    // Return to paused game from settings
                    this.cameFromPause = false;
                    this.showScreen('game');
                    document.getElementById('pause-overlay').classList.add('active');
                    // Re-setup game input handlers including pause
                    Game.setupInputHandlers();
                } else {
                    this.showScreen('menu');
                }
                break;
            case 'pause-settings':
                // Open settings from pause menu
                this.cameFromPause = true;
                document.getElementById('pause-overlay').classList.remove('active');
                this.showScreen('settings');
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
                // Reset selection to first available button (Play Again)
                this.gameOverSelectedIndex = 0;
                this.updateGameOverSelection();
                break;
            case 'play-again':
                this.showScreen('game');
                Game.startNewGame();
                break;
        }
    },

    // Set up settings UI event handlers
    setupSettingsUI() {
        const musicSlider = document.getElementById('music-volume');
        const sfxSlider = document.getElementById('sfx-volume');
        const musicDisplay = document.getElementById('music-volume-display');
        const sfxDisplay = document.getElementById('sfx-volume-display');
        const autopilotCheckbox = document.getElementById('mouse-autopilot');

        // Music volume
        musicSlider.addEventListener('input', () => {
            const value = parseInt(musicSlider.value);
            musicDisplay.textContent = value + '%';
            Sound.setMusicVolume(value / 100);
        });

        // SFX volume
        sfxSlider.addEventListener('input', () => {
            const value = parseInt(sfxSlider.value);
            sfxDisplay.textContent = value + '%';
            Sound.setSfxVolume(value / 100);
            // Play test sound
            Sound.playMove();
        });

        // Mouse autopilot
        autopilotCheckbox.addEventListener('change', () => {
            if (typeof Game !== 'undefined') {
                Game.mouseAutopilot = autopilotCheckbox.checked;
                Storage.saveSettings({ mouseAutopilot: autopilotCheckbox.checked });
            }
        });

        // Testing mode
        const testingModeCheckbox = document.getElementById('testing-mode');
        testingModeCheckbox.addEventListener('change', () => {
            if (typeof Game !== 'undefined') {
                Game.testingMode = testingModeCheckbox.checked;
                Storage.saveSettings({ testingMode: testingModeCheckbox.checked });
            }
        });
    },

    // Load settings values into UI
    loadSettingsUI() {
        // Initialize sound if not already (requires user interaction)
        Sound.init();
        Sound.resume();

        const musicSlider = document.getElementById('music-volume');
        const sfxSlider = document.getElementById('sfx-volume');
        const musicDisplay = document.getElementById('music-volume-display');
        const sfxDisplay = document.getElementById('sfx-volume-display');
        const autopilotCheckbox = document.getElementById('mouse-autopilot');
        const testingModeCheckbox = document.getElementById('testing-mode');

        // Load current values
        const musicValue = Math.round(Sound.musicVolume * 100);
        const sfxValue = Math.round(Sound.sfxVolume * 100);

        musicSlider.value = musicValue;
        sfxSlider.value = sfxValue;
        musicDisplay.textContent = musicValue + '%';
        sfxDisplay.textContent = sfxValue + '%';

        // Load settings from storage
        const settings = Storage.getSettings();
        if (typeof Game !== 'undefined') {
            Game.mouseAutopilot = settings.mouseAutopilot || false;
            Game.testingMode = settings.testingMode || false;
        }
        autopilotCheckbox.checked = settings.mouseAutopilot || false;
        testingModeCheckbox.checked = settings.testingMode || false;
    },

    // Load settings when app starts (for game settings that need to persist)
    loadGameSettings() {
        const settings = Storage.getSettings();
        if (typeof Game !== 'undefined') {
            Game.mouseAutopilot = settings.mouseAutopilot || false;
            Game.testingMode = settings.testingMode || false;
        }
    }
};

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Main.init();
});
