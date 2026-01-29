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
- Screens: splash, menu, game, gameover, highscores, howtoplay, settings

### Input System
- **Unified input handler** in `input.js`
- Callbacks: `onMove`, `onAction`, `onPause`, `onAnyKey`
- Each screen sets up its own input callbacks via `Input.clearCallbacks()`
- Supports keyboard, mouse, touch, and gamepad

### State Management
- `Main.currentScreen` - tracks active screen
- `Game.state` - gameplay state ('idle', 'playing', 'paused', 'gameover', 'levelcomplete')
- Settings auto-save to LocalStorage on change

## Key Components

### Grid System (`grid.js`)
- 6 columns × 5 rows
- Each cell: `{value, isCorrect, noshed, x, y}`
- Nosher sprite positioned absolutely with CSS transforms
- Cell clicks support both direct movement and autopilot pathfinding

### Nosher (`nosher.js`)
- Player character
- Simple x/y position tracking
- Movement validation (grid boundaries)
- CSS sprite positioned by `Grid.updateNosherPosition()`

### Troggles (`troggle.js`)
- Enemies that chase the player
- Use A* pathfinding to navigate around noshed cells
- Speed increases with level
- Movement handled by `setInterval` with configurable speed

### Settings (`main.js` + `storage.js`)
- **Settings are always saved** (auto-save pattern)
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

### Input Handler Setup
When switching screens, **always**:
1. Call `Input.clearCallbacks()` first
2. Set new callbacks for current screen
3. When returning to game from settings during pause, call `Game.setupInputHandlers()`

### Pause Menu from Settings
Track with `Main.cameFromPause` flag:
- `true` when opening settings from pause menu
- Return to pause overlay (not resume game) when closing
- Re-setup game input handlers on return

### Screen Transitions
```javascript
Main.showScreen('screenName')
// Automatically:
// - Hides all screens
// - Shows requested screen
// - Sets up screen-specific input
```

## Common Gotchas

1. **Input Callbacks**: Always clear callbacks before setting new ones to avoid stacking
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
