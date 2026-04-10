const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let highScore = localStorage.getItem('flappyHighScore') || 0;
let frames = 0;
let shakeTime = 0;
let flashOpacity = 0;

// Particles System
let particles = [];
function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            radius: Math.random() * 4 + 2,
            life: 1.0,
            color: color
        });
    }
}

// Parallax Background
const clouds = [];
function spawnCloud() {
    clouds.push({
        x: canvas.width + 100,
        y: Math.random() * (canvas.height * 0.6),
        speed: 0.5 + Math.random() * 1,
        w: 60 + Math.random() * 100,
        h: 30 + Math.random() * 20
    });
}

// Bird Properties
const bird = {
    x: 0,
    y: 0,
    radius: 14,
    gravity: 0.25,
    jump: 5.5,
    velocity: 0,
    rotation: 0,
    wingAnim: 0,

    update() {
        if (gameState === 'START') {
            this.y = (canvas.height / 2) + Math.sin(frames * 0.1) * 15;
            this.rotation = Math.sin(frames * 0.05) * 0.2;
            this.wingAnim = Math.sin(frames * 0.2) * 5;
            return;
        }

        this.velocity += this.gravity;
        this.y += this.velocity;
        this.wingAnim = Math.sin(frames * 0.4) * 8;

        // Rotation logic
        let targetRotation = Math.atan2(this.velocity, 10);
        this.rotation += (targetRotation - this.rotation) * 0.2;

        // Floor collision
        if (this.y + this.radius >= canvas.height - 80) {
            this.y = canvas.height - 80 - this.radius;
            gameOver();
        }

        // Ceiling
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.velocity = 0;
        }
    },

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Body shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(2, 2, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Bird Body
        ctx.fillStyle = '#f7d308';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(6, -5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(8, -5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Wing
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-6, this.wingAnim, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Beak
        ctx.fillStyle = '#f75308';
        ctx.beginPath();
        ctx.moveTo(10, -2);
        ctx.lineTo(20, 2);
        ctx.lineTo(10, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
};

// Pipes
const pipes = {
    position: [],
    gap: 160,
    width: 60,
    speed: 3.5,

    update() {
        if (gameState !== 'PLAYING') return;

        if (frames % 90 === 0) {
            const minHeight = 80;
            const maxHeight = canvas.height - 80 - this.gap - 80;
            const topY = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
            
            this.position.push({
                x: canvas.width,
                y: topY,
                scored: false
            });
        }

        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            p.x -= this.speed;

            // Collision Detection
            if (bird.x + bird.radius - 4 > p.x && bird.x - bird.radius + 4 < p.x + this.width) {
                if (bird.y - bird.radius + 4 < p.y || bird.y + bird.radius - 4 > p.y + this.gap) {
                    gameOver();
                }
            }

            // Score increment
            if (p.x + this.width < bird.x && !p.scored) {
                score++;
                p.scored = true;
                if (score > highScore) {
                    highScore = score;
                    localStorage.setItem('flappyHighScore', highScore);
                }
            }

            // Remove off-screen pipes
            if (p.x + this.width < 0) {
                this.position.splice(i, 1);
                i--;
            }
        }
    },

    draw() {
        this.position.forEach(p => {
            // Pipe drawing with gradient and cap
            const grad = ctx.createLinearGradient(p.x, 0, p.x + this.width, 0);
            grad.addColorStop(0, '#73bf2e');
            grad.addColorStop(0.5, '#96e051');
            grad.addColorStop(1, '#558022');

            ctx.fillStyle = grad;
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;

            // Top Pipe
            ctx.fillRect(p.x, 0, this.width, p.y);
            ctx.strokeRect(p.x, -5, this.width, p.y + 5);
            // Top Cap
            ctx.fillRect(p.x - 5, p.y - 25, this.width + 10, 25);
            ctx.strokeRect(p.x - 5, p.y - 25, this.width + 10, 25);
            
            // Bottom Pipe
            ctx.fillRect(p.x, p.y + this.gap, this.width, canvas.height - (p.y + this.gap));
            ctx.strokeRect(p.x, p.y + this.gap, this.width, canvas.height - (p.y + this.gap));
            // Bottom Cap
            ctx.fillRect(p.x - 5, p.y + this.gap, this.width + 10, 25);
            ctx.strokeRect(p.x - 5, p.y + this.gap, this.width + 10, 25);
        });
    }
};

function drawBackground() {
    // Sky
    ctx.fillStyle = '#4ec0ca';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    clouds.forEach((c, idx) => {
        c.x -= c.speed;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.w, c.h, 0, 0, Math.PI * 2);
        ctx.fill();
        if (c.x + c.w < 0) clouds.splice(idx, 1);
    });
    if (frames % 120 === 0) spawnCloud();

    // City Silhouettes (Parallax)
    ctx.fillStyle = '#3eb0ba';
    const cityStep = 60;
    for(let i = 0; i < canvas.width + cityStep; i += cityStep) {
        let h = 40 + Math.sin((i + frames * 0.5) * 0.01) * 20;
        ctx.fillRect(i - (frames * 0.5) % cityStep, canvas.height - 80 - h, cityStep, h);
    }

    // Ground
    const groundH = 80;
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, canvas.height - groundH, canvas.width, groundH);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.strokeRect(-5, canvas.height - groundH, canvas.width + 10, groundH + 5);

    // Grass stripe
    ctx.fillStyle = '#73bf2e';
    ctx.fillRect(0, canvas.height - groundH, canvas.width, 15);
    ctx.strokeRect(-5, canvas.height - groundH, canvas.width + 10, 15);
}

