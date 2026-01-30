/* =========================================
   LEVELS - Level Progression & Number Generation
   ========================================= */

const Levels = {
    // ── Game Mode Definitions ──────────────────────────
    gameModes: {
        multiples: {
            id: 'multiples',
            name: 'Multiples',
            icon: '\u2716\uFE0F',
            description: 'Find numbers that are multiples of the given number. A multiple is what you get when you multiply a number by 1, 2, 3, and so on.',
            examples: ['Multiples of 3: 3, 6, 9, 12, 15\u2026', 'Multiples of 5: 5, 10, 15, 20, 25\u2026']
        },
        factors: {
            id: 'factors',
            name: 'Factors',
            icon: '\u2797',
            description: 'Find numbers that divide evenly into the given number. Factors are numbers that go into another number with no remainder.',
            examples: ['Factors of 12: 1, 2, 3, 4, 6, 12', 'Factors of 18: 1, 2, 3, 6, 9, 18']
        },
        primes: {
            id: 'primes',
            name: 'Primes',
            icon: '\uD83D\uDD22',
            description: 'Find the prime numbers! A prime number is greater than 1 and can only be divided evenly by 1 and itself.',
            examples: ['Primes: 2, 3, 5, 7, 11, 13, 17, 19, 23\u2026', 'NOT prime: 1, 4, 6, 8, 9, 10, 12\u2026']
        },
        equality: {
            id: 'equality',
            name: 'Equals',
            icon: '\uD83D\uDFF0',
            description: 'Find the math expressions that equal the target number. Look at each expression and figure out if it equals the target!',
            examples: ['Equals 10: "3 + 7", "15 \u2212 5", "2 \u00D7 5"', 'NOT 10: "3 + 5", "20 \u2212 8", "4 \u00D7 4"']
        },
        inequality: {
            id: 'inequality',
            name: 'Not Equal',
            icon: '\uD83D\uDEAB',
            description: 'Find the math expressions that do NOT equal the target number. Watch out \u2014 this one is tricky because you need to find the ones that are WRONG!',
            examples: ['NOT 10: "3 + 5" = 8 \u2714', '"2 \u00D7 5" = 10 \u2716 (skip this one!)']
        }
    },
    gameModeOrder: ['multiples', 'factors', 'primes', 'equality', 'inequality'],

    // ── Mode-Specific Level Sequences ──────────────────
    multiplesSequence: [2, 5, 3, 4, 6, 7, 8, 9, 10, 11, 12],
    factorsSequence: [12, 18, 24, 30, 36, 48, 42, 60, 56, 72, 84],
    primesRanges: [20, 30, 50, 50, 75, 75, 100, 100, 150, 150, 200],
    equalityTargets: [5, 10, 8, 12, 15, 20, 18, 24, 25, 30, 36],

    // ── Dispatch Methods ───────────────────────────────

    // Get the rule text for display
    getRuleText(level, mode = 'multiples') {
        switch (mode) {
            case 'multiples':
                return `Multiples of ${this.getMultiple(level)}`;
            case 'factors':
                return `Factors of ${this.getFactorsTarget(level)}`;
            case 'primes':
                return `Prime Numbers (1\u2013${this.getPrimesRange(level)})`;
            case 'equality':
                return `Equals ${this.getEqualityTarget(level)}`;
            case 'inequality':
                return `NOT equal to ${this.getEqualityTarget(level)}`;
            default:
                return `Multiples of ${this.getMultiple(level)}`;
        }
    },

    // Generate numbers for the grid
    generateGridNumbers(level, gridSize = 30, mode = 'multiples') {
        switch (mode) {
            case 'multiples': return this.generateMultiplesGrid(level, gridSize);
            case 'factors': return this.generateFactorsGrid(level, gridSize);
            case 'primes': return this.generatePrimesGrid(level, gridSize);
            case 'equality': return this.generateEqualityGrid(level, gridSize);
            case 'inequality': return this.generateInequalityGrid(level, gridSize);
            default: return this.generateMultiplesGrid(level, gridSize);
        }
    },

    // ── Shared Helpers ─────────────────────────────────

    // Get correct count for a grid
    getCorrectCount(gridSize) {
        if (typeof Game !== 'undefined' && Game.testingMode) {
            return 1;
        }
        const minCorrect = Math.floor(gridSize * 0.35);
        const maxCorrect = Math.floor(gridSize * 0.55);
        return minCorrect + Math.floor(Math.random() * (maxCorrect - minCorrect + 1));
    },

    // Apply testing mode: put correct answer at position 0,0
    applyTestingMode(allNumbers) {
        if (typeof Game !== 'undefined' && Game.testingMode) {
            const correctIndex = allNumbers.findIndex(n => n.isCorrect);
            if (correctIndex > 0) {
                [allNumbers[0], allNumbers[correctIndex]] = [allNumbers[correctIndex], allNumbers[0]];
            }
        }
        return allNumbers;
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

    // ── Multiples Mode ─────────────────────────────────

    getMultiple(level) {
        const index = (level - 1) % this.multiplesSequence.length;
        return this.multiplesSequence[index];
    },

    generateMultiplesGrid(level, gridSize) {
        const multiple = this.getMultiple(level);
        const correctCount = this.getCorrectCount(gridSize);

        const correctNumbers = this.generateMultiples(multiple, correctCount, level);
        const incorrectCount = gridSize - correctCount;
        const incorrectNumbers = this.generateNonMultiples(multiple, incorrectCount, level);

        let allNumbers = [
            ...correctNumbers.map(n => ({ value: n, isCorrect: true })),
            ...incorrectNumbers.map(n => ({ value: n, isCorrect: false }))
        ];

        return this.applyTestingMode(this.shuffle(allNumbers));
    },

    generateMultiples(base, count, level) {
        const multiples = [];
        const maxMultiplier = Math.min(12 + level, 20);

        const pool = [];
        for (let i = 1; i <= maxMultiplier; i++) {
            pool.push(base * i);
        }

        const shuffledPool = this.shuffle([...pool]);
        for (let i = 0; i < count && i < shuffledPool.length; i++) {
            multiples.push(shuffledPool[i]);
        }

        while (multiples.length < count) {
            multiples.push(pool[Math.floor(Math.random() * pool.length)]);
        }

        return multiples;
    },

    generateNonMultiples(base, count, level) {
        const nonMultiples = [];
        const maxValue = base * (12 + level);

        let attempts = 0;
        while (nonMultiples.length < count && attempts < 1000) {
            const num = Math.floor(Math.random() * maxValue) + 1;
            if (num % base !== 0) {
                nonMultiples.push(num);
            }
            attempts++;
        }

        while (nonMultiples.length < count) {
            const offset = Math.floor(Math.random() * (base - 1)) + 1;
            const multiplier = Math.floor(Math.random() * 10) + 1;
            nonMultiples.push(base * multiplier + offset);
        }

        return nonMultiples;
    },

    // ── Factors Mode ───────────────────────────────────

    getFactorsTarget(level) {
        const index = (level - 1) % this.factorsSequence.length;
        return this.factorsSequence[index];
    },

    getFactors(n) {
        const factors = [];
        for (let i = 1; i <= n; i++) {
            if (n % i === 0) factors.push(i);
        }
        return factors;
    },

    generateFactorsGrid(level, gridSize) {
        const target = this.getFactorsTarget(level);
        const allFactors = this.getFactors(target);
        const correctCount = this.getCorrectCount(gridSize);

        // Fill correct slots with factors (may repeat)
        const shuffledFactors = this.shuffle([...allFactors]);
        const correctNumbers = [];
        for (let i = 0; i < correctCount; i++) {
            correctNumbers.push(shuffledFactors[i % shuffledFactors.length]);
        }

        // Fill incorrect slots with non-factors in a reasonable range
        const incorrectCount = gridSize - correctCount;
        const nonFactors = [];
        let attempts = 0;
        while (nonFactors.length < incorrectCount && attempts < 1000) {
            const num = Math.floor(Math.random() * (target + 10)) + 1;
            if (target % num !== 0) {
                nonFactors.push(num);
            }
            attempts++;
        }
        // Fallback
        while (nonFactors.length < incorrectCount) {
            nonFactors.push(target + Math.floor(Math.random() * 10) + 1);
        }

        let allNumbers = [
            ...correctNumbers.map(n => ({ value: n, isCorrect: true })),
            ...nonFactors.map(n => ({ value: n, isCorrect: false }))
        ];

        return this.applyTestingMode(this.shuffle(allNumbers));
    },

    // ── Primes Mode ────────────────────────────────────

    getPrimesRange(level) {
        const index = (level - 1) % this.primesRanges.length;
        return this.primesRanges[index];
    },

    isPrime(n) {
        if (n < 2) return false;
        if (n === 2) return true;
        if (n % 2 === 0) return false;
        for (let i = 3; i <= Math.sqrt(n); i += 2) {
            if (n % i === 0) return false;
        }
        return true;
    },

    getPrimesInRange(max) {
        const primes = [];
        for (let i = 2; i <= max; i++) {
            if (this.isPrime(i)) primes.push(i);
        }
        return primes;
    },

    generatePrimesGrid(level, gridSize) {
        const maxNum = this.getPrimesRange(level);
        const primes = this.getPrimesInRange(maxNum);
        const correctCount = this.getCorrectCount(gridSize);

        // Fill correct slots with primes (may repeat)
        const shuffledPrimes = this.shuffle([...primes]);
        const correctNumbers = [];
        for (let i = 0; i < correctCount; i++) {
            correctNumbers.push(shuffledPrimes[i % shuffledPrimes.length]);
        }

        // Fill incorrect slots with non-primes from range
        const incorrectCount = gridSize - correctCount;
        const nonPrimes = [];
        let attempts = 0;
        while (nonPrimes.length < incorrectCount && attempts < 1000) {
            const num = Math.floor(Math.random() * maxNum) + 1;
            if (!this.isPrime(num)) {
                nonPrimes.push(num);
            }
            attempts++;
        }
        // Fallback with guaranteed composites
        while (nonPrimes.length < incorrectCount) {
            nonPrimes.push(4 + Math.floor(Math.random() * 10) * 2);
        }

        let allNumbers = [
            ...correctNumbers.map(n => ({ value: n, isCorrect: true })),
            ...nonPrimes.map(n => ({ value: n, isCorrect: false }))
        ];

        return this.applyTestingMode(this.shuffle(allNumbers));
    },

    // ── Equality & Inequality Modes ────────────────────

    getEqualityTarget(level) {
        const index = (level - 1) % this.equalityTargets.length;
        return this.equalityTargets[index];
    },

    // Get factor pairs of n (excluding 1*n)
    getFactorPairs(n) {
        const pairs = [];
        for (let i = 2; i <= Math.sqrt(n); i++) {
            if (n % i === 0) {
                pairs.push([i, n / i]);
            }
        }
        return pairs;
    },

    // Generate a random expression that evaluates to target
    generateExpression(target) {
        const ops = [];

        // Addition: always possible for target >= 2
        if (target >= 2) {
            ops.push(() => {
                const a = Math.floor(Math.random() * (target - 1)) + 1;
                const b = target - a;
                return `${a} + ${b}`;
            });
        }

        // Subtraction: always possible
        ops.push(() => {
            const b = Math.floor(Math.random() * 10) + 1;
            const a = target + b;
            return `${a} \u2212 ${b}`;
        });

        // Multiplication: only if target has factor pairs beyond 1*n
        const factorPairs = this.getFactorPairs(target);
        if (factorPairs.length > 0) {
            ops.push(() => {
                const pair = factorPairs[Math.floor(Math.random() * factorPairs.length)];
                return `${pair[0]} \u00D7 ${pair[1]}`;
            });
        }

        // Division: always possible
        ops.push(() => {
            const b = Math.floor(Math.random() * 4) + 2;
            const a = target * b;
            return `${a} \u00F7 ${b}`;
        });

        const chosen = ops[Math.floor(Math.random() * ops.length)];
        return chosen();
    },

    // Generate a random expression that does NOT evaluate to target
    generateWrongExpression(target) {
        let wrongTarget;
        do {
            wrongTarget = target + Math.floor(Math.random() * 11) - 5;
            if (wrongTarget < 1) wrongTarget = target + Math.floor(Math.random() * 5) + 1;
        } while (wrongTarget === target);

        return this.generateExpression(wrongTarget);
    },

    generateEqualityGrid(level, gridSize) {
        const target = this.getEqualityTarget(level);
        const correctCount = this.getCorrectCount(gridSize);
        const usedExpressions = new Set();
        const numbers = [];

        // Correct expressions (equal to target)
        for (let i = 0; i < correctCount; i++) {
            let expr;
            let attempts = 0;
            do {
                expr = this.generateExpression(target);
                attempts++;
            } while (usedExpressions.has(expr) && attempts < 50);
            usedExpressions.add(expr);
            numbers.push({ value: expr, isCorrect: true });
        }

        // Incorrect expressions (not equal to target)
        const incorrectCount = gridSize - correctCount;
        for (let i = 0; i < incorrectCount; i++) {
            let expr;
            let attempts = 0;
            do {
                expr = this.generateWrongExpression(target);
                attempts++;
            } while (usedExpressions.has(expr) && attempts < 50);
            usedExpressions.add(expr);
            numbers.push({ value: expr, isCorrect: false });
        }

        return this.applyTestingMode(this.shuffle(numbers));
    },

    generateInequalityGrid(level, gridSize) {
        const target = this.getEqualityTarget(level);
        const correctCount = this.getCorrectCount(gridSize);
        const usedExpressions = new Set();
        const numbers = [];

        // Correct = expressions that do NOT equal target
        for (let i = 0; i < correctCount; i++) {
            let expr;
            let attempts = 0;
            do {
                expr = this.generateWrongExpression(target);
                attempts++;
            } while (usedExpressions.has(expr) && attempts < 50);
            usedExpressions.add(expr);
            numbers.push({ value: expr, isCorrect: true });
        }

        // Incorrect = expressions that DO equal target
        const incorrectCount = gridSize - correctCount;
        for (let i = 0; i < incorrectCount; i++) {
            let expr;
            let attempts = 0;
            do {
                expr = this.generateExpression(target);
                attempts++;
            } while (usedExpressions.has(expr) && attempts < 50);
            usedExpressions.add(expr);
            numbers.push({ value: expr, isCorrect: false });
        }

        return this.applyTestingMode(this.shuffle(numbers));
    },

    // ── Scoring & Difficulty ───────────────────────────

    getTroggleCount(level) {
        if (level <= 2) return 1;
        if (level <= 5) return 2;
        if (level <= 10) return 3;
        return Math.min(4, 1 + Math.floor(level / 4));
    },

    getTroggleSpeed(level) {
        return 1 + (level - 1) * 0.1;
    },

    getPointsForNosh(level) {
        return 5 + Math.floor(level / 3);
    },

    getLevelClearBonus(level) {
        return 50 + level * 10;
    },

    getExtraLifeThreshold() {
        return 100;
    },

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
