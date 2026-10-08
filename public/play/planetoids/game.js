// --- Constants & Config ---
const DIFFICULTY_CONFIGS = {
    easy: { planetoidSpeed: 0.7, spawnRate: 1.0, maxShield: 150 },
    medium: { planetoidSpeed: 1.2, spawnRate: 1.5, maxShield: 100 },
    hard: { planetoidSpeed: 1.8, spawnRate: 2.0, maxShield: 70 }
};

const PLANETOID_TYPES = {
    STANDARD: { color: '#ffffff', points: 100, speedMultiplier: 1.0, name: 'Standard' },
    SWIFT: { color: '#00f0ff', points: 250, speedMultiplier: 2.0, name: 'Swift' },
    EXPLOSIVE: { color: '#ff0077', points: 400, speedMultiplier: 0.7, name: 'Explosive' },
    MAGNETIC: { color: '#bd00ff', points: 500, speedMultiplier: 0.8, name: 'Magnetic' },
    GOLDEN: { color: '#ffd700', points: 1000, speedMultiplier: 1.6, name: 'Golden' }
};

// --- Game State Variables ---
let canvas, ctx;
let gameMode = 'solo'; // 'solo', 'coop', 'versus'
let difficulty = 'medium';
let isGameRunning = false;
let isGamePaused = false;
let wave = 1;
let highScore = 0;
let keys = {};
let particles = [];
let planetoids = [];
let bullets = [];
let ships = [];
let blastRadii = [];
let floatScores = [];

// Audio trigger wrappers
function playSound(name, ...args) {
    if (window.gameAudio) {
        if (name === 'laser') window.gameAudio.playLaser();
        else if (name === 'laser2') window.gameAudio.playLaserP2();
        else if (name === 'explosion') window.gameAudio.playExplosion(...args);
        else if (name === 'thrust') window.gameAudio.setThrust(...args);
        else if (name === 'shield') window.gameAudio.setShield(...args);
        else if (name === 'hyper') window.gameAudio.playHyperspace();
        else if (name === 'levelup') window.gameAudio.playLevelUp();
        else if (name === 'collect') window.gameAudio.playCollect();
    }
}

// Load High Score
if (localStorage.getItem('planetoids_highScore')) {
    highScore = parseInt(localStorage.getItem('planetoids_highScore'));
}

// --- Ship Entity Class ---
class Ship {
    constructor(id, x, y, color, isAI = false) {
        this.id = id; // 1, 2, or 'ai'
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 16;
        this.angle = -Math.PI / 2; // Face upwards
        this.rotationSpeed = 0.08;
        this.thrustForce = 0.15;
        this.friction = 0.985;
        this.color = color;
        this.isAI = isAI;
        
        // Game state variables
        this.lives = 3;
        this.score = 0;
        this.shield = DIFFICULTY_CONFIGS[difficulty].maxShield;
        this.maxShield = DIFFICULTY_CONFIGS[difficulty].maxShield;
        this.shieldActive = false;
        this.shootCooldown = 0;
        this.invulnerabilityTime = 120; // 2 seconds at 60fps
        this.shotsFired = 0;
        this.shotsHit = 0;
        this.lastInputTime = Date.now();
        
        // Path/polygon points for custom rendering
        // Stingray hull: wide swept wings, notched tail
        this.shape = [
            { x: 16, y: 0 },
            { x: 6, y: -5 },
            { x: -4, y: -15 },
            { x: -12, y: -13 },
            { x: -8, y: -5 },
            { x: -13, y: 0 },
            { x: -8, y: 5 },
            { x: -12, y: 13 },
            { x: -4, y: 15 },
            { x: 6, y: 5 }
        ];

        // AI variables
        this.aiTarget = null;
        this.aiShootTimer = 0;
    }

    destroy() {
        this.lives--;
        playSound('explosion', 'large');
        
        // Spawn ring of particles
        createExplosionParticles(this.x, this.y, this.color, 40);
        
        if (this.lives > 0) {
            this.x = canvas.width / (gameMode === 'solo' ? 2 : (this.id === 1 ? 3 : 1.5));
            this.y = canvas.height / 2;
            this.vx = 0;
            this.vy = 0;
            this.angle = -Math.PI / 2;
            this.invulnerabilityTime = 120;
            this.shield = this.maxShield;
        }
    }

