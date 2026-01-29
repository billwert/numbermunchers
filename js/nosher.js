/* =========================================
   NOSHER - Player Character
   ========================================= */

const Nosher = {
    x: 0,
    y: 0,

    // Initialize nosher at position
    init(startX = 0, startY = 0) {
        this.x = startX;
        this.y = startY;
    },

    // Move in a direction
    move(direction) {
        const prevX = this.x;
        const prevY = this.y;

        switch (direction) {
            case 'up':
                if (this.y > 0) this.y--;
                break;
            case 'down':
                if (this.y < Grid.ROWS - 1) this.y++;
                break;
            case 'left':
                if (this.x > 0) this.x--;
                break;
            case 'right':
                if (this.x < Grid.COLS - 1) this.x++;
                break;
        }

        // Check if actually moved
        const moved = (prevX !== this.x || prevY !== this.y);

        if (moved) {
            Grid.updateNosherPosition(this.x, this.y, prevX, prevY);
        }

        return moved;
    },

    // Get current position
    getPosition() {
        return { x: this.x, y: this.y };
    },

    // Set position directly (for respawn)
    setPosition(x, y) {
        const prevX = this.x;
        const prevY = this.y;
        this.x = x;
        this.y = y;
        Grid.updateNosherPosition(this.x, this.y, prevX, prevY);
    },

    // Attempt to nosh the current cell
    nosh() {
        return Grid.noshCell(this.x, this.y);
    }
};
