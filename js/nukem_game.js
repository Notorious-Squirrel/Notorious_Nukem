/* ============================================================
   NOTORIOUS NUKEM SQUIRREL – HOLLYWOOD HOLLOWCAST LEVEL
   Full Game Script (Canvas + JS) WITH LEFT-FACING ENEMY SPRITES
   ------------------------------------------------------------
   Requires (in /assets):
   nukem_run.png
   nukem_jump.png
   nukem_ladder.png
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
document.addEventListener("keydown", e => {
  keys[e.key] = true;
});
document.addEventListener("keyup", e => {
  keys[e.key] = false;
});

/* ------------------------------------------------------------
   CONFIG + GLOBALS
------------------------------------------------------------ */
const TILE_SIZE = 16;
const LEVEL_HEIGHT = 15;
const LEVEL_WIDTH = 420; // <<< LONGER LEVEL

// Tile types
const TILE_EMPTY = 0;
const TILE_SOLID = 1;
const TILE_LADDER = 2;
const TILE_SPIKE = 3;
const TILE_CHECKPOINT = 4;
const TILE_GOAL = 5;
const TILE_PICKUP = 6;

// Player sprite frames
const SPRITE_FRAMES = {
  run: 6,
  jump: 4,
  climb: 4,
  shoot: 4
};

// Enemy sprite config (enemy_goon.png)
const ENEMY_FRAMES = 4;
const ENEMY_ANIM_SPEED = 8;

let cameraX = 0;
let score = 0;

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
sprites.jump.src  = "assets/nukem_jump.png";
sprites.climb.src = "assets/nukem_ladder.png";
sprites.shoot.src = "assets/nukem_shoot.png";

// Debug: log when sprites load
sprites.run.onload   = () => console.log("RUN loaded", sprites.run.width, sprites.run.height);
sprites.jump.onload  = () => console.log("JUMP loaded", sprites.jump.width, sprites.jump.height);
sprites.climb.onload = () => console.log("CLIMB loaded", sprites.climb.width, sprites.climb.height);
sprites.shoot.onload = () => console.log("SHOOT loaded", sprites.shoot.width, sprites.shoot.height);

// LEFT-FACING enemy sheet
const enemySprite = new Image();
enemySprite.src = "assets/enemy_goon.png";

// Optional city background
const bgCity = new Image();
bgCity.src = "assets/bg_city.png";

/* ------------------------------------------------------------
   LEVEL ARRAY
------------------------------------------------------------ */
const level = Array.from({ length: LEVEL_HEIGHT }, () =>
  Array.from({ length: LEVEL_WIDTH }, () => TILE_EMPTY)
);

/* ------------------------------------------------------------
   LEVEL BUILD HELPERS
------------------------------------------------------------ */
function platform(y, xStart, xEnd, tile = TILE_SOLID) {
  for (let x = xStart; x <= xEnd; x++) level[y][x] = tile;
}
function ladder(x, yStart, yEnd) {
  for (let y = yStart; y <= yEnd; y++) level[y][x] = TILE_LADDER;
}
function spikes(y, xStart, xEnd) {
  for (let x = xStart; x <= xEnd; x++) level[y][x] = TILE_SPIKE;
}
function checkpoint(x, y) {
  level[y][x] = TILE_CHECKPOINT;
}
function goal(x, y) {
  level[y][x] = TILE_GOAL;
}
function pickup(x, y) {
  level[y][x] = TILE_PICKUP;
}

/* ------------------------------------------------------------
   BUILD A LONGER HOLLYWOOD LEVEL
------------------------------------------------------------ */
// Ground baseline
platform(LEVEL_HEIGHT - 1, 0, LEVEL_WIDTH - 1);

// Set Piece 1: Cinema street (0–90)
platform(LEVEL_HEIGHT - 2, 0, 60);
platform(LEVEL_HEIGHT - 3, 10, 30); // canopy
platform(LEVEL_HEIGHT - 6, 5, 15);
platform(LEVEL_HEIGHT - 6, 28, 40);
ladder(12, LEVEL_HEIGHT - 3, LEVEL_HEIGHT - 6);
ladder(34, LEVEL_HEIGHT - 3, LEVEL_HEIGHT - 6);
checkpoint(12, LEVEL_HEIGHT - 4);
pickup(18, LEVEL_HEIGHT - 4);
pickup(24, LEVEL_HEIGHT - 4);

