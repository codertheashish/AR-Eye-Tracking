/** 
 * GLOBALS & CONFIG
 */
const videoElement = document.querySelector('.input_video');
const bgCanvas     = document.getElementById('bgCanvas');
const mainCanvas   = document.getElementById('mainCanvas');
const bgCtx        = bgCanvas.getContext('2d');
const ctx          = mainCanvas.getContext('2d');

let width  = window.innerWidth;
let height = window.innerHeight;

let time             = 0;
let lastTime         = performance.now();
let framesThisSecond = 0;
let lastFpsTime      = performance.now();

// Face / Eye tracking state
let currentFace  = null;
let faceVelocity = 0;   // drives matrix-rain background speed
let prevNose     = null;
const loadingMsg = document.getElementById('loadingMsg');

// Eye landmark indices (MediaPipe Face Mesh – refineLandmarks: true)
const LEFT_IRIS        = 468;
const RIGHT_IRIS       = 473;
const LEFT_EYE_TOP     = 159,  LEFT_EYE_BOTTOM  = 145;
const RIGHT_EYE_TOP    = 386,  RIGHT_EYE_BOTTOM  = 374;
const LEFT_EYE_OUTER   = 33,   LEFT_EYE_INNER   = 133;
const RIGHT_EYE_OUTER  = 263,  RIGHT_EYE_INNER  = 362;

// Head-pose landmarks
const NOSE_TIP   = 1;
const FOREHEAD   = 10;
const CHIN       = 152;
const FACE_LEFT  = 234;
const FACE_RIGHT = 454;

// Theme Config
let currentTheme = 'Rainbow';
const themes = {
    Rainbow:  (t, i, n) => `hsl(${(t * 100 + i * (360 / n)) % 360}, 100%, 60%)`,
    Cyberpunk:(t, i)    => (i % 2 === 0) ? '#ff003c' : '#00f0ff',
    Lava:     (t, i)    => `hsl(${(10 + i * 10) % 40}, 100%, ${50 + Math.sin(t) * 10}%)`,
    Ocean:    (t, i)    => `hsl(${180 + i * 20}, 100%, 60%)`,
    Galaxy:   (t, i)    => `hsl(${260 + Math.sin(t * 2 + i) * 40}, 100%, 65%)`
};

// Physics
let particles = [];

// Matrix Background
let matrixColumns = [];
const fontSize  = 16;
let maxColumns  = 0;

// Audio
let audioCtx = null;
let humOsc   = null;
let humGain  = null;

// UI Elements
const uiFace = document.getElementById('ui-face');
const uiFps  = document.getElementById('ui-fps');


/* ═══════════════════════════════════════
   INITIALIZATION
═══════════════════════════════════════ */
function resize() {
    width  = window.innerWidth;
    height = window.innerHeight;

    bgCanvas.width    = width;
    bgCanvas.height   = height;
    mainCanvas.width  = width;
    mainCanvas.height = height;

    maxColumns    = Math.floor(width / fontSize);
    matrixColumns = new Array(maxColumns).fill(1).map(() => Math.random() * height / fontSize);
}
window.addEventListener('resize', resize);
resize();

// Theme switcher
document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', e => {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTheme = e.target.getAttribute('data-theme');
        document.documentElement.style.setProperty('--accent', themes[currentTheme](0, 1, 1));
    });
});

// Start button
document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('startBtn').disabled = true;
    loadingMsg.innerText = 'Starting camera...';
    initAudio();
    initMediaPipe();
});


/* ═══════════════════════════════════════
   AUDIO ENGINE
═══════════════════════════════════════ */
function initAudio() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        humOsc  = audioCtx.createOscillator();
        humGain = audioCtx.createGain();

        humOsc.type          = 'sine';
        humOsc.frequency.value = 100;
        humGain.gain.value   = 0;

        humOsc.connect(humGain);
        humGain.connect(audioCtx.destination);
        humOsc.start();
    } catch (e) {
        console.error('Web Audio API failed', e);
    }
}

function updateHum(faceDetected, intensity) {
    if (!audioCtx || !humGain) return;
    if (!faceDetected) {
        humGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        return;
    }
    humOsc.frequency.setTargetAtTime(100 + intensity * 250, audioCtx.currentTime, 0.1);
    humGain.gain.setTargetAtTime(0.05 + intensity * 0.15,   audioCtx.currentTime, 0.1);
}


