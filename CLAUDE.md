# Number Noshers - Project Documentation for Claude

## Workflow

- **Always commit and push** after finishing a turn so the user can test via GitHub Pages

## Project Overview
A kid-friendly educational math game inspired by the classic "Number Noshers" from MECC. Players navigate a grid, "noshing" (eating) numbers that match mathematical rules while avoiding enemies called Troggles.

## How to Test
**This is a static SPA (Single Page Application)** - no build step or web server needed!
- Simply open `index.html` directly in a browser
- All JavaScript runs client-side
- No backend or npm dependencies required

## Project Structure

```
numbernoshers/
├── index.html          # Main HTML with all screens/UI
├── css/
│   └── styles.css      # All styles (responsive, animations, etc.)
├── js/
│   ├── main.js         # Entry point, screen management
│   ├── game.js         # Core game loop, state, scoring
│   ├── input.js        # Unified input (keyboard, mouse, touch, gamepad)
│   ├── grid.js         # 6x5 grid management, rendering
│   ├── nosher.js      # Player character logic
│   ├── troggle.js      # Enemy AI and movement
│   ├── pathfinding.js  # A* pathfinding for autopilot
│   ├── levels.js       # Level progression, rules, difficulty
│   ├── sound.js        # Audio management (music, SFX)
│   └── storage.js      # LocalStorage wrapper (settings, high scores)
└── assets/             # Sound files (MP3s)
```

## Architecture Pattern

### Screen-Based Navigation
- All screens are in `index.html` with class `.screen`
- Only one screen active at a time (`.active` class)
- `Main.showScreen(screenName)` handles transitions
- Screens: splash, menu, gamemode, game, gameover, highscores, howtoplay, settings

### Unified Input System (`input.js`)
Single input handler supports keyboard, mouse, touch, and gamepad via callbacks:
- `Input.onMove(direction)` - up/down/left/right navigation
- `Input.onAction()` - primary action (nosh/select)
- `Input.onPause()` - pause game
- `Input.onAnyKey()` - for splash screen
Game Loop Coordination (`gameloop.js`)
Tick-based system (default 800ms per tick) coordinates all game entities synchronously:
1. **TroggleSpawner** checks if new Troggles should spawn
2. **SafetySquares** updates expiration timers and flashing
3. **Troggles** plan moves, resolve conflicts, execute moves
4. **Collision detection** runs after Troggle movement
5. **Pathfinding** recalculates if autopilot active

**Important**: Use `GameLoop.pause()`/`GameLoop.resume()` for pausing, not just setting state flags.

### State Management
- `Main.currentScreen` - tracks active screen (string)
- `Game.state` - gameplay state: `'idle'`, `'playing'`, `'paused'`, `'gameover'`, `'levelcomplete'`
- `Main.cameFromPause` - boolean flag tracking if settings opened from pause menu (affects ESC key behavior)
// Example screen transition pattern
Main.showScreen('game');
Input.clearCallbacks();
Input.onMove = (dir) => { /* handle movement */ };
Input.onAction = () => { /* handle action */ };
```

### State Management
- `Main.currentScreen` - tracks active screen
- `Game.state` - gameplay state ('idle', 'playing', 'paused', 'gameover', 'levelcomplete')
- Settings auto-save to LocalStorage on change

## Key Components

### Game Modes (`levels.js`)
- **Multiples** - Find multiples of N (e.g., multiples of 3: 6, 9, 12...)
- **Factors** - Find factors of N (e.g., factors of 12: 1, 2, 3, 4, 6, 12)
- **Primes** - Find prime numbers in the grid
- **Equals** - Find math expressions that equal target N (grid shows "3 + 7", "2 × 5", etc.)
- **Not Equal** - Find math expressions that do NOT equal target N
- Mode selected via `gamemode` screen before starting game
- `Game.gameMode` stores current mode, passed through `Levels.getRuleText(level, mode)` and `Levels.generateGridNumbers(level, gridSize, mode)`
- For Equality/Inequality modes, grid cells contain expression strings; cells get `.expression-cell` CSS class for smaller font

### Grid System (`grid.js`)
6×5 grid with isometric 3D perspective using CSS transforms. Each cell: `{value, isCorrect, noshed, x, y}`

**Perspective projection**: The grid uses CSS `perspective` and `rotateX`/`rotateZ` transforms. When scaling, must project corner points through perspective transform to find true visual bounds (see `Grid.scaleToViewport()` comments).

```javascript
// Example cell access
const cell = Grid.cells[y * Grid.COLS + x];
if (!cell.noshed && cell.isCorrect) {
    // Valid move
}
```

### Nosher (`nosher.js`)
- Player character
- Simple x/y position tracking
- Movement validation (grid boundaries)
- CSS sprite positioned by `Grid.updateNosherPosition()`

### Troggle Types (`troggle.js`)
Five enemy types with distinct AI behaviors:
- **Reggie** (`👾`): Linear bounce movement
- **Bashful** (`👻`): Random movement, flees when Nosher close
- **Helper** (`🐛`): Eats correct answers (removes from board)
- **Worker** (`🔧`): Modifies/adds answers
- **Smartie** (`🤖`): A* pathfinding pursuit

Troggles spawned via `TroggleSpawner` on a schedule (not all at once). Check `troggle-spawner.js` for spawn timing.

### Safety Squares (`safety-squares.js`)
Protected cells that Troggles cannot enter. Key characteristics:
- Max 3 safety squares at a time
- Expire after 3-8 ticks (tick-based, not real-time)
- Flash in last tick before expiring
- Block Troggle pathfinding

### Settings (`main.js` + `storage.js`)
Settings save to LocalStorage immediately on change - **no explicit save button**. This is why the settings button says "Back" not "Save & Back".

```javascript
// Settings pattern used throughout
Storage.set('musicVolume', value);  // Saves immediately
Sound.setMusicVolume(value);         // Apply immediately
```

- Music volume, SFX volume, Mouse Autopilot
- Stored in LocalStorage
- ESC key closes settings and returns to previous screen

## Recent Bug Fixes (2026-01-28)

1. ✅ **Splash screen mouse click** - Now accepts clicks in addition to keyboard/touch
2. ✅ **Nosher centering** - Fixed CSS to properly center nosher in cell (was offset left/up)
3. ✅ **Settings button text** - Changed from "Save & Back" to just "Back" (settings auto-save)
4. ✅ **Settings ESC key** - ESC now closes settings, returns to pause menu or main menu
5. ✅ **Game over button alignment** - Buttons now centered (added flexbox to container)
6. ✅ **Pause menu ESC recovery** - Fixed ESC key not working after visiting settings from pause menu (re-setup input handlers)

## Important Patterns

### Input Patterns & Gotchas

### Pause State Management
Game has TWO pause concepts that must stay synchronized:
1. `Game.state = 'paused'` (internal state)
2. `#pause-overlay.active` (UI visibility)

