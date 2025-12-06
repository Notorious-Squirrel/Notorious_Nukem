/* ============================================================
   NOTORIOUS NUKEM SQUIRREL – HOLLYWOOD HOLLOWCAST LEVEL
   Full Game Script (Canvas + JS)
   ------------------------------------------------------------
   Requires:
   /assets/nukem_run.png
   /assets/nukem_jump.png
   /assets/nukem_climb.png
   /assets/nukem_shoot.png
   Optional:
   /assets/bg_city.png
   ============================================================ */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = 480;
canvas.height = 270;

/* ------------------------------------------------------------
   INPUT
------------------------------------------------------------ */
const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup",   e => keys[e.key] = false);

/* ------------------------------------------------------------
   CONFIG + GLOBALS
------------------------------------------------------------ */
const TILE_SIZE = 16;
const LEVEL_HEIGHT = 15;
const LEVEL_WIDTH = 120;

// Number of frames per sprite sheet
const SPRITE_FRAMES = {
    run: 6,
    jump: 4,
    climb: 4,
    shoot: 4
};

let cameraX = 0;

/* ------------------------------------------------------------
   SPRITE LOADING
------------------------------------------------------------ */
const sprites = {
    run: new Image(),
    jump: new Image(),
    climb: new Image(),
    shoot: new Image()
};

sprites.run.src   = "assets/nukem_run.png";
sprites.jump.src  = "assets/nukem_jump.png";
sprites.climb.src = "assets/nukem_climb.png";
sprites.shoot.src = "assets/nukem_shoot.png";

// Optional city background
const bgCity = new Image();
bgCity.src = "assets/bg_city.png";

/* ------------------------------------------------------------
   LEVEL GENERATION (Hollywood-inspired)
------------------------------------------------------------ */

const level = [];
for (let y = 0; y < LEVEL_HEIGHT; y++) {
    level[y] = [];
    for (let x = 0; x < LEVEL_WIDTH; x++) {
        level[y][x] = 0; // empty
    }
}

function platform(y, xStart, xEnd, tile = 1) {
    for (let x = xStart; x <= xEnd; x++) level[y][x] = tile;
}

function ladder(x, yStart, yEnd) {
    for (let y = yStart; y <= yEnd; y++) level[y][x] = 2;
}

// Street
platform(LEVEL_HEIGHT - 1, 0, LEVEL_WIDTH - 1, 1);
platform(LEVEL_HEIGHT - 2, 0, 40, 1);

// Cinema canopy
platform(LEVEL_HEIGHT - 3, 10, 30, 1);

// Rooftops
platform(LEVEL_HEIGHT - 6, 5, 15, 1);
platform(LEVEL_HEIGHT - 6, 28, 40, 1);

// Ladders
ladder(12, LEVEL_HEIGHT - 3, LEVEL_HEIGHT - 6);
ladder(26, LEVEL_HEIGHT - 1, LEVEL_HEIGHT - 3);
ladder(34, LEVEL_HEIGHT - 3, LEVEL_HEIGHT - 6);

/* ------------------------------------------------------------
   TILE HELPERS
------------------------------------------------------------ */
function worldToScreen(x) {
    return x - cameraX;
}

function tileAtPixel(x, y) {
    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    if (tx < 0 || ty < 0 || ty >= LEVEL_HEIGHT || tx >= LEVEL_WIDTH) return 0;
    return level[ty][tx];
}

function isSolidAt(x, y) {
    return tileAtPixel(x, y) === 1;
}

function isLadderAt(x, y) {
    return tileAtPixel(x, y) === 2;
}

/* ------------------------------------------------------------
   PLAYER CLASS
------------------------------------------------------------ */
class Player {
    constructor() {
        this.x = 50;
        this.y = (LEVEL_HEIGHT - 3) * TILE_SIZE;
        this.w = 24;
        this.h = 32;

        this.velX = 0;
        this.velY = 0;
        this.accel = 0.6;
        this.maxSpeed = 3;
        this.jumpForce = -11;
        this.gravity = 0.6;

        this.facing = 1;
        this.grounded = false;
        this.onLadder = false;

        this.state = "idle";
        this.frame = 0;
        this.frameTick = 0;

        this.shootCooldown = 0;
    }