function updateParticles() {
    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= 0.02;
        if (p.life <= 0) {
            particles.splice(i, 1);
            i--;
            continue;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

function gameOver() {
    if (gameState === 'GAMEOVER') return;
    gameState = 'GAMEOVER';
    shakeTime = 15;
    flashOpacity = 1.0;
    createParticles(bird.x, bird.y, '#f7d308', 20);
    createParticles(bird.x, bird.y, '#f75308', 10);
}

function reset() {
    score = 0;
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    bird.rotation = 0;
    pipes.position = [];
    particles = [];
    gameState = 'START';
}

function handleInput() {
    if (gameState === 'START') {
        gameState = 'PLAYING';
        bird.velocity = -bird.jump;
        createParticles(bird.x, bird.y, '#fff', 5);
    } else if (gameState === 'PLAYING') {
        bird.velocity = -bird.jump;
        createParticles(bird.x - 10, bird.y, '#fff', 3);
    } else if (gameState === 'GAMEOVER') {
        if (flashOpacity <= 0) reset();
    }
}

// Input listeners
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') handleInput();
});
canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput();
}, {passive: false});

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    bird.x = canvas.width / 4;
    bird.y = canvas.height / 2;
}

window.addEventListener('resize', resize);
resize();

function loop() {
    frames++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (shakeTime > 0) {
        ctx.save();
        ctx.translate(Math.random() * 10 - 5, Math.random() * 10 - 5);
        shakeTime--;
    }

    drawBackground();
    pipes.update();
    pipes.draw();
    bird.update();
    bird.draw();
    updateParticles();

    if (shakeTime >= 0) ctx.restore();

    // Screen Flash
    if (flashOpacity > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashOpacity -= 0.05;
    }

    // UI
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px "Courier New"';

    if (gameState === 'START') {
        ctx.font = 'bold 60px "Courier New"';
        ctx.strokeText('JUICY FLAPPY', canvas.width / 2, canvas.height / 2 - 80);
        ctx.fillText('JUICY FLAPPY', canvas.width / 2, canvas.height / 2 - 80);
        
        ctx.font = 'bold 24px "Courier New"';
        ctx.strokeText('TAP TO FLAP', canvas.width / 2, canvas.height / 2 + 50);
        ctx.fillText('TAP TO FLAP', canvas.width / 2, canvas.height / 2 + 50);
    }

    if (gameState === 'PLAYING') {
        ctx.font = 'bold 70px "Courier New"';
        ctx.strokeText(score, canvas.width / 2, 100);
        ctx.fillText(score, canvas.width / 2, 100);
    }

    if (gameState === 'GAMEOVER') {
        ctx.font = 'bold 50px "Courier New"';
        ctx.strokeText('GAME OVER', canvas.width / 2, canvas.height / 2 - 60);
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 60);
        
        ctx.font = 'bold 30px "Courier New"';
        ctx.strokeText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2);
        ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2);
        
        ctx.strokeText(`BEST: ${highScore}`, canvas.width / 2, canvas.height / 2 + 45);
        ctx.fillText(`BEST: ${highScore}`, canvas.width / 2, canvas.height / 2 + 45);

        if (frames % 60 < 30) {
            ctx.font = 'bold 20px "Courier New"';
            ctx.fillText('TAP TO RESTART', canvas.width / 2, canvas.height / 2 + 120);
        }
    }

    requestAnimationFrame(loop);
}

try {
    loop();
} catch (e) {
    console.error("Flappy Error: ", e);
}