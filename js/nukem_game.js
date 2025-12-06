/* ============================================================
   NOTORIOUS NUKEM SQUIRREL – HOLLYWOOD HOLLOWCAST LEVEL
   Full Game Script (Canvas + JS) WITH LEFT-FACING ENEMY SPRITES
   ------------------------------------------------------------
   Requires (in /assets):
   nukem_run.png
   nukem_Jump.png
   nukem_climb.png
   nukem_shoot.png
   enemy_goon.png      <-- LEFT-FACING, 4 frames, 1 row
   Optional:
   bg_city.png
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

// Player sprite frames
const SPRITE_FRAMES = {
    run: 6,
    jump: 4,
    climb: 4,
    shoot: 4
};

// Enemy sprite config (enemy_goon.png)
const ENEMY_FRAMES = 4;     // frames across
const ENEMY_ANIM_SPEED = 8; // lower = faster

let cameraX = 0;

/* ------------------------------------------------------------
   SPRITES
------------------------------------------------------------ */
const sprites = {
    run: new Image(),
    jump: new Image(),
    climb: new Image(),
    shoot: new Image()
};

sprites.run.src   = "assets/nukem_run.png";
sprites.jump.src  = "assets/nukem_Jump.png";      // match your actual file
sprites.climb.src = "assets/nukem_ladder.png";    // match your actual file
sprites.shoot.src = "assets/nukem_shoot.png";

// Debug: log when sprites load / fail
sprites.run.onload   = () => console.log("RUN loaded", sprites.run.width, sprites.run.height);
sprites.jump.onload  = () => console.log("JUMP loaded", sprites.jump.width, sprites.jump.height);
sprites.climb.onload = () => console.log("CLIMB loaded", sprites.climb.width, sprites.climb.height);
sprites.shoot.onload = () => console.log("SHOOT loaded", sprites.shoot.width, sprites.shoot.height);

sprites.run.onerror   = () => console.error("RUN failed to load");
sprites.jump.onerror  = () => console.error("JUMP failed to load");
sprites.climb.onerror = () => console.error("CLIMB failed to load");
sprites.shoot.onerror = () => console.error("SHOOT failed to load");

// LEFT-FACING enemy sheet
const enemySprite = new Image();
enemySprite.src = "assets/enemy_goon.png";

// Optional city background
const bgCity = new Image();
bgCity.src = "assets/bg_city.png";

/* ------------------------------------------------------------
   LEVEL (Hollywood-style streets / rooftops)
------------------------------------------------------------ */