    update() {
        // Cooldown
        if (this.shootCooldown > 0) this.shootCooldown--;
        if (this.invulnerabilityTime > 0) this.invulnerabilityTime--;

        // Regenerate shield if not active
        if (!this.shieldActive && this.shield < this.maxShield) {
            this.shield = Math.min(this.maxShield, this.shield + 0.15);
        }

        // Handle AI or Player Control
        if (this.isAI) {
            this.updateAI();
        } else {
            this.updatePlayerControls();
        }

        // Apply friction
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Apply position
        this.x += this.vx;
        this.y += this.vy;

        // Screen wrap
        if (this.x < -this.radius) this.x = canvas.width + this.radius;
        else if (this.x > canvas.width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = canvas.height + this.radius;
        else if (this.y > canvas.height + this.radius) this.y = -this.radius;
    }

    updatePlayerControls() {
        let rotatingLeft = false;
        let rotatingRight = false;
        let thrusting = false;
        let shooting = false;
        let shielding = false;
        let hyperspace = false;

        if (this.id === 1) {
            // Player 1 controls (WASD/Arrows + Space)
            rotatingLeft = keys['KeyA'] || keys['ArrowLeft'];
            rotatingRight = keys['KeyD'] || keys['ArrowRight'];
            thrusting = keys['KeyW'] || keys['ArrowUp'];
            shooting = keys['Space'] || keys['ShiftLeft'] || keys['ShiftRight'];
            shielding = keys['KeyS'] || keys['ArrowDown'];
            hyperspace = keys['KeyC'] || keys['ControlLeft'];
        } else if (this.id === 2) {
            // Player 2 controls (IJKL / Arrows if P1 uses WASD)
            rotatingLeft = keys['KeyJ'];
            rotatingRight = keys['KeyL'];
            thrusting = keys['KeyI'];
            shooting = keys['Enter'] || keys['KeyO'];
            shielding = keys['KeyK'];
            hyperspace = keys['KeyU'];
        }

        // Apply virtual mobile touch buttons if active (P1 only)
        if (this.id === 1 && !touchControlsContainer.classList.contains('hidden')) {
            if (mobileControlsState.joystickActive) {
                // Steer ship using joystick angle
                const diff = mobileControlsState.joystickAngle - this.angle;
                // Normalize angle diff
                const normDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
                if (Math.abs(normDiff) > 0.15) {
                    if (normDiff > 0) this.angle += this.rotationSpeed;
                    else this.angle -= this.rotationSpeed;
                }
            }
            if (mobileControlsState.thrust) thrusting = true;
            if (mobileControlsState.shoot) shooting = true;
            if (mobileControlsState.shield) shielding = true;
            if (mobileControlsState.hyperspace) {
                hyperspace = true;
                mobileControlsState.hyperspace = false; // Reset instant trigger
            }
        }

        // Apply rotation
        if (rotatingLeft) this.angle -= this.rotationSpeed;
        if (rotatingRight) this.angle += this.rotationSpeed;

        // Apply thrust
        if (thrusting) {
            this.vx += Math.cos(this.angle) * this.thrustForce;
            this.vy += Math.sin(this.angle) * this.thrustForce;
            
            // Spawn thrust particles
            const tailX = this.x - Math.cos(this.angle) * 14;
            const tailY = this.y - Math.sin(this.angle) * 14;
            particles.push(new Particle(
                tailX, tailY,
                -Math.cos(this.angle) * 1.5 + (Math.random() - 0.5),
                -Math.sin(this.angle) * 1.5 + (Math.random() - 0.5),
                '#ffaa00',
                20 + Math.random() * 20
            ));
            
            if (this.id === 1) playSound('thrust', true);
        } else {
            if (this.id === 1) playSound('thrust', false);
        }

        // Apply shield
        if (shielding && this.shield > 0) {
            this.shieldActive = true;
            this.shield -= 0.6; // Consume shield
            if (this.id === 1) playSound('shield', true);
        } else {
            this.shieldActive = false;
            if (this.id === 1) playSound('shield', false);
        }

        // Apply shoot
        if (shooting && this.shootCooldown === 0) {
            this.shoot();
        }

        // Apply hyperspace
        if (hyperspace) {
            this.triggerHyperspace();
        }
    }

    updateAI() {
        // Toggle shield if threat is very close
        let nearestDist = Infinity;
        let threat = null;
        for (const ast of planetoids) {
            const dist = Math.hypot(ast.x - this.x, ast.y - this.y);
            if (dist < nearestDist) {
                nearestDist = dist;
                threat = ast;
            }
        }

        if (threat && nearestDist < 90 && this.shield > 10) {
            this.shieldActive = true;
            this.shield -= 0.5;
        } else {
            this.shieldActive = false;
        }

        // Search for target rock
        if (!this.aiTarget || !planetoids.includes(this.aiTarget)) {
            let bestTarget = null;
            let minDist = Infinity;
            
            for (const ast of planetoids) {
                const dist = Math.hypot(ast.x - this.x, ast.y - this.y);
                // Prioritize closer and Golden planetoids
                const weight = ast.type === PLANETOID_TYPES.GOLDEN ? dist / 3 : dist;
                if (weight < minDist) {
                    minDist = weight;
                    bestTarget = ast;
                }
            }
            this.aiTarget = bestTarget;
        }

        if (this.aiTarget) {
            // Calculate angle to target
            const dx = this.aiTarget.x - this.x;
            const dy = this.aiTarget.y - this.y;
            const angleToTarget = Math.atan2(dy, dx);
            
            // Rotational steering
            const diff = angleToTarget - this.angle;
            const normDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
            
            if (normDiff > 0.1) this.angle += this.rotationSpeed;
            else if (normDiff < -0.1) this.angle -= this.rotationSpeed;

            // Thrust towards target if somewhat aligned and not moving too fast
            const speed = Math.hypot(this.vx, this.vy);
            if (Math.abs(normDiff) < 0.4 && speed < 3.5) {
                this.vx += Math.cos(this.angle) * this.thrustForce * 0.8;
                this.vy += Math.sin(this.angle) * this.thrustForce * 0.8;
            }

            // Shoot at target if aligned
            if (Math.abs(normDiff) < 0.25 && this.shootCooldown === 0) {
                this.shoot();
            }
        }
    }

    shoot() {
        this.shootCooldown = 12; // 5 shots per second
        this.shotsFired++;
        
        const bx = this.x + Math.cos(this.angle) * 16;
        const by = this.y + Math.sin(this.angle) * 16;
        const bvx = Math.cos(this.angle) * 7.5 + this.vx * 0.4;
        const bvy = Math.sin(this.angle) * 7.5 + this.vy * 0.4;

        bullets.push(new Bullet(bx, by, bvx, bvy, this.color, this));
        
        if (this.id === 1) playSound('laser');
        else playSound('laser2');
    }

    triggerHyperspace() {
        playSound('hyper');
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = 0;
        this.vy = 0;
        this.invulnerabilityTime = 40; // Quick invuln on reappear
        
        // Reappear sparks
        createExplosionParticles(this.x, this.y, '#ffffff', 15);
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Draw Ship vector shape
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        
        ctx.beginPath();
        ctx.moveTo(this.shape[0].x, this.shape[0].y);
        for (let i = 1; i < this.shape.length; i++) {
            ctx.lineTo(this.shape[i].x, this.shape[i].y);
        }
        ctx.closePath();
        
        // Invulnerability flickering
        if (this.invulnerabilityTime > 0 && Math.floor(this.invulnerabilityTime / 4) % 2 === 0) {
            ctx.strokeStyle = 'transparent';
            ctx.shadowBlur = 0;
        }
        ctx.stroke();

        // Draw thrust fire if key pressed
        const thrustActive = (this.id === 1) ? (keys['KeyW'] || keys['ArrowUp'] || mobileControlsState.thrust) : (this.id === 2 ? keys['KeyI'] : false);
        if ((thrustActive || this.isAI) && Math.random() > 0.3) {
            ctx.beginPath();
            ctx.moveTo(-10, -3);
            ctx.lineTo(-20 - Math.random() * 8, 0);
            ctx.lineTo(-10, 3);
            ctx.strokeStyle = '#ffaa00';
            ctx.shadowColor = '#ffaa00';
            ctx.stroke();
        }

        ctx.restore();

        // Draw shield bubble if active
        if (this.shieldActive) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 15;
            // Draw a subtle translucent inner fill
            ctx.fillStyle = this.color === '#00f0ff' ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 170, 0, 0.08)';
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }
}