When going to settings from pause menu:
```javascript
// Set flag to return to pause menu (not resume game)
Main.cameFromPause = true;

// On return from settings:
if (Main.cameFromPause) {
    Main.showScreen('game');  // Show game screen
    // Show pause overlay (don't resume)
    document.getElementById('pause-overlay').classList.add('active');
    Game.setupInputHandlers();  // Re-setup input handlers
    Main.cameFromPause = false;
}
```

### Nosher Positioning
Uses CSS transforms for smooth animation, not DOM position. Update via `Grid.updateNosherPosition(x, y)` which applies `translate()` transform.

### Testing Mode
Dev mode (`Ctrl+Shift+D` or `?dev=1`): Places one correct answer at (0,0) for rapid testing. Enabled via `Game.testingMode` boolean.

### Other GConventions
- CSS custom properties for theming (e.g., `--iso-preset`, `--iso-perspective`)
- Responsive sizing with `clamp()` and `min()` functions
- CSS Grid layout for game grid
- Animations via keyframes for performance
- Touch controls visibility auto-detected via `ontouchstart` check
### Screen Transitions
```javascript
Main.showScreen('screenName')
// Automatically:
// - Hides all screens
// - Shows requested screen
// - Sets up screen-specific input
```

## Common Gotchas

1. *ile Organization
- `main.js` - Entry point, screen management, settings UI
- `game.js` - Core game state, scoring, level progression
- `gameloop.js` - Tick-based coordination
- `grid.js` - Grid rendering, scaling, cell management
- `input.js` - Unified input abstraction
- `nosher.js` - Player character (simple x/y tracking)
- `troggle.js` - Enemy AI and movement
- `troggle-spawner.js` - Scheduled Troggle spawning
- `safety-squares.js` - Protected cell management
- `pathfinding.js` - A* for autopilot and Smartie Troggles
- `levels.js` - Game mode definitions, rule text, number generation
- `sound.js` - Audio management
- `storage.js` - LocalStorage wrapper

## F*Input Callbacks**: Always clear callbacks before setting new ones to avoid stacking
2. **Pause State**: Game has TWO pause concepts:
   - `Game.state = 'paused'` (internal state)
   - `#pause-overlay.active` (UI visibility)
   - Must manage both when transitioning to/from settings
3. **Nosher Positioning**: Uses CSS transforms, not DOM position, for smooth animation
4. **Settings**: Auto-save on change, no explicit "save" action needed
5. **Testing**: Just open `index.html` in browser - no server needed!

## Sound System
- Background music loops during gameplay/menu
- SFX for: move, nosh (correct/wrong), troggle hit, extra life, level complete
- Web Audio API with volume controls
- Requires user interaction to start (browser autoplay policy)

## Styling Notes
- CSS custom properties (variables) for theming
- Responsive design with `clamp()` and `min()` for sizing
- Animations: CSS keyframes for smooth, performant effects
- Grid uses CSS Grid layout
- Touch controls shown automatically on touch devices

## Future Considerations
- Currently all levels use single-digit numbers (1-99)
- Troggle count and speed scale with level
- Extra life every 10,000 points (max 9 lives)
- High scores stored in LocalStorage (top 10)

## Testing Checklist
- [ ] Splash screen: click, tap, or key press to start
- [ ] Nosher: properly centered in cell
- [ ] Settings: "Back" button text, ESC key works
- [ ] Game over: buttons centered
- [ ] Pause → Settings → ESC: returns to pause menu with working ESC key
- [ ] Pause → Settings → Back button: same as above