const level = [];
for (let y = 0; y < LEVEL_HEIGHT; y++) {
    level[y] = [];
    for (let x = 0; x < LEVEL_WIDTH; x++) {
        level[y][x] = 0;
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
   PLAYER
------------------------------------------------------------ */
class Player {
    constructor() {
        this.startX = 50;
        this.startY = (LEVEL_HEIGHT - 3) * TILE_SIZE;

        this.x = this.startX;
        this.y = this.startY;
        this.w = 24;
        this.h = 32;

        this.velX = 0;
        this.velY = 0;
        this.accel = 0.6;
        this.maxSpeed = 3;
        this.jumpForce = -11;
        this.gravity = 0.6;

        this.facing = 1;    // 1 = right, -1 = left
        this.grounded = false;
        this.onLadder = false;

        this.state = "idle";
        this.frame = 0;
        this.frameTick = 0;

        this.shootCooldown = 0;

        this.health = 3;
        this.invincibleTimer = 0;
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.velX = 0;
        this.velY = 0;
        this.health = 3;
        this.invincibleTimer = 0;
    }

    update() {
        if (this.invincibleTimer > 0) this.invincibleTimer--;

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

        // Ladder climb
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

        // Shoot
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

        // State if not climbing / shooting
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

        // Horizontal
        this.x += this.velX;
        if (this.collides()) {
            this.x -= this.velX;
            this.velX = 0;
        }

        // Vertical
        this.y += this.velY;
        this.grounded = false;
        if (this.collides()) {
            if (this.velY > 0) this.grounded = true;
            this.y -= this.velY;
            this.velY = 0;
        }

        // Bounds
        if (this.x < 0) this.x = 0;
        const maxX = LEVEL_WIDTH * TILE_SIZE - this.w;
        if (this.x > maxX) this.x = maxX;

        // Camera
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

    takeDamage(fromX) {
        if (this.invincibleTimer > 0) return;
        this.health--;
        this.invincibleTimer = 60;

        // Knock-back
        if (fromX < this.x) this.velX = 3;
        else this.velX = -3;
        this.velY = -4;

        if (this.health <= 0) {
            alert("Game Over – Nukem Squirrel got toasted!");
            this.reset();
            resetEnemies();
        }
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
        // Flicker when hit
        if (this.invincibleTimer > 0 &&
            (Math.floor(this.invincibleTimer / 4) % 2 === 0)) {
            return;
        }

        let img = sprites.run;
        let frames = SPRITE_FRAMES.run;

        switch (this.state) {
            case "run":   img = sprites.run;   frames = SPRITE_FRAMES.run;   break;
            case "jump":  img = sprites.jump;  frames = SPRITE_FRAMES.jump;  break;
            case "climb": img = sprites.climb; frames = SPRITE_FRAMES.climb; break;
            case "shoot": img = sprites.shoot; frames = SPRITE_FRAMES.shoot; break;
            default:      img = sprites.run;   frames = SPRITE_FRAMES.run;   break;
        }

        if (!img.complete || img.width === 0) {
       // Fallback: draw a green box where the squirrel should be
       const dx = worldToScreen(this.x);
       ctx.fillStyle = "#00ff00";
       ctx.fillRect(dx, this.y, this.w, this.h);
       return;
}


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
   ENEMIES – LEFT-FACING SPRITE SHEET
------------------------------------------------------------ */
class Enemy {
    constructor(x, y, leftBound, rightBound) {
        this.x = x;
        this.y = y;
        this.w = 24;
        this.h = 30;

        this.leftBound = leftBound;
        this.rightBound = rightBound;
        this.vx = -1.2; // negative so they tend to walk LEFT (from right side)

        this.alive = true;
        this.hp = 2;

        this.frame = 0;
        this.frameTick = 0;
    }

    update() {
        if (!this.alive) return;

        this.x += this.vx;

        // Patrol bounds
        if (this.x < this.leftBound) {
            this.x = this.leftBound;
            this.vx *= -1;
        }
        if (this.x + this.w > this.rightBound) {
            this.x = this.rightBound - this.w;
            this.vx *= -1;
        }

        // Stay on platform
        const feetX = this.x + this.w / 2;
        const feetY = this.y + this.h + 1;
        if (!isSolidAt(feetX, feetY)) {
            this.x -= this.vx * 2;
            this.vx *= -1;
        }

        // Animate
        this.frameTick++;
        if (this.frameTick >= ENEMY_ANIM_SPEED) {
            this.frameTick = 0;
            this.frame = (this.frame + 1) % ENEMY_FRAMES;
        }

        this.draw();
    }

    draw() {
        if (!this.alive) return;

        if (!enemySprite.complete || enemySprite.width === 0) {
            // Fallback box while loading
            const dxBox = worldToScreen(this.x);
            ctx.fillStyle = "#ff3366";
            ctx.fillRect(dxBox, this.y, this.w, this.h);
            return;
        }

        const frameWidth = enemySprite.width / ENEMY_FRAMES;
        const sx = frameWidth * this.frame;
        const dx = worldToScreen(this.x);

        ctx.save();
        // Art is LEFT-facing by default (towards decreasing x)
        const movingRight = this.vx > 0;
        if (movingRight) {
            // Flip horizontally so they face right when moving right
            ctx.translate(dx + this.w / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-dx - this.w / 2, 0);
        }

        ctx.drawImage(
            enemySprite,
            sx, 0, frameWidth, enemySprite.height,
            dx, this.y, this.w, this.h
        );
        ctx.restore();
    }

    hit() {
        if (!this.alive) return;
        this.hp--;
        if (this.hp <= 0) this.alive = false;
    }

    getHitbox() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
}

let enemies = [];

function spawnEnemies() {
    enemies = [
        // Street goon, coming in from the right side of the cinema area
        new Enemy(26 * TILE_SIZE, (LEVEL_HEIGHT - 3) * TILE_SIZE - 12,
                  12 * TILE_SIZE, 28 * TILE_SIZE),

        // Rooftop left
        new Enemy(14 * TILE_SIZE, (LEVEL_HEIGHT - 6) * TILE_SIZE - 14,
                  5 * TILE_SIZE, 15 * TILE_SIZE),

        // Rooftop right
        new Enemy(38 * TILE_SIZE, (LEVEL_HEIGHT - 6) * TILE_SIZE - 14,
                  28 * TILE_SIZE, 40 * TILE_SIZE)
    ];
}

function resetEnemies() {
    spawnEnemies();
}

spawnEnemies();

/* ------------------------------------------------------------
   BULLETS
------------------------------------------------------------ */
const bullets = {
    list: [],
    spawn(x, y, dir) {
        this.list.push({ x, y, vx: 6 * dir, life: 60, w: 4, h: 2 });
    },
    updateAndDraw() {
        for (let i = this.list.length - 1; i >= 0; i--) {
            const b = this.list[i];
            b.x += b.vx;
            b.life--;

            let remove = false;

            // Hit wall
            if (
                b.life <= 0 ||
                isSolidAt(b.x, b.y) ||
                b.x < 0 ||
                b.x > LEVEL_WIDTH * TILE_SIZE
            ) {
                remove = true;
            }

            // Hit enemy
            if (!remove) {
                for (const enemy of enemies) {
                    if (!enemy.alive) continue;
                    const hb = enemy.getHitbox();
                    if (
                        b.x < hb.x + hb.w &&
                        b.x + b.w > hb.x &&
                        b.y < hb.y + hb.h &&
                        b.y + b.h > hb.y
                    ) {
                        enemy.hit();
                        remove = true;
                        break;
                    }
                }
            }

            if (remove) {
                this.list.splice(i, 1);
                continue;
            }

            const dx = worldToScreen(b.x);
            ctx.fillStyle = "#ffdd55";
            ctx.fillRect(dx, b.y, b.w, b.h);
        }
    }
};

/* ------------------------------------------------------------
   PLAYER–ENEMY COLLISIONS
------------------------------------------------------------ */
function checkPlayerEnemyCollisions() {
    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const hb = enemy.getHitbox();
        if (
            player.x < hb.x + hb.w &&
            player.x + player.w > hb.x &&
            player.y < hb.y + hb.h &&
            player.y + player.h > hb.y
        ) {
            player.takeDamage(hb.x);
        }
    }
}

/* ------------------------------------------------------------
   RENDERING – BACKGROUND, TILES, HUD
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
            } else if (tile === 2) {
                ctx.fillStyle = "#22f0ff";
                ctx.fillRect(screenX + TILE_SIZE / 2 - 2, screenY, 4, TILE_SIZE);
                ctx.fillRect(screenX + 2, screenY + 4, TILE_SIZE - 4, 2);
                ctx.fillRect(screenX + 2, screenY + 10, TILE_SIZE - 4, 2);
            }
        }
    }
}

function drawHUD() {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = "10px monospace";
    ctx.fillText("HEALTH: " + player.health, 8, 16);
    ctx.restore();
}

/* ------------------------------------------------------------
   MAIN LOOP
------------------------------------------------------------ */
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();
    drawTiles();
    bullets.updateAndDraw();
    for (const enemy of enemies) enemy.update();
    player.update();
    checkPlayerEnemyCollisions();
    drawHUD();

    requestAnimationFrame(gameLoop);
}

gameLoop();