    update() {
        this.handleInput();
        this.applyPhysics();
        this.updateAnimation();
        this.draw();
    }

    handleInput() {
        let moving = false;

        // Horizontal movement
        if (keys["ArrowRight"]) {
            this.velX += this.accel;
            moving = true;
            this.facing = 1;
        } else if (keys["ArrowLeft"]) {
            this.velX -= this.accel;
            moving = true;
            this.facing = -1;
        } else {
            this.velX *= 0.7;
        }

        if (this.velX > this.maxSpeed) this.velX = this.maxSpeed;
        if (this.velX < -this.maxSpeed) this.velX = -this.maxSpeed;

        // Ladder checks
        const midX = this.x + this.w / 2;
        const feetY = this.y + this.h;
        const tileBelow = tileAtPixel(midX, feetY);
        const tileMid = tileAtPixel(midX, this.y + this.h / 2);
        this.onLadder = (tileBelow === 2 || tileMid === 2);

        // Jump
        if ((keys["z"] || keys["Z"]) && this.grounded && !this.onLadder) {
            this.velY = this.jumpForce;
            this.grounded = false;
            this.state = "jump";
        }

        // Ladder climbing
        if (this.onLadder) {
            if (keys["ArrowUp"]) {
                this.velY = -2;
                this.state = "climb";
            } else if (keys["ArrowDown"]) {
                this.velY = 2;
                this.state = "climb";
            } else if (this.state === "climb") {
                this.velY = 0;
            }
        }

        // Shooting
        if ((keys["x"] || keys["X"]) && this.shootCooldown <= 0) {
            this.state = "shoot";
            bullets.spawn(
                this.x + this.w / 2,
                this.y + this.h / 2,
                this.facing
            );
            this.shootCooldown = 15;
        }

        if (this.shootCooldown > 0) this.shootCooldown--;

        // Running / idle states
        if (!this.onLadder && this.grounded && this.state !== "shoot") {
            if (!this.grounded) this.state = "jump";
            else if (moving) this.state = "run";
            else this.state = "idle";
        }
    }

    applyPhysics() {
        if (!this.onLadder || this.state !== "climb") {
            this.velY += this.gravity;
        }

        // Horizontal movement
        this.x += this.velX;
        if (this.collides()) {
            this.x -= this.velX;
            this.velX = 0;
        }

        // Vertical movement
        this.y += this.velY;
        this.grounded = false;
        if (this.collides()) {
            if (this.velY > 0) this.grounded = true;
            this.y -= this.velY;
            this.velY = 0;
        }

        // Clamp bounds
        if (this.x < 0) this.x = 0;
        const maxX = LEVEL_WIDTH * TILE_SIZE - this.w;
        if (this.x > maxX) this.x = maxX;

        // Camera follow
        cameraX = this.x - canvas.width / 2;
        if (cameraX < 0) cameraX = 0;
        const maxCam = LEVEL_WIDTH * TILE_SIZE - canvas.width;
        if (cameraX > maxCam) cameraX = maxCam;
    }

    collides() {
        const x1 = this.x;
        const y1 = this.y;
        const x2 = this.x + this.w;
        const y2 = this.y + this.h;
        return (
            isSolidAt(x1, y1) ||
            isSolidAt(x2, y1) ||
            isSolidAt(x1, y2) ||
            isSolidAt(x2, y2)
        );
    }

    updateAnimation() {
        this.frameTick++;
        const speed = (this.state === "run") ? 4 : 6;
        if (this.frameTick >= speed) {
            this.frameTick = 0;
            this.frame++;
        }
    }

