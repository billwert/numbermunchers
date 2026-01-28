/* =========================================
   STORAGE - High Score Management
   ========================================= */

const Storage = {
    STORAGE_KEY: 'numberMunchersHighScores',
    MAX_SCORES: 10,

    // Get all high scores
    getHighScores() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.warn('Failed to load high scores:', e);
        }
        return this.getDefaultScores();
    },

    // Default scores for new players
    getDefaultScores() {
        return [
            { initials: 'ACE', score: 500 },
            { initials: 'PRO', score: 400 },
            { initials: 'WIZ', score: 300 },
            { initials: 'FUN', score: 200 },
            { initials: 'YAY', score: 100 }
        ];
    },

    // Save high scores
    saveHighScores(scores) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(scores));
        } catch (e) {
            console.warn('Failed to save high scores:', e);
        }
    },

    // Check if score qualifies for high score list
    isHighScore(score) {
        const scores = this.getHighScores();
        if (scores.length < this.MAX_SCORES) {
            return score > 0;
        }
        return score > scores[scores.length - 1].score;
    },

    // Add a new high score
    addHighScore(initials, score) {
        const scores = this.getHighScores();

        // Sanitize initials
        initials = (initials || 'AAA').toUpperCase().slice(0, 3).padEnd(3, 'A');

        // Add new score
        scores.push({ initials, score });

        // Sort by score descending
        scores.sort((a, b) => b.score - a.score);

        // Keep only top scores
        const trimmedScores = scores.slice(0, this.MAX_SCORES);

        this.saveHighScores(trimmedScores);
        return trimmedScores;
    },

    // Get the rank of a score (1-indexed, or -1 if not ranked)
    getScoreRank(score) {
        const scores = this.getHighScores();
        for (let i = 0; i < scores.length; i++) {
            if (score >= scores[i].score) {
                return i + 1;
            }
        }
        if (scores.length < this.MAX_SCORES) {
            return scores.length + 1;
        }
        return -1;
    }
};
