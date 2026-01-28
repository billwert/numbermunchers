/* =========================================
   INPUT - Unified Input Handler
   Supports: Keyboard, Mouse, Gamepad, Touch
   ========================================= */

const Input = {
    // Callbacks
    onMove: null,      // (direction) => {}  direction: 'up', 'down', 'left', 'right'
    onAction: null,    // () => {}  (munch/select)
    onPause: null,     // () => {}
    onAnyKey: null,    // () => {}

    // State
    enabled: true,
    gamepadIndex: null,
    lastGamepadState: null,
    touchStartX: 0,
    touchStartY: 0,
    swipeThreshold: 30,

    // Gamepad polling interval
    gamepadPollInterval: null,

    init() {
        this.setupKeyboard();
        this.setupMouse();
        this.setupTouch();
        this.setupGamepad();
    },

    // Enable/disable input
    setEnabled(enabled) {
        this.enabled = enabled;
    },

    /* -----------------------------------------
       KEYBOARD INPUT
       ----------------------------------------- */
    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;

            // Check if user is typing in an input field
            const activeEl = document.activeElement;
            const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

            // Any key callback (for splash screen) - but not when typing
            if (this.onAnyKey && !isTyping) {
                this.onAnyKey();
                return; // Don't process this key further
            }

            // Don't capture game keys when typing in an input
            if (isTyping) {
                // Allow Escape to blur the input
                if (e.key === 'Escape') {
                    activeEl.blur();
                    return;
                }
                // Allow Enter to trigger action (e.g., save high score)
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (this.onAction) this.onAction();
                    return;
                }
                // Allow arrow up/down to navigate away from input
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    activeEl.blur();
                    if (this.onMove) this.onMove(e.key === 'ArrowUp' ? 'up' : 'down');
                    return;
                }
                // Other keys: let the input handle them normally
                return;
            }

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    if (this.onMove) this.onMove('up');
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    if (this.onMove) this.onMove('down');
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    if (this.onMove) this.onMove('left');
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    if (this.onMove) this.onMove('right');
                    break;
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    if (this.onAction) this.onAction();
                    break;
                case 'Escape':
                case 'p':
                case 'P':
                    e.preventDefault();
                    if (this.onPause) this.onPause();
                    break;
            }
        });
    },

    /* -----------------------------------------
       MOUSE INPUT
       ----------------------------------------- */
    setupMouse() {
        // Mouse clicks are handled by individual elements (menu buttons, grid cells)
        // This is set up in main.js and game.js
    },

    // Helper: Handle grid cell click
    handleGridClick(cellX, cellY, muncherX, muncherY) {
        if (!this.enabled) return;

        // If clicking on muncher's cell, munch
        if (cellX === muncherX && cellY === muncherY) {
            if (this.onAction) this.onAction();
            return;
        }

        // If clicking adjacent cell, move there
        const dx = cellX - muncherX;
        const dy = cellY - muncherY;

        if (Math.abs(dx) + Math.abs(dy) === 1) {
            if (dx === 1 && this.onMove) this.onMove('right');
            else if (dx === -1 && this.onMove) this.onMove('left');
            else if (dy === 1 && this.onMove) this.onMove('down');
            else if (dy === -1 && this.onMove) this.onMove('up');
        }
    },

    /* -----------------------------------------
       TOUCH INPUT
       ----------------------------------------- */
    setupTouch() {
        // iOS requires AudioContext to be created/resumed on touchend or click
        // Also need to resume after app returns from background
        const ensureSoundActive = () => {
            if (typeof Sound !== 'undefined') {
                Sound.init();
                Sound.resume();
            }
        };

        // Resume sound on any click/touchend (handles both init and background resume)
        document.addEventListener('click', ensureSoundActive, { capture: true });
        document.addEventListener('touchend', ensureSoundActive, { passive: true });

        // Swipe detection
        document.addEventListener('touchstart', (e) => {
            if (!this.enabled) return;

            // Any touch callback (for splash screen)
            if (this.onAnyKey) {
                this.onAnyKey();
            }

            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!this.enabled) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const dx = touchEndX - this.touchStartX;
            const dy = touchEndY - this.touchStartY;

            // Check if it's a swipe (not a tap)
            if (Math.abs(dx) > this.swipeThreshold || Math.abs(dy) > this.swipeThreshold) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    // Horizontal swipe
                    if (dx > 0 && this.onMove) this.onMove('right');
                    else if (this.onMove) this.onMove('left');
                } else {
                    // Vertical swipe
                    if (dy > 0 && this.onMove) this.onMove('down');
                    else if (this.onMove) this.onMove('up');
                }
            }
        }, { passive: true });

        // Grid cell touch handlers are set up in grid.js via click events
        // (click events fire on touch too after touchend)
    },

    /* -----------------------------------------
       GAMEPAD INPUT
       ----------------------------------------- */
    setupGamepad() {
        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad.id);
            this.gamepadIndex = e.gamepad.index;
            this.startGamepadPolling();
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            console.log('Gamepad disconnected');
            if (this.gamepadIndex === e.gamepad.index) {
                this.gamepadIndex = null;
                this.stopGamepadPolling();
            }
        });
    },

    startGamepadPolling() {
        if (this.gamepadPollInterval) return;

        this.gamepadPollInterval = setInterval(() => {
            this.pollGamepad();
        }, 100); // Poll at 10Hz for responsive but not too sensitive input
    },

    stopGamepadPolling() {
        if (this.gamepadPollInterval) {
            clearInterval(this.gamepadPollInterval);
            this.gamepadPollInterval = null;
        }
    },

    pollGamepad() {
        if (this.gamepadIndex === null || !this.enabled) return;

        const gamepad = navigator.getGamepads()[this.gamepadIndex];
        if (!gamepad) return;

        const current = {
            up: gamepad.buttons[12]?.pressed || gamepad.axes[1] < -0.5,
            down: gamepad.buttons[13]?.pressed || gamepad.axes[1] > 0.5,
            left: gamepad.buttons[14]?.pressed || gamepad.axes[0] < -0.5,
            right: gamepad.buttons[15]?.pressed || gamepad.axes[0] > 0.5,
            action: gamepad.buttons[0]?.pressed, // A button
            pause: gamepad.buttons[9]?.pressed   // Start button
        };

        const last = this.lastGamepadState || {};

        // Check for newly pressed buttons (edge detection)
        if (current.up && !last.up && this.onMove) this.onMove('up');
        if (current.down && !last.down && this.onMove) this.onMove('down');
        if (current.left && !last.left && this.onMove) this.onMove('left');
        if (current.right && !last.right && this.onMove) this.onMove('right');
        if (current.action && !last.action) {
            if (this.onAnyKey) this.onAnyKey();
            if (this.onAction) this.onAction();
        }
        if (current.pause && !last.pause && this.onPause) this.onPause();

        this.lastGamepadState = current;
    },

    // Clear all callbacks
    clearCallbacks() {
        this.onMove = null;
        this.onAction = null;
        this.onPause = null;
        this.onAnyKey = null;
    }
};