// Set Piece 2: Alley ladders + spikes (90–150)
platform(LEVEL_HEIGHT - 2, 80, 130);
spikes(LEVEL_HEIGHT - 2, 96, 104);
platform(LEVEL_HEIGHT - 5, 92, 110);
ladder(100, LEVEL_HEIGHT - 2, LEVEL_HEIGHT - 5);
pickup(108, LEVEL_HEIGHT - 6);

// Set Piece 3: Billboard run (150–230)
platform(LEVEL_HEIGHT - 3, 150, 210);
platform(LEVEL_HEIGHT - 6, 165, 180);
platform(LEVEL_HEIGHT - 8, 188, 205);
ladder(172, LEVEL_HEIGHT - 3, LEVEL_HEIGHT - 6);
ladder(198, LEVEL_HEIGHT - 3, LEVEL_HEIGHT - 8);
pickup(170, LEVEL_HEIGHT - 7);
pickup(200, LEVEL_HEIGHT - 9);

// Set Piece 4: Broken rooftops + pits (230–310)
platform(LEVEL_HEIGHT - 2, 230, 245);
platform(LEVEL_HEIGHT - 2, 255, 270);
platform(LEVEL_HEIGHT - 2, 280, 300);
spikes(LEVEL_HEIGHT - 1, 246, 254);
spikes(LEVEL_HEIGHT - 1, 271, 279);
checkpoint(260, LEVEL_HEIGHT - 3);
platform(LEVEL_HEIGHT - 6, 240, 255);
platform(LEVEL_HEIGHT - 7, 265, 280);
platform(LEVEL_HEIGHT - 8, 290, 305);
ladder(248, LEVEL_HEIGHT - 2, LEVEL_HEIGHT - 6);
ladder(272, LEVEL_HEIGHT - 2, LEVEL_HEIGHT - 7);
ladder(298, LEVEL_HEIGHT - 2, LEVEL_HEIGHT - 8);

// Set Piece 5: Scaffolding climb (310–380)
platform(LEVEL_HEIGHT - 2, 310, 380);
platform(LEVEL_HEIGHT - 5, 320, 335);
platform(LEVEL_HEIGHT - 7, 340, 355);
platform(LEVEL_HEIGHT - 9, 360, 375);
ladder(326, LEVEL_HEIGHT - 2, LEVEL_HEIGHT - 5);
ladder(348, LEVEL_HEIGHT - 2, LEVEL_HEIGHT - 7);
ladder(368, LEVEL_HEIGHT - 2, LEVEL_HEIGHT - 9);
pickup(333, LEVEL_HEIGHT - 6);
pickup(355, LEVEL_HEIGHT - 8);
pickup(375, LEVEL_HEIGHT - 10);

// Final stretch + goal (380–419)
platform(LEVEL_HEIGHT - 3, 385, 415);
goal(416, LEVEL_HEIGHT - 4);

/* ------------------------------------------------------------
   TILE HELPERS
------------------------------------------------------------ */
function worldToScreen(x) {
  return x - cameraX;
}

function tileAtPixel(x, y) {
  const tx = Math.floor(x / TILE_SIZE);
  const ty = Math.floor(y / TILE_SIZE);
  if (tx < 0 || ty < 0 || ty >= LEVEL_HEIGHT || tx >= LEVEL_WIDTH) return TILE_EMPTY;
  return level[ty][tx];
}

function isSolidAt(x, y)  { return tileAtPixel(x, y) === TILE_SOLID; }
function isLadderAt(x, y) { return tileAtPixel(x, y) === TILE_LADDER; }
function isSpikeAt(x, y)  { return tileAtPixel(x, y) === TILE_SPIKE; }

