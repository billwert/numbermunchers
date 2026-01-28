/* =========================================
   LEVELS - Level Progression & Number Generation
   ========================================= */

const Levels = {
    // Multiples to use at each level (cycles through)
    multiplesSequence: [2, 5, 3, 4, 6, 7, 8, 9, 10, 11, 12],

    // Get the multiple for a given level
    getMultiple(level) {
        const index = (level - 1) % this.multiplesSequence.length;
        return this.multiplesSequence[index];
    },

    // Get the rule text for display
    getRuleText(level) {
        const multiple = this.getMultiple(level);
        return `Multiples of ${multiple}`;
    },

    // Generate numbers for the grid
    generateGridNumbers(level, gridSize = 30) {
        const multiple = this.getMultiple(level);
        const numbers = [];

        // Determine how many correct answers to include (40-60% of grid)
        const minCorrect = Math.floor(gridSize * 0.35);
        const maxCorrect = Math.floor(gridSize * 0.55);
        const correctCount = minCorrect + Math.floor(Math.random() * (maxCorrect - minCorrect + 1));

        // Generate correct multiples
        const correctNumbers = this.generateMultiples(multiple, correctCount, level);

        // Generate incorrect numbers (not multiples)
        const incorrectCount = gridSize - correctCount;
        const incorrectNumbers = this.generateNonMultiples(multiple, incorrectCount, level);

        // Combine and shuffle
        const allNumbers = [
            ...correctNumbers.map(n => ({ value: n, isCorrect: true })),
            ...incorrectNumbers.map(n => ({ value: n, isCorrect: false }))
        ];

        return this.shuffle(allNumbers);
    },

    // Generate multiples of a number
    generateMultiples(base, count, level) {
        const multiples = [];
        const maxMultiplier = Math.min(12 + level, 20); // Increase range with level

        // Generate pool of possible multiples
        const pool = [];
        for (let i = 1; i <= maxMultiplier; i++) {
            pool.push(base * i);
        }

        // Pick random multiples from pool
        const shuffledPool = this.shuffle([...pool]);
        for (let i = 0; i < count && i < shuffledPool.length; i++) {
            multiples.push(shuffledPool[i]);
        }

        // If we need more, allow repeats
        while (multiples.length < count) {
            multiples.push(pool[Math.floor(Math.random() * pool.length)]);
        }

        return multiples;
    },

    // Generate non-multiples of a number
    generateNonMultiples(base, count, level) {
        const nonMultiples = [];
        const maxValue = base * (12 + level);

        // Generate numbers that are NOT multiples of base
        let attempts = 0;
        while (nonMultiples.length < count && attempts < 1000) {
            const num = Math.floor(Math.random() * maxValue) + 1;
            if (num % base !== 0) {
                nonMultiples.push(num);
            }
            attempts++;
        }

        // Fill remaining with guaranteed non-multiples
        while (nonMultiples.length < count) {
            // Pick a number that's definitely not a multiple
            const offset = Math.floor(Math.random() * (base - 1)) + 1; // 1 to base-1
            const multiplier = Math.floor(Math.random() * 10) + 1;
            nonMultiples.push(base * multiplier + offset);
        }

        return nonMultiples;
    },

    // Fisher-Yates shuffle
    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    // Get Troggle count for level
    getTroggleCount(level) {
        if (level <= 2) return 1;
        if (level <= 5) return 2;
        if (level <= 10) return 3;
        return Math.min(4, 1 + Math.floor(level / 4));
    },

    // Get Troggle speed multiplier for level
    getTroggleSpeed(level) {
        // Base speed is 1, increases gradually
        return 1 + (level - 1) * 0.1;
    },

    // Points for correct munch
    getPointsForMunch(level) {
        return 5 + Math.floor(level / 3);
    },

    // Bonus points for clearing all correct numbers
    getLevelClearBonus(level) {
        return 50 + level * 10;
    },

    // Score threshold for extra life
    getExtraLifeThreshold() {
        return 100;
    },

    // Get encouraging message based on performance
    getEncouragingMessage(correctInARow) {
        const messages = {
            1: ['Nice!', 'Good!', 'Yes!'],
            3: ['Great job!', 'Awesome!', 'Keep going!'],
            5: ['Amazing!', 'Fantastic!', 'You rock!'],
            7: ['Incredible!', 'Superstar!', 'On fire!'],
            10: ['UNSTOPPABLE!', 'LEGENDARY!', 'GENIUS!']
        };

        let selectedMessages = messages[1];
        for (const threshold of Object.keys(messages).map(Number).sort((a, b) => b - a)) {
            if (correctInARow >= threshold) {
                selectedMessages = messages[threshold];
                break;
            }
        }

        return selectedMessages[Math.floor(Math.random() * selectedMessages.length)];
    },

    // Get message for wrong answer
    getWrongMessage() {
        const messages = [
            'Oops!',
            'Try again!',
            'Not quite!',
            'Careful!',
            'Watch out!'
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }
};