// --- Bullet Entity Class ---
class Bullet {
    constructor(x, y, vx, vy, color, owner) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.radius = 2.5;
        this.life = 70; // Lifespan in frames
        this.owner = owner; // Reference to ship
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;

        // Screen wrap
        if (this.x < 0) this.x = canvas.width;
        else if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        else if (this.y > canvas.height) this.y = 0;
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
    }
}

// --- Planetoid Entity Class ---
class Planetoid {
    constructor(x, y, radius, type, stage = 3) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.type = type; // PLANETOID_TYPES
        this.stage = stage; // 3 = Large, 2 = Medium, 1 = Small
        
        // Random drift speed scaled by difficulty & type speed multiplier
        const baseSpeed = DIFFICULTY_CONFIGS[difficulty].planetoidSpeed;
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 0.8 + 0.4) * baseSpeed * type.speedMultiplier;
        
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        // Set health (Purple needs multiple hits)
        this.health = (type === PLANETOID_TYPES.MAGNETIC) ? 2 : 1;

        // Custom jagged wireframe path generation
        this.points = [];
        const numPoints = Math.floor(Math.random() * 5) + 9; // 9 to 13 vertices
        for (let i = 0; i < numPoints; i++) {
            const a = (i / numPoints) * Math.PI * 2;
            const r = this.radius * (0.8 + Math.random() * 0.4);
            this.points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
        }
    }

    update() {
        // Special logic: Magnetic drifts towards closest ship
        if (this.type === PLANETOID_TYPES.MAGNETIC && ships.length > 0) {
            let targetShip = null;
            let minDist = Infinity;
            for (const ship of ships) {
                if (ship.lives <= 0) continue;
                const dist = Math.hypot(ship.x - this.x, ship.y - this.y);
                if (dist < minDist) {
                    minDist = dist;
                    targetShip = ship;
                }
            }
            if (targetShip) {
                // Steer slightly towards target
                const dx = targetShip.x - this.x;
                const dy = targetShip.y - this.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    this.vx += (dx / dist) * 0.015;
                    this.vy += (dy / dist) * 0.015;
                    // Cap max speed for magnetic
                    const speed = Math.hypot(this.vx, this.vy);
                    if (speed > 2.2) {
                        this.vx = (this.vx / speed) * 2.2;
                        this.vy = (this.vy / speed) * 2.2;
                    }
                }
            }
        }

        // Apply motion
        this.x += this.vx;
        this.y += this.vy;

        // Screen wrap
        if (this.x < -this.radius) this.x = canvas.width + this.radius;
        else if (this.x > canvas.width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = canvas.height + this.radius;
        else if (this.y > canvas.height + this.radius) this.y = -this.radius;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();
        
        ctx.strokeStyle = this.type.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = this.health > 1 ? 12 : 6;
        ctx.shadowColor = this.type.color;
        
        // Draw double line for shielded magnetic
        if (this.type === PLANETOID_TYPES.MAGNETIC && this.health === 2) {
            ctx.stroke();
            ctx.save();
            ctx.scale(0.85, 0.85);
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        } else {
            ctx.stroke();
        }

        // Draw inner cross wireframe for Explosive
        if (this.type === PLANETOID_TYPES.EXPLOSIVE) {
            ctx.beginPath();
            ctx.moveTo(-this.radius * 0.4, 0);
            ctx.lineTo(this.radius * 0.4, 0);
            ctx.moveTo(0, -this.radius * 0.4);
            ctx.lineTo(0, this.radius * 0.4);
            ctx.strokeStyle = '#ff0055';
            ctx.stroke();
        }

        ctx.restore();
    }

    damage(bulletOwner) {
        this.health--;
        if (this.health > 0) {
            // Still alive, play alert ping
            playSound('explosion', 'small');
            createExplosionParticles(this.x, this.y, this.type.color, 8);
            return;
        }

        // Dead! Add points to player
        if (bulletOwner) {
            bulletOwner.score += this.type.points;
            bulletOwner.shotsHit++;
            floatScores.push(new FloatingScore(this.x, this.y, `+${this.type.points}`, this.type.color));
        }

        // Play explosion sound
        if (this.type === PLANETOID_TYPES.EXPLOSIVE) {
            playSound('explosion', 'explosive');
            triggerExplosiveBlast(this.x, this.y, this.radius * 3.5, bulletOwner);
        } else if (this.stage === 3) {
            playSound('explosion', 'large');
        } else if (this.stage === 2) {
            playSound('explosion', 'medium');
        } else {
            playSound('explosion', 'small');
        }

        // Particle burst
        createExplosionParticles(this.x, this.y, this.type.color, this.stage * 10);

        // Split logic
        if (this.stage > 1 && this.type !== PLANETOID_TYPES.GOLDEN) {
            const newRadius = this.radius / 1.7;
            const newStage = this.stage - 1;
            
            // Spawn 2 smaller planetoids
            planetoids.push(new Planetoid(this.x, this.y, newRadius, this.type, newStage));
            planetoids.push(new Planetoid(this.x, this.y, newRadius, this.type, newStage));
        } else if (this.type === PLANETOID_TYPES.GOLDEN) {
            // Golden drops star collection items
            for (let i = 0; i < 4; i++) {
                particles.push(new Particle(
                    this.x, this.y,
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 4,
                    '#ffd700',
                    100, // Long life
                    true // Is gold collector particle
                ));
            }
        }

        // Remove from list
        const idx = planetoids.indexOf(this);
        if (idx > -1) planetoids.splice(idx, 1);
    }
}