    draw() {
        let img = sprites.run;
        let frames = SPRITE_FRAMES.run;

        switch (this.state) {
            case "run":
                img = sprites.run;
                frames = SPRITE_FRAMES.run;
                break;
            case "jump":
                img = sprites.jump;
                frames = SPRITE_FRAMES.jump;
                break;
            case "climb":
                img = sprites.climb;
                frames = SPRITE_FRAMES.climb;
                break;
            case "shoot":
                img = sprites.shoot;
                frames = SPRITE_FRAMES.shoot;
                break;
            default:
                img = sprites.run;
                frames = SPRITE_FRAMES.run;
                break;
        }

        if (!img.complete || img.width === 0) return;

        const frameWidth = img.width / frames;
        const frameIndex = this.state === "idle" ? 0 : (this.frame % frames);

        const sx = frameWidth * frameIndex;
        const dx = worldToScreen(this.x);

        ctx.save();
        if (this.facing === -1) {
            ctx.translate(dx + this.w / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-dx - this.w / 2, 0);
        }

        ctx.drawImage(
            img,
            sx, 0, frameWidth, img.height,
            dx, this.y, this.w, this.h
        );

        ctx.restore();
    }
}

const player = new Player();

/* ------------------------------------------------------------
   BULLETS
------------------------------------------------------------ */
const bullets = {
    list: [],
    spawn(x, y, dir) {
        this.list.push({ x, y, vx: 6 * dir, life: 60 });
    },
    updateAndDraw() {
        for (let i = this.list.length - 1; i >= 0; i--) {
            const b = this.list[i];
            b.x += b.vx;
            b.life--;

            if (
                b.life <= 0 ||
                isSolidAt(b.x, b.y) ||
                b.x < 0 ||
                b.x > LEVEL_WIDTH * TILE_SIZE
            ) {
                this.list.splice(i, 1);
                continue;
            }

            const dx = worldToScreen(b.x);
            ctx.fillStyle = "#ffdd55";
            ctx.fillRect(dx, b.y, 4, 2);
        }
    }
};

/* ------------------------------------------------------------
   RENDERING – BACKGROUND + TILES
------------------------------------------------------------ */
function drawBackground() {
    if (bgCity.complete && bgCity.width > 0) {
        const speed = 0.2;
        const bgX = -cameraX * speed;
        ctx.drawImage(bgCity, bgX, 0, canvas.width * 2, canvas.height);
    } else {
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, "#050517");
        grad.addColorStop(0.4, "#120030");
        grad.addColorStop(1, "#130812");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const signX = worldToScreen(18 * TILE_SIZE);
    const signY = (LEVEL_HEIGHT - 6) * TILE_SIZE - 40;
    ctx.save();
    ctx.fillStyle = "#000000aa";
    ctx.fillRect(signX, signY, 120, 32);
    ctx.strokeStyle = "#ff3bff";
    ctx.lineWidth = 2;
    ctx.strokeRect(signX + 2, signY + 2, 116, 28);
    ctx.fillStyle = "#ffb5ff";
    ctx.font = "8px monospace";
    ctx.fillText("HOLLYWOOD", signX + 8, signY + 14);
    ctx.fillText("HOLLOWCAST", signX + 4, signY + 26);
    ctx.restore();
}

function drawTiles() {
    for (let y = 0; y < LEVEL_HEIGHT; y++) {
        for (let x = 0; x < LEVEL_WIDTH; x++) {
            const tile = level[y][x];
            if (tile === 0) continue;

            const screenX = worldToScreen(x * TILE_SIZE);
            const screenY = y * TILE_SIZE;

            if (screenX > canvas.width || screenX + TILE_SIZE < 0) continue;

            if (tile === 1) {
                ctx.fillStyle = (y >= LEVEL_HEIGHT - 2) ? "#202028" : "#262644";
                ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = (y >= LEVEL_HEIGHT - 2) ? "#303040" : "#34345a";
                ctx.fillRect(screenX, screenY + TILE_SIZE - 4, TILE_SIZE, 4);
            }

            if (tile === 2) {
                ctx.fillStyle = "#22f0ff";
                ctx.fillRect(screenX + TILE_SIZE / 2 - 2, screenY, 4, TILE_SIZE);
                ctx.fillRect(screenX + 2, screenY + 4, TILE_SIZE - 4, 2);
                ctx.fillRect(screenX + 2, screenY + 10, TILE_SIZE - 4, 2);
            }
        }
    }
}

/* ------------------------------------------------------------
   GAME LOOP
------------------------------------------------------------ */
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();
    drawTiles();
    bullets.updateAndDraw();
    player.update();

    requestAnimationFrame(gameLoop);
}

gameLoop();