/* ═══════════════════════════════════════
   MATH HELPERS
═══════════════════════════════════════ */
function getDist(p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function mapToCanvas(point) {
    return { x: point.x * width, y: point.y * height };
}


/* ═══════════════════════════════════════
   EFFECTS & PHYSICS
═══════════════════════════════════════ */
function createParticles(pos, color, count = 3) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x:     pos.x,
            y:     pos.y,
            vx:    (Math.random() - 0.5) * 8,
            vy:    (Math.random() - 0.5) * 8,
            life:  1.0,
            color: color,
            size:  Math.random() * 3 + 1
        });
    }
}

function drawBackground() {
    bgCtx.globalCompositeOperation = 'destination-out';
    bgCtx.fillStyle = `rgba(0,0,0,${0.15 + Math.min(faceVelocity * 10, 0.5)})`;
    bgCtx.fillRect(0, 0, width, height);
    bgCtx.globalCompositeOperation = 'source-over';

    bgCtx.fillStyle = themes[currentTheme](time, 1, 1);
    bgCtx.font      = fontSize + 'px monospace';

    const speedMult = 1 + faceVelocity * 100;

    for (let i = 0; i < matrixColumns.length; i++) {
        if (Math.random() > 0.95) {
            const char = String.fromCharCode(0x30A0 + Math.random() * 96);
            bgCtx.fillText(char, i * fontSize, matrixColumns[i] * fontSize);
        }
        matrixColumns[i] += Math.random() * speedMult;
        if (matrixColumns[i] * fontSize > height && Math.random() > 0.9) {
            matrixColumns[i] = 0;
        }
    }
}

function updatePhysics() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.1;
        p.life -= 0.02;

        if (p.life <= 0) {
            particles.splice(i, 1);
        } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle  = p.color;
            ctx.globalAlpha = p.life;
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1.0;
}


/* ═══════════════════════════════════════
   EYE LASER / GLOW EFFECT
═══════════════════════════════════════ */
function getEyeOpenness(face, topIdx, bottomIdx, outerIdx, innerIdx) {
    const vertical   = getDist(face[topIdx],   face[bottomIdx]);
    const horizontal = getDist(face[outerIdx], face[innerIdx]) || 0.0001;
    return vertical / horizontal;
}

// Estimate 2D "facing direction" from head landmarks (yaw + pitch)
function getHeadFacingDir(face) {
    const nose     = mapToCanvas(face[NOSE_TIP]);
    const forehead = mapToCanvas(face[FOREHEAD]);
    const chin     = mapToCanvas(face[CHIN]);
    const faceL    = mapToCanvas(face[FACE_LEFT]);
    const faceR    = mapToCanvas(face[FACE_RIGHT]);

    const cx = (faceL.x + faceR.x) / 2;
    const cy = (forehead.y + chin.y) / 2;

    const faceWidth  = Math.hypot(faceR.x - faceL.x,      faceR.y - faceL.y)      || 1;
    const faceHeight = Math.hypot(chin.x  - forehead.x,   chin.y  - forehead.y)   || 1;

    return {
        x: ((nose.x - cx) / faceWidth)  * 2.6,
        y: ((nose.y - cy) / faceHeight) * 2.6
    };
}

function drawEyeLaser(eyeCenterPoint, headFacingDir, color, openness) {
    const origin    = mapToCanvas(eyeCenterPoint);
    const intensity = Math.max(0, Math.min(1, (openness - 0.12) / 0.22));
    if (intensity <= 0.02) return;

    // Both eyes use the same direction → perfectly parallel beams
    let dx  = headFacingDir.x;
    let dy  = headFacingDir.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    const beamLength = 320 * intensity;
    const tip = {
        x: origin.x + dx * beamLength,
        y: origin.y + dy * beamLength
    };

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const grad = ctx.createLinearGradient(origin.x, origin.y, tip.x, tip.y);
    grad.addColorStop(0,    '#ffffff');
    grad.addColorStop(0.25, color);
    grad.addColorStop(1,    'rgba(255,255,255,0)');

    // Wide outer bloom
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 22 * intensity;
    ctx.shadowBlur  = 50;
    ctx.shadowColor = color;
    ctx.globalAlpha = 0.55 * intensity;
    ctx.stroke();

    // Mid glow
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 10 * intensity;
    ctx.shadowBlur  = 35;
    ctx.shadowColor = color;
    ctx.globalAlpha = 0.8 * intensity;
    ctx.stroke();

    // White-hot core
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 3.5 * intensity;
    ctx.shadowBlur  = 20;
    ctx.shadowColor = '#ffffff';
    ctx.globalAlpha = intensity;
    ctx.stroke();

    // Iris glow dot
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 9 * intensity + 3, 0, Math.PI * 2);
    ctx.fillStyle  = '#ffffff';
    ctx.shadowBlur = 40;
    ctx.shadowColor = color;
    ctx.globalAlpha = intensity;
    ctx.fill();

    // Colored halo ring
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 16 * intensity + 4, 0, Math.PI * 2);
    ctx.fillStyle   = color;
    ctx.shadowBlur  = 30;
    ctx.shadowColor = color;
    ctx.globalAlpha = 0.35 * intensity;
    ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1.0;

    if (Math.random() > 0.55) createParticles(tip, color, 2);
}