// --- Explosive Blast Ring Entity ---
class BlastRadius {
    constructor(x, y, maxRadius, owner) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.maxRadius = maxRadius;
        this.owner = owner;
        this.life = 25; // 25 frames
        this.maxLife = 25;
    }

    update() {
        this.radius += (this.maxRadius - 5) / this.maxLife;
        this.life--;
        
        // Damage nearby planetoids
        for (let i = planetoids.length - 1; i >= 0; i--) {
            const ast = planetoids[i];
            const dist = Math.hypot(ast.x - this.x, ast.y - this.y);
            if (dist < this.radius + ast.radius) {
                // Instantly break
                ast.damage(this.owner);
            }
        }
        
        // Push ships away and deal shield damage
        for (const ship of ships) {
            if (ship.lives <= 0 || ship.invulnerabilityTime > 0) continue;
            const dist = Math.hypot(ship.x - this.x, ship.y - this.y);
            if (dist < this.radius + ship.radius && dist > 10) {
                // Apply knockback
                const force = (1 - (dist / this.maxRadius)) * 5;
                const angle = Math.atan2(ship.y - this.y, ship.x - this.x);
                ship.vx += Math.cos(angle) * force;
                ship.vy += Math.sin(angle) * force;
                
                // Damage shield/hull if not protected
                if (ship.shieldActive) {
                    ship.shield = Math.max(0, ship.shield - 1.5);
                } else {
                    ship.destroy();
                }
            }
        }
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 0, 119, ${this.life / this.maxLife})`;
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ff0077';
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.restore();
    }
}

function triggerExplosiveBlast(x, y, maxRadius, owner) {
    blastRadii.push(new BlastRadius(x, y, maxRadius, owner));
}

// --- Floating Score Popups ---
class FloatingScore {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.vy = -0.8;
        this.life = 45; // 45 frames
    }

    update() {
        this.y += this.vy;
        this.life--;
    }

    draw() {
        ctx.save();
        ctx.font = 'bold 12px Orbitron';
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 5;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// --- Particle System ---
class Particle {
    constructor(x, y, vx, vy, color, life, isGold = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.isGold = isGold;
        this.radius = isGold ? 4 : (Math.random() * 1.5 + 1);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;

        // Screen wrap
        if (this.x < 0) this.x = canvas.width;
        else if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        else if (this.y > canvas.height) this.y = 0;

        // If gold, check proximity to player to "collect"
        if (this.isGold) {
            for (const ship of ships) {
                if (ship.lives <= 0) continue;
                const dist = Math.hypot(ship.x - this.x, ship.y - this.y);
                if (dist < ship.radius + 15) {
                    ship.score += 200; // Extra collection points!
                    playSound('collect');
                    floatScores.push(new FloatingScore(this.x, this.y, '+200', '#ffd700'));
                    this.life = 0; // Terminate particle
                }
            }
        }
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        if (this.isGold) {
            // Draw sparkling star shape
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd700';
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#ffd700';
        } else {
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 4;
            ctx.shadowColor = this.color;
        }
        ctx.fill();
        ctx.restore();
    }
}

function createExplosionParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3.2 + 0.8;
        particles.push(new Particle(
            x, y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            color,
            30 + Math.random() * 30
        ));
    }
}

// --- Main Menu and Settings Management ---
function toggleMenu(menuId) {
    // Hide all overlays
    const overlays = document.querySelectorAll('.menu-overlay');
    overlays.forEach(overlay => {
        overlay.classList.add('hidden');
        overlay.classList.remove('active');
    });

    // Show targeted overlay
    const target = document.getElementById(menuId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }
}

// Option variables
let hasAITeammate = false;
let isMobileMode = 'auto'; // 'auto', 'always', 'never'

function updateDifficulty() {
    difficulty = document.getElementById('difficulty-select').value;
}

function toggleAI() {
    hasAITeammate = document.getElementById('ai-teammate').checked;
}

function updateVolume() {
    const vol = document.getElementById('volume-slider').value;
    if (window.gameAudio) {
        window.gameAudio.setVolume(vol);
    }
}

function updateMobileControls() {
    isMobileMode = document.getElementById('mobile-controls-toggle').value;
    configureMobileHUD();
}

function configureMobileHUD() {
    const touchUI = document.getElementById('touch-controls');
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    
    if (isMobileMode === 'always' || (isMobileMode === 'auto' && isTouch)) {
        touchUI.classList.remove('hidden');
        menuToggle.classList.remove('hidden');
    } else {
        touchUI.classList.add('hidden');
        menuToggle.classList.add('hidden');
    }
}

// --- Keyboard Event Handling ---
window.addEventListener('keydown', (e) => {
    // Avoid default scrolling
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
    keys[e.code] = true;
    
    // Init Audio Context on first keypress
    if (window.gameAudio) {
        window.gameAudio.init();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// --- Mobile Touch Events ---
const mobileControlsState = {
    joystickActive: false,
    joystickStartX: 0,
    joystickStartY: 0,
    joystickAngle: 0,
    thrust: false,
    shoot: false,
    shield: false,
    hyperspace: false
};

const touchControlsContainer = document.getElementById('touch-controls');
const knob = document.getElementById('touch-knob');
const joystick = document.getElementById('touch-joystick');

if (joystick) {
    joystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = joystick.getBoundingClientRect();
        mobileControlsState.joystickStartX = rect.left + rect.width / 2;
        mobileControlsState.joystickStartY = rect.top + rect.height / 2;
        mobileControlsState.joystickActive = true;
        
        handleJoystickMove(touch.clientX, touch.clientY);
        
        if (window.gameAudio) window.gameAudio.init();
    });

    joystick.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!mobileControlsState.joystickActive) return;
        const touch = e.touches[0];
        handleJoystickMove(touch.clientX, touch.clientY);
    });

    joystick.addEventListener('touchend', (e) => {
        e.preventDefault();
        mobileControlsState.joystickActive = false;
        knob.style.transform = 'translate(-50%, -50%)';
    });
}

function handleJoystickMove(clientX, clientY) {
    const dx = clientX - mobileControlsState.joystickStartX;
    const dy = clientY - mobileControlsState.joystickStartY;
    const dist = Math.hypot(dx, dy);
    const maxDist = 45; // Joystick bounding limit
    
    mobileControlsState.joystickAngle = Math.atan2(dy, dx);
    
    const scale = Math.min(dist, maxDist);
    const moveX = Math.cos(mobileControlsState.joystickAngle) * scale;
    const moveY = Math.sin(mobileControlsState.joystickAngle) * scale;
    
    knob.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
}

// Map screen buttons
const btnThrust = document.getElementById('btn-thrust');
const btnShoot = document.getElementById('btn-shoot');
const btnShield = document.getElementById('btn-shield');
const btnHyper = document.getElementById('btn-hyperspace');

function bindTouchButton(btnElement, stateProp) {
    if (!btnElement) return;
    btnElement.addEventListener('touchstart', (e) => {
        e.preventDefault();
        mobileControlsState[stateProp] = true;
        if (window.gameAudio) window.gameAudio.init();
    });
    btnElement.addEventListener('touchend', (e) => {
        e.preventDefault();
        mobileControlsState[stateProp] = false;
    });
}

bindTouchButton(btnThrust, 'thrust');
bindTouchButton(btnShoot, 'shoot');
bindTouchButton(btnShield, 'shield');
if (btnHyper) {
    btnHyper.addEventListener('touchstart', (e) => {
        e.preventDefault();
        mobileControlsState.hyperspace = true;
        if (window.gameAudio) window.gameAudio.init();
    });
}

// --- Game Initialization & Flow ---
window.addEventListener('load', () => {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    document.getElementById('menu-high-score').innerText = formatScore(highScore);
});

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    configureMobileHUD();
}

function formatScore(val) {
    return String(val).padStart(6, '0');
}

function startGame(mode) {
    gameMode = mode;
    isGameRunning = true;
    isGamePaused = false;
    wave = 1;
    
    // Reset Entity arrays
    ships = [];
    planetoids = [];
    bullets = [];
    particles = [];
    blastRadii = [];
    floatScores = [];
    
    // Hide options and overlays
    toggleMenu('');
    document.getElementById('hud').classList.remove('hidden');
    
    // Spawn player(s)
    if (gameMode === 'solo') {
        ships.push(new Ship(1, canvas.width / 2, canvas.height / 2, '#00f0ff'));
        if (hasAITeammate) {
            ships.push(new Ship('ai', canvas.width / 1.7, canvas.height / 2, '#bd00ff', true));
        }
        document.getElementById('p1-hud').classList.remove('hidden');
        document.getElementById('p2-hud').classList.add('hidden');
    } else if (gameMode === 'coop' || gameMode === 'versus') {
        ships.push(new Ship(1, canvas.width / 3, canvas.height / 2, '#00f0ff'));
        ships.push(new Ship(2, canvas.width / 1.5, canvas.height / 2, '#ffaa00'));
        
        document.getElementById('p1-hud').classList.remove('hidden');
        document.getElementById('p2-hud').classList.remove('hidden');
    }

    updateHUD();
    spawnWave();
    
    // Play Game start tune
    playSound('levelup');
    
    requestAnimationFrame(gameLoop);
}

function spawnWave() {
    planetoids = [];
    
    // Spawn planetoids
    const count = 4 + wave * 2;
    for (let i = 0; i < count; i++) {
        // Find safe spawn coords away from the players
        let rx, ry;
        let isSafe = false;
        while (!isSafe) {
            rx = Math.random() * canvas.width;
            ry = Math.random() * canvas.height;
            
            isSafe = true;
            for (const ship of ships) {
                if (Math.hypot(ship.x - rx, ship.y - ry) < 180) {
                    isSafe = false;
                    break;
                }
            }
        }

        // Determine type probability
        let type = PLANETOID_TYPES.STANDARD;
        const rand = Math.random();
        
        if (rand < 0.15) {
            type = PLANETOID_TYPES.GOLDEN;
        } else if (rand < 0.35) {
            type = PLANETOID_TYPES.MAGNETIC;
        } else if (rand < 0.55) {
            type = PLANETOID_TYPES.EXPLOSIVE;
        } else if (rand < 0.75) {
            type = PLANETOID_TYPES.SWIFT;
        }

        planetoids.push(new Planetoid(rx, ry, 35, type, 3));
    }
}

// --- Main Game Loop ---
let lastTime = 0;
function gameLoop(time) {
    if (!isGameRunning) return;
    if (isGamePaused) return;

    const dt = time - lastTime;
    lastTime = time;

    update();
    draw();

    requestAnimationFrame(gameLoop);
}

// --- Update Logic ---
function update() {
    // 1. Update ships
    let anyPlayerAlive = false;
    for (const ship of ships) {
        if (ship.lives > 0) {
            ship.update();
            anyPlayerAlive = true;
        }
    }

    if (!anyPlayerAlive) {
        endGame();
        return;
    }

    // 2. Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.update();
        if (b.life <= 0) {
            bullets.splice(i, 1);
        }
    }

    // 3. Update planetoids
    for (const ast of planetoids) {
        ast.update();
    }

    // 4. Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }

    // 5. Update blast radii
    for (let i = blastRadii.length - 1; i >= 0; i--) {
        const br = blastRadii[i];
        br.update();
        if (br.life <= 0) {
            blastRadii.splice(i, 1);
        }
    }

    // 6. Update Floating Scores
    for (let i = floatScores.length - 1; i >= 0; i--) {
        const fs = floatScores[i];
        fs.update();
        if (fs.life <= 0) {
            floatScores.splice(i, 1);
        }
    }

    // 7. Check collisions
    checkCollisions();

    // 8. Next wave trigger
    if (planetoids.length === 0) {
        wave++;
        playSound('levelup');
        spawnWave();
    }

    updateHUD();
}

function checkCollisions() {
    // Bullet to rock collision
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        for (let j = planetoids.length - 1; j >= 0; j--) {
            const ast = planetoids[j];
            const dist = Math.hypot(b.x - ast.x, b.y - ast.y);
            if (dist < ast.radius + b.radius) {
                // Remove bullet and deal damage to planetoid
                bullets.splice(i, 1);
                ast.damage(b.owner);
                break;
            }
        }
    }

    // Versus mode: Bullet to Ship collision
    if (gameMode === 'versus') {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            for (const ship of ships) {
                if (ship.lives <= 0 || ship.invulnerabilityTime > 0 || b.owner === ship) continue;
                const dist = Math.hypot(b.x - ship.x, b.y - ship.y);
                if (dist < ship.radius + b.radius) {
                    bullets.splice(i, 1);
                    if (ship.shieldActive) {
                        ship.shield = Math.max(0, ship.shield - 25);
                    } else {
                        ship.destroy();
                        if (b.owner) b.owner.score += 500; // Bonus points for hitting opponent
                    }
                    break;
                }
            }
        }
    }

    // Ship to rock collision
    for (const ship of ships) {
        if (ship.lives <= 0 || ship.invulnerabilityTime > 0) continue;

        for (const ast of planetoids) {
            const dist = Math.hypot(ship.x - ast.x, ship.y - ast.y);
            if (dist < ship.radius + ast.radius) {
                if (ship.shieldActive) {
                    // Shield absorbs collision, pushes ship, damages rock slightly
                    ship.shield = Math.max(0, ship.shield - 35);
                    ast.vx += (ast.x - ship.x) * 0.05;
                    ast.vy += (ast.y - ship.y) * 0.05;
                    
                    // Push ship back
                    ship.vx = (ship.x - ast.x) * 0.1;
                    ship.vy = (ship.y - ast.y) * 0.1;
                    
                    playSound('explosion', 'small');
                    createExplosionParticles(ship.x, ship.y, ship.color, 5);
                } else {
                    // Destroy ship
                    ship.destroy();
                    ast.damage(ship); // Splinter rock
                    break;
                }
            }
        }
    }
}

// --- Render Logic ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Starfield background decoration
    drawStars();

    // 2. Draw Blast Radii
    for (const br of blastRadii) {
        br.draw();
    }

    // 3. Draw Ships
    for (const ship of ships) {
        if (ship.lives > 0) {
            ship.draw();
        }
    }

    // 4. Draw Bullets
    for (const b of bullets) {
        b.draw();
    }

    // 5. Draw rocks
    for (const ast of planetoids) {
        ast.draw();
    }

    // 6. Draw Particles
    for (const p of particles) {
        p.draw();
    }

    // 7. Draw Floating Scores
    for (const fs of floatScores) {
        fs.draw();
    }
}

// Simple deterministic background stars drift
let starField = [];
function initStars() {
    starField = [];
    const count = 65;
    for (let i = 0; i < count; i++) {
        starField.push({
            x: Math.random(),
            y: Math.random(),
            size: Math.random() * 1.5 + 0.5,
            color: Math.random() > 0.8 ? '#00f0ff' : '#ffffff'
        });
    }
}
initStars();

function drawStars() {
    ctx.save();
    for (const star of starField) {
        const sx = star.x * canvas.width;
        const sy = star.y * canvas.height;
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.shadowColor = star.color;
        ctx.shadowBlur = 3;
        ctx.fill();
    }
    ctx.restore();
}

// --- HUD State Management ---
function updateHUD() {
    const p1 = ships.find(s => s.id === 1);
    const p2 = ships.find(s => s.id === 2);
    
    document.getElementById('wave-num').innerText = wave;

    if (p1) {
        document.getElementById('p1-score').innerText = formatScore(p1.score);
        renderLivesUI('p1-lives', p1.lives);
        const shieldBar = document.getElementById('p1-shield-bar');
        if (shieldBar) {
            shieldBar.style.width = `${(p1.shield / p1.maxShield) * 100}%`;
        }
    }

    if (p2) {
        document.getElementById('p2-score').innerText = formatScore(p2.score);
        renderLivesUI('p2-lives', p2.lives);
        const shieldBar = document.getElementById('p2-shield-bar');
        if (shieldBar) {
            shieldBar.style.width = `${(p2.shield / p2.maxShield) * 100}%`;
        }
    }
}

function renderLivesUI(elementId, lives) {
    const box = document.getElementById(elementId);
    if (!box) return;
    box.innerHTML = '';
    for (let i = 0; i < Math.max(0, lives); i++) {
        const icon = document.createElement('span');
        icon.className = 'hud-life-icon';
        box.appendChild(icon);
    }
}

// --- Game Actions ---
function pauseGame() {
    isGamePaused = !isGamePaused;
    
    if (isGamePaused) {
        toggleMenu('game-over-menu');
        document.getElementById('game-over-title').innerText = 'GAME PAUSED';
        document.getElementById('restart-btn').innerText = 'RESUME';
    } else {
        toggleMenu('');
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
}

function endGame() {
    isGameRunning = false;
    toggleMenu('game-over-menu');
    document.getElementById('game-over-title').innerText = 'GAME OVER';
    document.getElementById('restart-btn').innerText = 'PLAY AGAIN';
    
    // Handle statistics display
    const p1 = ships.find(s => s.id === 1);
    const p2 = ships.find(s => s.id === 2);
    const ai = ships.find(s => s.id === 'ai');

    if (p1) {
        document.getElementById('p1-stats-box').classList.remove('hidden');
        document.getElementById('p1-final-score').innerText = formatScore(p1.score);
        const acc = p1.shotsFired > 0 ? Math.round((p1.shotsHit / p1.shotsFired) * 100) : 0;
        document.getElementById('p1-final-accuracy').innerText = `Accuracy: ${acc}%`;
        
        // High score updates
        if (p1.score > highScore) {
            highScore = p1.score;
            localStorage.setItem('planetoids_highScore', highScore);
            document.getElementById('menu-high-score').innerText = formatScore(highScore);
        }
    }

    if (p2) {
        document.getElementById('p2-stats-box').classList.remove('hidden');
        document.getElementById('p2-final-score').innerText = formatScore(p2.score);
        const acc = p2.shotsFired > 0 ? Math.round((p2.shotsHit / p2.shotsFired) * 100) : 0;
        document.getElementById('p2-final-accuracy').innerText = `Accuracy: ${acc}%`;
        
        if (p2.score > highScore) {
            highScore = p2.score;
            localStorage.setItem('planetoids_highScore', highScore);
            document.getElementById('menu-high-score').innerText = formatScore(highScore);
        }
    } else if (ai) {
        // Display AI score in P2 section for Coop with AI
        document.getElementById('p2-stats-box').classList.remove('hidden');
        document.getElementById('p2-stats-box').querySelector('h3').innerText = 'BOT SCORE';
        document.getElementById('p2-final-score').innerText = formatScore(ai.score);
        const acc = ai.shotsFired > 0 ? Math.round((ai.shotsHit / ai.shotsFired) * 100) : 0;
        document.getElementById('p2-final-accuracy').innerText = `Accuracy: ${acc}%`;
    } else {
        document.getElementById('p2-stats-box').classList.add('hidden');
    }
}

function restartGame() {
    if (isGamePaused) {
        // Just resume
        pauseGame();
    } else {
        startGame(gameMode);
    }
}
