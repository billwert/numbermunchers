/* =========================================
   SOUND - Web Audio API Chiptune System
   ========================================= */

const Sound = {
    // Audio context
    audioContext: null,

    // Volume levels (0-1)
    musicVolume: 0.5,
    sfxVolume: 0.7,

    // Music state
    musicPlaying: false,
    musicNodes: [],
    musicInterval: null,
    
    // Track if music should be playing (survives interruption)
    musicShouldBePlaying: false,

    // Storage key
    STORAGE_KEY: 'numberMunchersSoundSettings',

    // Initialize audio context (must be called after user interaction)
    init() {
        if (this.audioContext) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.loadSettings();
            
            // Listen for state changes to handle interruption recovery
            this.audioContext.onstatechange = () => {
                if (this.audioContext.state === 'running' && this.musicShouldBePlaying && !this.musicInterval) {
                    // Context resumed and music should be playing - restart it
                    this.startMusic();
                }
            };

            // Note: Visibility change is handled by Main.setupResumeOverlay()
            // which shows a "Tap to Continue" overlay to get the required user gesture
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    },

    // Ensure audio context is running (call after user gesture)
    resume() {
        if (!this.audioContext) return;
        
        // Handle both 'suspended' (desktop) and 'interrupted' (iOS Safari) states
        const state = this.audioContext.state;
        if (state !== 'running') {
            this.audioContext.resume().then(() => {
                // If music should be playing but interval stopped, restart it
                if (this.musicShouldBePlaying && !this.musicInterval) {
                    this.startMusic();
                }
            }).catch(e => {
                console.warn('Failed to resume audio:', e);
            });
        }
    },

    // Load settings from localStorage
    loadSettings() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                const settings = JSON.parse(data);
                this.musicVolume = settings.musicVolume ?? 0.5;
                this.sfxVolume = settings.sfxVolume ?? 0.7;
            }
        } catch (e) {
            console.warn('Failed to load sound settings:', e);
        }
    },

    // Save settings to localStorage
    saveSettings() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                musicVolume: this.musicVolume,
                sfxVolume: this.sfxVolume
            }));
        } catch (e) {
            console.warn('Failed to save sound settings:', e);
        }
    },

    // Set music volume
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    },

    // Set SFX volume
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    },

    /* -----------------------------------------
       SOUND EFFECTS
       ----------------------------------------- */

    // Play a simple tone
    playTone(frequency, duration, type = 'square', volume = 1) {
        if (!this.audioContext || this.sfxVolume === 0) return;

        // Ensure context is running (iOS may suspend it)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        const finalVolume = this.sfxVolume * volume * 0.3; // Keep it reasonable
        gainNode.gain.setValueAtTime(finalVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    },

    // Play a sequence of tones
    playSequence(notes, tempo = 0.1) {
        notes.forEach((note, i) => {
            setTimeout(() => {
                if (note.freq) {
                    this.playTone(note.freq, note.duration || 0.1, note.type || 'square', note.volume || 1);
                }
            }, i * tempo * 1000);
        });
    },

    // Move sound - soft blip
    playMove() {
        if (!this.audioContext || this.sfxVolume === 0) return;
        this.playTone(440, 0.05, 'sine', 0.3);
    },

    // Correct munch - chomping sound
    playMunchCorrect() {
        if (!this.audioContext || this.sfxVolume === 0) return;

        // Ensure context is running (iOS may suspend it)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Create a "chomp" sound with noise burst and pitch bend
        const now = this.audioContext.currentTime;
        
        // Main chomp oscillator - starts high, drops quickly
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        
        gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        
        osc.start(now);
        osc.stop(now + 0.12);
        
        // Second chomp for "om nom" effect
        const osc2 = this.audioContext.createOscillator();
        const gain2 = this.audioContext.createGain();
        
        osc2.connect(gain2);
        gain2.connect(this.audioContext.destination);
        
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(350, now + 0.08);
        osc2.frequency.exponentialRampToValueAtTime(60, now + 0.16);
        
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.setValueAtTime(this.sfxVolume * 0.35, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        osc2.start(now + 0.08);
        osc2.stop(now + 0.2);
    },

    // Incorrect munch - buzzer
    playMunchWrong() {
        if (!this.audioContext || this.sfxVolume === 0) return;

        // Low buzz
        this.playTone(150, 0.2, 'sawtooth', 0.6);
        setTimeout(() => {
            this.playTone(120, 0.15, 'sawtooth', 0.4);
        }, 100);
    },

    // Troggle collision - impact sound
    playTroggleHit() {
        if (!this.audioContext || this.sfxVolume === 0) return;

        // Descending "oof" sound
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.2);

        gain.gain.setValueAtTime(this.sfxVolume * 0.4, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.3);
    },

    // Level complete - victory fanfare
    playLevelComplete() {
        if (!this.audioContext || this.sfxVolume === 0) return;

        this.playSequence([
            { freq: 523, duration: 0.12 },  // C5
            { freq: 587, duration: 0.12 },  // D5
            { freq: 659, duration: 0.12 },  // E5
            { freq: 784, duration: 0.12 },  // G5
            { freq: 1047, duration: 0.3 }   // C6
        ], 0.1);
    },

    // Extra life - powerup sound
    playExtraLife() {
        if (!this.audioContext || this.sfxVolume === 0) return;

        this.playSequence([
            { freq: 440, duration: 0.1 },
            { freq: 554, duration: 0.1 },
            { freq: 659, duration: 0.1 },
            { freq: 880, duration: 0.2 }
        ], 0.08);
    },

    // Menu select - click sound
    playMenuSelect() {
        if (!this.audioContext || this.sfxVolume === 0) return;
        this.playTone(880, 0.08, 'square', 0.4);
    },

    // Game over - sad descending
    playGameOver() {
        if (!this.audioContext || this.sfxVolume === 0) return;

        this.playSequence([
            { freq: 392, duration: 0.2, type: 'triangle' },  // G4
            { freq: 349, duration: 0.2, type: 'triangle' },  // F4
            { freq: 330, duration: 0.2, type: 'triangle' },  // E4
            { freq: 262, duration: 0.4, type: 'triangle' }   // C4
        ], 0.2);
    },

    /* -----------------------------------------
       BACKGROUND MUSIC - Level-Based Variation
       ----------------------------------------- */

    // Melody patterns for different level ranges
    melodyPatterns: {
        // Levels 1-3: Simple, cheerful
        simple: [
            523, 523, 784, 784, 880, 880, 784, 0,
            698, 698, 659, 659, 587, 587, 523, 0
        ],
        // Levels 4-6: March rhythm
        march: [
            523, 0, 523, 0, 659, 0, 784, 0,
            880, 0, 784, 0, 659, 0, 523, 0,
            587, 0, 659, 0, 698, 0, 784, 0,
            880, 880, 784, 784, 659, 659, 523, 0
        ],
        // Levels 7-9: Chase feeling
        chase: [
            523, 587, 659, 698, 784, 880, 988, 1047,
            988, 880, 784, 698, 659, 587, 523, 0,
            698, 784, 880, 988, 880, 784, 698, 0,
            523, 659, 784, 880, 784, 659, 523, 0
        ],
        // Level 10+: Intense
        intense: [
            523, 0, 659, 0, 784, 0, 988, 0,
            1047, 988, 880, 784, 659, 523, 440, 0,
            523, 659, 784, 988, 1047, 988, 784, 0,
            880, 784, 659, 523, 440, 392, 349, 0
        ]
    },

    // Bass patterns
    bassPatterns: {
        simple: [
            131, 0, 196, 0, 220, 0, 196, 0,
            175, 0, 165, 0, 147, 0, 131, 0
        ],
        march: [
            131, 131, 0, 0, 165, 165, 0, 0,
            175, 175, 0, 0, 196, 196, 0, 0,
            147, 147, 0, 0, 165, 165, 0, 0,
            175, 0, 196, 0, 165, 0, 131, 0
        ],
        chase: [
            131, 196, 131, 196, 131, 196, 131, 196,
            175, 220, 175, 220, 175, 220, 175, 0,
            147, 196, 147, 196, 147, 196, 147, 0,
            131, 165, 196, 220, 196, 165, 131, 0
        ],
        intense: [
            131, 0, 165, 0, 196, 0, 247, 0,
            262, 247, 220, 196, 165, 131, 110, 0,
            131, 165, 196, 247, 262, 247, 196, 0,
            220, 196, 165, 131, 110, 98, 87, 0
        ]
    },

    // Current music state
    currentMelody: null,
    currentBass: null,
    currentWaveform: 'square',
    currentTempo: 150,
    currentNoteIndex: 0,
    currentLevel: 1,

    // Get pattern name for level
    getPatternForLevel(level) {
        if (level <= 3) return 'simple';
        if (level <= 6) return 'march';
        if (level <= 9) return 'chase';
        return 'intense';
    },

    // Get waveform for level (cycles every 4 levels)
    getWaveformForLevel(level) {
        const cycle = (level - 1) % 4;
        return ['square', 'sawtooth', 'triangle', 'sine'][cycle];
    },

    // Get tempo for level (faster at higher levels)
    getTempoForLevel(level) {
        const baseTempo = 180;  // ms between notes
        const minTempo = 100;    // fastest
        const reduction = (level - 1) * 8;
        return Math.max(minTempo, baseTempo - reduction);
    },

    // Start music (legacy - uses level 1 settings)
    startMusic() {
        this.startMusicForLevel(this.currentLevel || 1);
    },

    // Start music with level-specific settings
    startMusicForLevel(level) {
        if (!this.audioContext || this.musicPlaying) return;

        this.currentLevel = level;
        const pattern = this.getPatternForLevel(level);
        this.currentMelody = this.melodyPatterns[pattern];
        this.currentBass = this.bassPatterns[pattern];
        this.currentWaveform = this.getWaveformForLevel(level);
        this.currentTempo = this.getTempoForLevel(level);

        this.musicPlaying = true;
        this.musicShouldBePlaying = true;
        this.currentNoteIndex = 0;

        const noteDuration = this.currentTempo / 1000; // Convert to seconds

        this.musicInterval = setInterval(() => {
            if (!this.musicPlaying || this.musicVolume === 0) return;

            // Don't try to play if context isn't running
            if (this.audioContext.state !== 'running') return;

            const melodyFreq = this.currentMelody[this.currentNoteIndex % this.currentMelody.length];
            const bassFreq = this.currentBass[this.currentNoteIndex % this.currentBass.length];

            // Play melody note
            if (melodyFreq > 0) {
                this.playMusicNote(melodyFreq, noteDuration, this.currentWaveform, 0.3);
            }

            // Play bass note (always triangle for consistency)
            if (bassFreq > 0) {
                this.playMusicNote(bassFreq, noteDuration * 1.5, 'triangle', 0.4);
            }

            this.currentNoteIndex++;
        }, this.currentTempo);
    },

    // Update music when level changes
    updateMusicForLevel(level) {
        if (level === this.currentLevel && this.musicPlaying) return;

        const wasPlaying = this.musicShouldBePlaying;
        this.stopMusic();

        if (wasPlaying) {
            this.startMusicForLevel(level);
        } else {
            this.currentLevel = level;
        }
    },

    // Play a music note (separate from SFX)
    playMusicNote(frequency, duration, type = 'square', volume = 1) {
        if (!this.audioContext || this.musicVolume === 0) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        const finalVolume = this.musicVolume * volume * 0.15;
        gainNode.gain.setValueAtTime(finalVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    },

    // Stop background music
    stopMusic() {
        this.musicPlaying = false;
        this.musicShouldBePlaying = false;
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    },

    // Toggle music
    toggleMusic() {
        if (this.musicPlaying) {
            this.stopMusic();
        } else {
            this.startMusic();
        }
    }
};