function drawFaceEyeEffects() {
    if (!currentFace) return;

    const hasIris = currentFace.length > RIGHT_IRIS;

    const leftCenter = hasIris ? currentFace[LEFT_IRIS] : {
        x: (currentFace[LEFT_EYE_OUTER].x + currentFace[LEFT_EYE_INNER].x) / 2,
        y: (currentFace[LEFT_EYE_OUTER].y + currentFace[LEFT_EYE_INNER].y) / 2
    };
    const rightCenter = hasIris ? currentFace[RIGHT_IRIS] : {
        x: (currentFace[RIGHT_EYE_OUTER].x + currentFace[RIGHT_EYE_INNER].x) / 2,
        y: (currentFace[RIGHT_EYE_OUTER].y + currentFace[RIGHT_EYE_INNER].y) / 2
    };

    const headDir  = getHeadFacingDir(currentFace);
    const leftOpen  = getEyeOpenness(currentFace, LEFT_EYE_TOP,  LEFT_EYE_BOTTOM,  LEFT_EYE_OUTER,  LEFT_EYE_INNER);
    const rightOpen = getEyeOpenness(currentFace, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM, RIGHT_EYE_OUTER, RIGHT_EYE_INNER);

    drawEyeLaser(leftCenter,  headDir, themes[currentTheme](time, 0, 2), leftOpen);
    drawEyeLaser(rightCenter, headDir, themes[currentTheme](time, 1, 2), rightOpen);
}


/* ═══════════════════════════════════════
   MAIN RENDER LOOP
═══════════════════════════════════════ */
function renderLoop(timestamp) {
    requestAnimationFrame(renderLoop);

    const dt = (timestamp - lastTime) / 1000;
    lastTime  = timestamp;
    time     += dt;

    framesThisSecond++;
    if (timestamp > lastFpsTime + 1000) {
        uiFps.innerText  = framesThisSecond;
        framesThisSecond = 0;
        lastFpsTime      = timestamp;
    }

    drawBackground();

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = 'screen';
    updatePhysics();

    if (currentFace) {
        uiFace.innerText = 'Yes';

        const nose = currentFace[NOSE_TIP];
        faceVelocity = prevNose ? getDist(prevNose, nose) : 0;
        prevNose = { x: nose.x, y: nose.y };

        drawFaceEyeEffects();
        updateHum(true, Math.min(faceVelocity * 20, 1));
    } else {
        uiFace.innerText = 'No';
        faceVelocity     = 0;
        prevNose         = null;
        updateHum(false, 0);
    }

    ctx.globalCompositeOperation = 'source-over';
}


/* ═══════════════════════════════════════
   MEDIAPIPE INITIALIZATION (Face Mesh only)
═══════════════════════════════════════ */
function initMediaPipe() {
    let cameraStarted = false;

    function tryStartCamera() {
        if (cameraStarted) return;
        cameraStarted = true;

        const camera = new Camera(videoElement, {
            onFrame: async () => { await faceMesh.send({ image: videoElement }); },
            width: 1280,
            height: 720,
            facingMode: 'user'
        });

        camera.start()
            .then(() => {
                document.getElementById('startOverlay').classList.add('hidden');
                document.getElementById('hud').classList.remove('hidden');
                document.getElementById('themes').classList.remove('hidden');
                requestAnimationFrame(renderLoop);
            })
            .catch(err => {
                console.error('Camera start failed', err);
                loadingMsg.innerText = 'Camera access denied. Please allow permissions and reload.';
                document.getElementById('startBtn').disabled = false;
                cameraStarted = false;
            });
    }

    const faceMesh = new FaceMesh({
        locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`
    });

    faceMesh.setOptions({
        maxNumFaces:            1,
        refineLandmarks:        true,   // needed for iris points 468 & 473
        minDetectionConfidence: 0.6,
        minTrackingConfidence:  0.6
    });

    faceMesh.onResults(results => {
        currentFace = (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0)
            ? results.multiFaceLandmarks[0]
            : null;
    });

    faceMesh.initialize()
        .then(() => tryStartCamera())
        .catch(e => {
            console.error('MediaPipe init failed', e);
            loadingMsg.innerText = 'Failed to load face tracking. Check internet and reload.';
            document.getElementById('startBtn').disabled = false;
        });
}