// --- DOM Element Selection ---
const wheel = document.getElementById('wheel');
const optionsInput = document.getElementById('options-input');
const winnerDisplay = document.getElementById('winner-display');
const wheelClickableArea = document.getElementById('wheel-clickable-area');
const ctx = wheel.getContext('2d');

// --- State Variables ---
let options = [];
let currentAngle = 0;
let isSpinning = false;

// --- Sound-related variables ---
let tickSynth = null;
let animationFrameId = null;
let lastTickSegment = -1;

// --- Configuration ---
const colors = ["#386641", "#A7C957", "#6A994E"];
const spinDuration = 8000; // Corresponds to the 8s transition in CSS

// --- Functions ---

const setupCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    if (!wheel.parentElement) return;
    const rect = wheel.parentElement.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    wheel.width = size * dpr;
    wheel.height = size * dpr;
    wheel.style.width = `${size}px`;
    wheel.style.height = `${size}px`;
    ctx.scale(dpr, dpr);
    drawWheel();
}

const drawWheel = () => {
    options = optionsInput.value.split('\n').filter(opt => opt.trim() !== '');
    const numOptions = options.length;
    const canvasSize = wheel.width / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    if (numOptions === 0) return;

    const arcSize = (2 * Math.PI) / numOptions;
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const radius = Math.max(1, canvasSize / 2 - 10);
    const fontSize = Math.max(8, Math.min(18, radius / (numOptions / 4 + 5)));
    ctx.font = `bold ${fontSize}px Poppins, sans-serif`;

    options.forEach((option, i) => {
        const angle = i * arcSize;
        const color = colors[i % colors.length];

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, angle, angle + arcSize);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = color;
        ctx.fill();
        
        ctx.save();
        if (color === "#386641") {
            ctx.fillStyle = "#fff";
        } else {
            ctx.fillStyle = "#000";
        }
        
        ctx.translate(centerX, centerY);
        ctx.rotate(angle + arcSize / 2);
        ctx.textAlign = "right";
        ctx.fillText(option, radius - 15, 5);
        ctx.restore();
    });
};

const tickLoop = () => {
    if (!isSpinning) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        return;
    }

    const transformStyle = window.getComputedStyle(wheel).transform;
    if (transformStyle === 'none') {
        animationFrameId = requestAnimationFrame(tickLoop);
        return;
    }

    const matrixMatch = transformStyle.match(/matrix\((.+)\)/);
    if (!matrixMatch || !matrixMatch[1]) {
        animationFrameId = requestAnimationFrame(tickLoop);
        return;
    }
    const matrixValues = matrixMatch[1].split(', ');
    const a = parseFloat(matrixValues[0]);
    const b = parseFloat(matrixValues[1]);
    const currentRotation = Math.atan2(b, a) * (180 / Math.PI);

    const numOptions = options.length;
    if (numOptions > 0) {
        const arcSizeDegrees = 360 / numOptions;
        const pointerAngle = 270;
        const effectiveRotation = (currentRotation - pointerAngle + 360) % 360;
        const currentSegment = Math.floor(effectiveRotation / arcSizeDegrees);

        if (currentSegment !== lastTickSegment) {
            tickSynth.triggerAttackRelease("8n");
            lastTickSegment = currentSegment;
        }
    }
    
    animationFrameId = requestAnimationFrame(tickLoop);
};

const spin = async () => {
    if (isSpinning || options.length === 0) return;

    if (Tone.context.state !== 'running') await Tone.start();
    if (!tickSynth) {
        tickSynth = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 }
        }).toDestination();
        tickSynth.volume.value = -20;
    }
    
    winnerDisplay.classList.remove('show');
    isSpinning = true;
    
    const randomSpin = Math.random() * 360 + 8 * 360; 
    const newAngle = currentAngle + randomSpin;

    wheel.style.transform = `rotate(${newAngle}deg)`;
    currentAngle = newAngle;

    lastTickSegment = -1;
    animationFrameId = requestAnimationFrame(tickLoop);

    setTimeout(() => {
        isSpinning = false;
    }, spinDuration);
};

const getWinner = () => {
    const finalAngle = currentAngle % 360;
    const numOptions = options.length;
    if (numOptions === 0) return;

    const arcSizeDegrees = 360 / numOptions;
    const winningAngle = (270 - finalAngle + 360) % 360;
    const winningIndex = Math.floor(winningAngle / arcSizeDegrees);
    
    if (options[winningIndex]) {
        const winner = options[winningIndex];
        winnerDisplay.textContent = `${winner}!`;
        winnerDisplay.classList.add('show');

        setTimeout(() => {
            options.splice(winningIndex, 1);
            optionsInput.value = options.join('\n');
            drawWheel();
        }, 2000);
    }
};

// --- Event Listeners ---
wheelClickableArea.addEventListener('click', spin);
optionsInput.addEventListener('input', drawWheel);
wheel.addEventListener('transitionend', getWinner);
window.addEventListener('resize', setupCanvas);

// --- Initial Call ---
setupCanvas();