/* ------------------------------------------------------------
   PLAYER
------------------------------------------------------------ */
class Player {
  constructor() {
    this.w = 24;
    this.h = 32;

    // Start on street
    this.startX = 50;
    this.startY = (LEVEL_HEIGHT - 2) * TILE_SIZE - this.h;

    this.x = this.startX;
    this.y = this.startY;

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

    this.velX = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.velX));

    const midX = this.x + this.w / 2;
    const feetY = this.y + this.h;
    const tileBelow = tileAtPixel(midX, feetY);
    const tileMid = tileAtPixel(midX, this.y + this.h / 2);
    this.onLadder = (tileBelow === TILE_LADDER || tileMid === TILE_LADDER);

    // Jump
    if ((keys["z"] || keys["Z"]) && this.grounded && !this.onLadder) {
      this.velY = this.jumpForce;
      this.grounded = false;
      this.state = "jump";
    }

    // Climb
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
      bullets.spawn(this.x + this.w / 2, this.y + this.h / 2, this.facing);
      this.shootCooldown = 15;
    }
    if (this.shootCooldown > 0) this.shootCooldown--;

    if (!this.onLadder && this.state !== "shoot") {
      if (!this.grounded) this.state = "jump";
      else if (moving) this.state = "run";
      else this.state = "idle";
    }
  }

  applyPhysics() {
    if (!this.onLadder || this.state !== "climb") this.velY += this.gravity;

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
    const x1 = this.x + 2;
    const y1 = this.y + 2;
    const x2 = this.x + this.w - 2;
    const y2 = this.y + this.h - 1;

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

    if (fromX < this.x) this.velX = 3;
    else this.velX = -3;
    this.velY = -4;

    if (this.health <= 0) {
      alert("Game Over – Nukem Squirrel got toasted!");
      this.reset();
      resetEnemies();
      score = 0;
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
    if (this.invincibleTimer > 0 && (Math.floor(this.invincibleTimer / 4) % 2 === 0)) return;

    let img = sprites.run;
    let frames = SPRITE_FRAMES.run;

    if (this.state === "jump" && sprites.jump.width > 0) { img = sprites.jump; frames = SPRITE_FRAMES.jump; }
    if (this.state === "climb" && sprites.climb.width > 0) { img = sprites.climb; frames = SPRITE_FRAMES.climb; }
    if (this.state === "shoot" && sprites.shoot.width > 0) { img = sprites.shoot; frames = SPRITE_FRAMES.shoot; }

    if (!img.complete || img.width === 0) {
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

    ctx.drawImage(img, sx, 0, frameWidth, img.height, dx, this.y, this.w, this.h);
    ctx.restore();
  }
}

const player = new Player();

/* ------------------------------------------------------------
   TILE INTERACTIONS (spikes / pickups / checkpoints / goal)
------------------------------------------------------------ */
function checkTileInteractions() {
  const midX = player.x + player.w / 2;
  const feetY = player.y + player.h - 2;
  if (isSpikeAt(midX, feetY)) player.takeDamage(player.x - 10);

  const tx = Math.floor(midX / TILE_SIZE);
  const ty = Math.floor((player.y + player.h / 2) / TILE_SIZE);
  const t = level[ty]?.[tx] ?? TILE_EMPTY;

  if (t === TILE_PICKUP) {
    level[ty][tx] = TILE_EMPTY;
    score++;
  }
  if (t === TILE_CHECKPOINT) {
    player.startX = tx * TILE_SIZE;
    player.startY = (ty * TILE_SIZE) - player.h;
  }
  if (t === TILE_GOAL) {
    alert(`LEVEL CLEAR! Pickups: ${score}`);
    score = 0;
    player.reset();
    resetEnemies();
  }
}

/* ------------------------------------------------------------
   ENEMIES
------------------------------------------------------------ */
class Enemy {
  constructor(x, y, leftBound, rightBound) {
    this.x = x;
    this.y = y;
    this.w = 24;
    this.h = 30;

    this.leftBound = leftBound;
    this.rightBound = rightBound;
    this.vx = -1.2;

    this.alive = true;
    this.hp = 2;

    this.frame = 0;
    this.frameTick = 0;
  }

  update() {
    if (!this.alive) return;

    this.x += this.vx;

    if (this.x < this.leftBound) { this.x = this.leftBound; this.vx *= -1; }
    if (this.x + this.w > this.rightBound) { this.x = this.rightBound - this.w; this.vx *= -1; }

    const feetX = this.x + this.w / 2;
    const feetY = this.y + this.h + 1;
    if (!isSolidAt(feetX, feetY)) {
      this.x -= this.vx * 2;
      this.vx *= -1;
    }

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
      const dxBox = worldToScreen(this.x);
      ctx.fillStyle = "#ff3366";
      ctx.fillRect(dxBox, this.y, this.w, this.h);
      return;
    }

    const frameWidth = enemySprite.width / ENEMY_FRAMES;
    const sx = frameWidth * this.frame;
    const dx = worldToScreen(this.x);

    ctx.save();
    const movingRight = this.vx > 0;
    if (movingRight) {
      ctx.translate(dx + this.w / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-dx - this.w / 2, 0);
    }

    ctx.drawImage(enemySprite, sx, 0, frameWidth, enemySprite.height, dx, this.y, this.w, this.h);
    ctx.restore();
  }

  hit() {
    if (!this.alive) return;
    this.hp--;
    if (this.hp <= 0) this.alive = false;
  }

  getHitbox() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

let enemies = [];

function spawnEnemies() {
  enemies = [
    // Place enemies ON platforms: platformY - enemy.h
    new Enemy(26 * TILE_SIZE, (LEVEL_HEIGHT - 2) * TILE_SIZE - 30, 12 * TILE_SIZE, 60 * TILE_SIZE),
    new Enemy(170 * TILE_SIZE, (LEVEL_HEIGHT - 6) * TILE_SIZE - 30, 150 * TILE_SIZE, 210 * TILE_SIZE),
    new Enemy(260 * TILE_SIZE, (LEVEL_HEIGHT - 7) * TILE_SIZE - 30, 240 * TILE_SIZE, 300 * TILE_SIZE),
    new Enemy(345 * TILE_SIZE, (LEVEL_HEIGHT - 7) * TILE_SIZE - 30, 320 * TILE_SIZE, 380 * TILE_SIZE),
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

      if (b.life <= 0 || isSolidAt(b.x, b.y) || b.x < 0 || b.x > LEVEL_WIDTH * TILE_SIZE) {
        remove = true;
      }

      if (!remove) {
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          const hb = enemy.getHitbox();
          if (b.x < hb.x + hb.w && b.x + b.w > hb.x && b.y < hb.y + hb.h && b.y + b.h > hb.y) {
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
   RENDERING
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
}

function drawTiles() {
  for (let y = 0; y < LEVEL_HEIGHT; y++) {
    for (let x = 0; x < LEVEL_WIDTH; x++) {
      const tile = level[y][x];
      if (tile === TILE_EMPTY) continue;

      const screenX = worldToScreen(x * TILE_SIZE);
      const screenY = y * TILE_SIZE;
      if (screenX > canvas.width || screenX + TILE_SIZE < 0) continue;

      if (tile === TILE_SOLID) {
        ctx.fillStyle = (y >= LEVEL_HEIGHT - 2) ? "#202028" : "#262644";
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = (y >= LEVEL_HEIGHT - 2) ? "#303040" : "#34345a";
        ctx.fillRect(screenX, screenY + TILE_SIZE - 4, TILE_SIZE, 4);
      } else if (tile === TILE_LADDER) {
        ctx.fillStyle = "#22f0ff";
        ctx.fillRect(screenX + TILE_SIZE / 2 - 2, screenY, 4, TILE_SIZE);
        ctx.fillRect(screenX + 2, screenY + 4, TILE_SIZE - 4, 2);
        ctx.fillRect(screenX + 2, screenY + 10, TILE_SIZE - 4, 2);
      } else if (tile === TILE_SPIKE) {
        ctx.fillStyle = "#ff3355";
        ctx.beginPath();
        ctx.moveTo(screenX, screenY + TILE_SIZE);
        ctx.lineTo(screenX + TILE_SIZE / 2, screenY);
        ctx.lineTo(screenX + TILE_SIZE, screenY + TILE_SIZE);
        ctx.closePath();
        ctx.fill();
      } else if (tile === TILE_CHECKPOINT) {
        ctx.fillStyle = "#00f0c8";
        ctx.fillRect(screenX + 6, screenY + 2, 4, TILE_SIZE - 4);
      } else if (tile === TILE_GOAL) {
        ctx.fillStyle = "#ffd400";
        ctx.fillRect(screenX + 2, screenY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      } else if (tile === TILE_PICKUP) {
        ctx.fillStyle = "#b15cff";
        ctx.fillRect(screenX + 5, screenY + 5, 6, 6);
      }
    }
  }
}

function drawHUD() {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = "10px monospace";
  ctx.fillText("HEALTH: " + player.health, 8, 16);
  ctx.fillText("PICKUPS: " + score, 8, 30);
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
  checkTileInteractions();
  checkPlayerEnemyCollisions();
  drawHUD();

  requestAnimationFrame(gameLoop);
}

gameLoop();
