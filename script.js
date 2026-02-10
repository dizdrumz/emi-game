const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let particles = [];
let leaves = [];
let audioCtx;
let treeBranches = []; // Procedural tree data
let treeTrunkX, treeTrunkBaseY, treeCanopyW, treeCanopyH, treeCanopyTop;
let treeCanvas; // Offscreen cached tree render
let bgCanvas; // Offscreen cached background render
let bgNeedsRedraw = true; // Flag to rebuild background cache
let emiSequence = []; // Track E-M-I sequence
let emiCelebration = null; // Active celebration state
let emiBigLetters = []; // Big letter display for E/M/I
const spawnableSprites = []; // Filtered sprite list (no koelreuteria)
let walkingSpaniel = null; // The walking spaniel on the grass
let mamaSequence = []; // Track M-A-M-A sequence
let mamaCelebration = null; // Active MAMA celebration state
let mamaBigLetters = []; // Big letter display for M/A
let walkingDoctor = null; // The walking doctor on the grass
let doctorTimer = 0; // Timer for doctor disappearance
let roombaSequence = []; // Track R-O-O-M-B-A sequence
let activeRoomba = null; // The Roomba cleaner
let dogEaten = false; // Whether the dog was eaten
let dogRespawnTimer = 0; // Timer to respawn dog after roomba leaves
let roombaCelebration = null; // Active ROOMBA celebration state

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    generateTree();
    leaves = [];
    bgInitialized = false;
    bgNeedsRedraw = true;
}

window.addEventListener('resize', resizeCanvas);

// --- Audio System ---
let bgMusicPlaying = false;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Start background music on first interaction
    if (!bgMusicPlaying) {
        bgMusicPlaying = true;
        startBackgroundMusic();
    }
}

// --- 16-bit Chiptune Background Music ---
function startBackgroundMusic() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Master volume for BG music (keep low so it doesn't overpower SFX)
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.06;
    masterGain.connect(audioCtx.destination);

    // Note frequencies (C major / happy key)
    const NOTE = {
        C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
        C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
        C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
        REST: 0
    };

    // Melody line — cheerful, playful (16 beats per loop, ~8 seconds)
    const melody = [
        NOTE.E4, NOTE.G4, NOTE.A4, NOTE.G4,
        NOTE.E4, NOTE.C4, NOTE.D4, NOTE.E4,
        NOTE.G4, NOTE.A4, NOTE.B4, NOTE.A4,
        NOTE.G4, NOTE.E4, NOTE.D4, NOTE.C4,

        NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5,
        NOTE.B4, NOTE.A4, NOTE.G4, NOTE.E4,
        NOTE.F4, NOTE.A4, NOTE.G4, NOTE.E4,
        NOTE.D4, NOTE.E4, NOTE.C4, NOTE.REST,
    ];

    // Harmony — softer, higher accompany
    const harmony = [
        NOTE.C5, NOTE.REST, NOTE.E5, NOTE.REST,
        NOTE.C5, NOTE.REST, NOTE.G4, NOTE.REST,
        NOTE.E5, NOTE.REST, NOTE.D5, NOTE.REST,
        NOTE.C5, NOTE.REST, NOTE.G4, NOTE.REST,

        NOTE.E5, NOTE.REST, NOTE.G5, NOTE.REST,
        NOTE.D5, NOTE.REST, NOTE.C5, NOTE.REST,
        NOTE.A4, NOTE.REST, NOTE.C5, NOTE.REST,
        NOTE.G4, NOTE.REST, NOTE.E4, NOTE.REST,
    ];

    // Bass line — grounding
    const bass = [
        NOTE.C3, NOTE.C3, NOTE.C3, NOTE.C3,
        NOTE.A3, NOTE.A3, NOTE.A3, NOTE.A3,
        NOTE.F3, NOTE.F3, NOTE.F3, NOTE.F3,
        NOTE.G3, NOTE.G3, NOTE.G3, NOTE.G3,

        NOTE.C3, NOTE.C3, NOTE.E3, NOTE.E3,
        NOTE.F3, NOTE.F3, NOTE.G3, NOTE.G3,
        NOTE.F3, NOTE.F3, NOTE.E3, NOTE.E3,
        NOTE.G3, NOTE.G3, NOTE.C3, NOTE.C3,
    ];

    const bpm = 140;
    const beatDuration = 60 / bpm; // ~0.43s per beat
    const loopDuration = melody.length * beatDuration;

    function scheduleLoop(startTime) {
        // Melody — square wave (classic chiptune lead)
        melody.forEach((freq, i) => {
            if (freq === 0) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(masterGain);
            osc.type = 'square';
            osc.frequency.value = freq;

            const t = startTime + i * beatDuration;
            const dur = beatDuration * 0.8;
            gain.gain.setValueAtTime(0.4, t);
            gain.gain.setValueAtTime(0.35, t + dur * 0.5);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.start(t);
            osc.stop(t + dur);
        });

        // Harmony — triangle wave (softer)
        harmony.forEach((freq, i) => {
            if (freq === 0) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(masterGain);
            osc.type = 'triangle';
            osc.frequency.value = freq;

            const t = startTime + i * beatDuration;
            const dur = beatDuration * 0.6;
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.start(t);
            osc.stop(t + dur);
        });

        // Bass — triangle wave (deep)
        bass.forEach((freq, i) => {
            if (freq === 0) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(masterGain);
            osc.type = 'triangle';
            osc.frequency.value = freq;

            const t = startTime + i * beatDuration;
            const dur = beatDuration * 0.9;
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.start(t);
            osc.stop(t + dur);
        });

        // Schedule next loop ~1 beat before this one ends (seamless)
        const nextLoopTime = startTime + loopDuration;
        const scheduleAhead = Math.max(0, (nextLoopTime - audioCtx.currentTime - 1) * 1000);
        setTimeout(() => {
            if (bgMusicPlaying) {
                scheduleLoop(nextLoopTime);
            }
        }, scheduleAhead);
    }

    // Start the first loop
    scheduleLoop(audioCtx.currentTime + 0.1);
}

function playSound(type, letter) {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (letter === 'e' || letter === 'E') {
        // E = bright major chord feel (E4 = 329.63 Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(329.63, audioCtx.currentTime);
        osc.frequency.setValueAtTime(415.30, audioCtx.currentTime + 0.12);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    } else if (letter === 'm' || letter === 'M') {
        // M = warm mid tone (A4 = 440 Hz)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440.00, audioCtx.currentTime);
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    } else if (letter === 'i' || letter === 'I') {
        // I = high sparkle (E5 = 659.25 Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime);
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    } else if (type === 'animal') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(300, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } else {
        const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
        const freq = notes[Math.floor(Math.random() * notes.length)];
        osc.frequency.value = freq;
        osc.type = ['sine', 'triangle'][Math.floor(Math.random() * 2)];

        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }
}

function playCelebrationSound() {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    // Play a triumphant ascending arpeggio
    const notes = [329.63, 415.30, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = audioCtx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
    });
}

// --- Visual System ---

const palettes = [
    ['#FF0055', '#FF7700', '#FFDD00', '#00FF55', '#0077FF'], // Neon
    ['#FF99C8', '#FCF6BD', '#D0F4DE', '#A9DEF9', '#E4C1F9'], // Pastel
    ['#E63946', '#F1FAEE', '#A8DADC', '#457B9D', '#1D3557'], // Americana
    ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51']  // Earth
];

function getRandomColor() {
    const palette = palettes[Math.floor(Math.random() * palettes.length)];
    return palette[Math.floor(Math.random() * palette.length)];
}

// Sprites: 1=Main, 2=Secondary, 3=Detail, 4=Extra(Beak, etc), 5=Extra2
const sprites = {
    bear: [
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0], // Ears
        [0, 1, 2, 2, 1, 0, 0, 0, 0, 1, 2, 2, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 3, 1, 1, 1, 1, 1, 1, 3, 1, 1, 0, 0, 0], // Eyes
        [0, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 0, 0, 0], // Snout area
        [0, 1, 1, 1, 1, 2, 3, 3, 2, 1, 1, 1, 1, 0, 0, 0], // Nose
        [0, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 0, 0, 0, 0], // Body
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0], // Feet
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    elmo: [
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0], // Top head
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 1, 2, 2, 1, 1, 1, 1, 2, 2, 1, 0, 0, 0, 0], // Eyes (White) + Red fur
        [0, 0, 1, 2, 3, 1, 1, 1, 1, 2, 3, 1, 0, 0, 0, 0], // Pupils
        [0, 0, 1, 1, 1, 1, 4, 4, 1, 1, 1, 1, 0, 0, 0, 0], // Nose (Orange)
        [0, 0, 1, 1, 1, 4, 4, 4, 4, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 4, 4, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 0, 0, 0, 0], // Mouth
        [0, 0, 0, 1, 1, 3, 3, 3, 3, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    carrots: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0], // Greens
        [0, 0, 0, 2, 2, 0, 2, 2, 0, 2, 2, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0], // Orange carrots
        [0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0], // Stick out of pot
        [0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0], // Pot rim
        [0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0],
        [0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0], // Pot body
        [0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0],
        [0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0],
        [0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0], // Pot base
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    hotcakes: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0], // Butter
        [0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0], // Syrup
        [0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0], // Pancake 1
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0], // Drip
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0], // Pancake 2
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    eggs: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 1, 1, 2, 2, 1, 1, 1, 1, 2, 2, 1, 1, 0, 0, 0], // Yolks
        [0, 1, 1, 2, 2, 1, 1, 1, 2, 2, 2, 2, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    padelball: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 0, 0], // Logo/Line
        [0, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    racket: [
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0], // Head top
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 2, 1, 2, 1, 2, 1, 1, 0, 0, 0, 0], // Holes
        [0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 2, 1, 2, 1, 2, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 3, 3, 0, 0, 0, 0, 0, 0], // Throat
        [0, 0, 0, 0, 0, 0, 1, 3, 3, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0], // Handle
        [0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0] // Cap
    ],
    lola: [
        [0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0], // LOLZ (LOLA) Text
        [0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0], // Trying to cram LOLA on top
        [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0], // It's tight, abstracting...
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0], // Head
        [0, 0, 4, 0, 1, 1, 1, 1, 1, 1, 1, 0, 4, 0, 0, 0], // Horns/Ears
        [0, 0, 4, 0, 1, 3, 1, 1, 1, 3, 1, 0, 4, 0, 0, 0], // Eyes
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0], // Nose (White/Pink)
        [0, 0, 0, 0, 2, 3, 2, 2, 2, 3, 2, 0, 0, 0, 0, 0], // Nostrils
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0], // Body Spot
        [0, 0, 0, 1, 1, 3, 3, 1, 1, 1, 1, 1, 3, 3, 0, 0], // Spots
        [0, 0, 0, 1, 1, 3, 3, 1, 1, 1, 1, 1, 3, 3, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0], // Legs
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0]
    ],
    avocado: [
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // Stem
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0], // Light green inside
        [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 2, 2, 1, 0, 0, 0], // Pit (Brown)
        [0, 0, 0, 1, 1, 2, 2, 3, 3, 3, 2, 2, 1, 1, 0, 0],
        [0, 0, 0, 1, 2, 2, 2, 3, 3, 3, 2, 2, 2, 1, 0, 0],
        [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
        [0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    tortilla: [
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 0, 0, 0], // Spots (burned bits)
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    spaniel: [
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0], // Head white
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 0, 0, 0], // Ears (Liver/Black)
        [0, 0, 0, 2, 2, 1, 3, 1, 1, 3, 1, 2, 2, 0, 0, 0], // Eyes
        [0, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 0, 0, 0],
        [0, 0, 0, 2, 2, 1, 1, 3, 3, 1, 1, 2, 2, 0, 0, 0], // Nose
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 0, 0, 0], // Body spots
        [0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0], // Legs
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    ladder: [
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0], // Rung
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0], // Rung
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0], // Rung
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0], // Rung
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
    ],
    train: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0], // Cab top
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 1, 0, 0], // Window
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0], // Smoke stack
        [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0], // Boiler
        [0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0], // Cowcatcher tip
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0], // Base
        [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0], // Wheels
        [0, 1, 3, 3, 1, 0, 0, 0, 0, 1, 3, 3, 1, 0, 0, 0],
        [0, 1, 3, 3, 1, 0, 0, 0, 0, 1, 3, 3, 1, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    moon: [
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 2, 2, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 0],
        [1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 2, 2, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1],
        [0, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 0],
        [0, 1, 1, 2, 1, 1, 1, 2, 2, 1, 1, 1, 1, 2, 1, 0],
        [0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]
    ],
    koelreuteria: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 7, 7, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 7, 7, 3, 3, 5, 5, 3, 3, 7, 7, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 7, 3, 3, 2, 2, 3, 3, 3, 3, 2, 2, 3, 3, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 8, 8, 3, 2, 2, 3, 3, 5, 5, 5, 5, 3, 3, 2, 2, 3, 8, 8, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 8, 8, 3, 2, 3, 3, 5, 7, 7, 5, 5, 7, 7, 5, 3, 3, 2, 3, 8, 8, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 7, 7, 3, 2, 3, 3, 7, 7, 3, 3, 2, 2, 3, 3, 7, 7, 3, 3, 2, 3, 7, 7, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 7, 3, 3, 2, 3, 3, 5, 5, 3, 2, 2, 3, 3, 2, 2, 3, 5, 5, 3, 3, 2, 3, 3, 7, 0, 0, 0, 0, 0],
        [0, 0, 8, 8, 3, 2, 3, 3, 7, 7, 3, 2, 3, 3, 3, 3, 3, 3, 2, 3, 7, 7, 3, 3, 2, 3, 8, 8, 0, 0, 0, 0],
        [0, 5, 5, 3, 2, 3, 3, 5, 5, 3, 2, 3, 3, 8, 8, 8, 8, 3, 3, 2, 3, 5, 5, 3, 3, 2, 3, 5, 5, 0, 0, 0],
        [0, 7, 3, 2, 3, 3, 7, 7, 3, 2, 3, 3, 8, 8, 3, 3, 8, 8, 3, 3, 2, 3, 7, 7, 3, 3, 2, 3, 7, 0, 0, 0],
        [5, 3, 2, 3, 3, 5, 5, 3, 2, 3, 3, 8, 8, 3, 2, 2, 3, 8, 8, 3, 3, 2, 3, 5, 5, 3, 3, 2, 3, 5, 0, 0],
        [7, 3, 3, 3, 7, 7, 3, 2, 3, 3, 5, 5, 3, 2, 3, 3, 2, 3, 5, 5, 3, 3, 2, 3, 7, 7, 3, 3, 3, 7, 0, 0],
        [8, 3, 2, 3, 3, 3, 2, 3, 3, 7, 7, 3, 2, 3, 3, 3, 3, 2, 3, 7, 7, 3, 3, 2, 3, 3, 3, 2, 3, 8, 0, 0],
        [7, 3, 3, 2, 2, 3, 3, 5, 7, 7, 3, 2, 3, 3, 2, 2, 3, 3, 2, 3, 7, 7, 5, 3, 3, 2, 2, 3, 3, 7, 0, 0],
        [5, 3, 2, 3, 3, 3, 7, 7, 5, 3, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 3, 5, 7, 7, 3, 3, 3, 2, 3, 5, 0, 0],
        [8, 3, 3, 2, 3, 8, 8, 3, 3, 2, 3, 3, 5, 3, 3, 3, 3, 5, 3, 3, 2, 3, 3, 8, 8, 3, 2, 3, 3, 8, 0, 0],
        [0, 7, 3, 3, 8, 8, 3, 2, 3, 3, 5, 7, 7, 3, 2, 2, 3, 7, 7, 5, 3, 3, 2, 3, 8, 8, 3, 3, 7, 0, 0, 0],
        [0, 5, 3, 3, 3, 7, 7, 3, 3, 5, 7, 7, 3, 2, 3, 3, 2, 3, 7, 7, 5, 3, 3, 7, 7, 3, 3, 3, 5, 0, 0, 0],
        [0, 0, 8, 3, 3, 3, 5, 5, 7, 7, 3, 3, 2, 3, 3, 3, 3, 2, 3, 3, 7, 7, 5, 5, 3, 3, 3, 8, 0, 0, 0, 0],
        [0, 0, 0, 7, 3, 3, 3, 7, 7, 3, 2, 3, 3, 3, 1, 1, 3, 3, 3, 2, 3, 7, 7, 3, 3, 3, 7, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 5, 5, 3, 3, 3, 2, 3, 3, 3, 3, 1, 1, 3, 3, 3, 3, 2, 3, 3, 3, 5, 5, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 7, 7, 3, 3, 3, 8, 3, 1, 1, 1, 1, 3, 8, 3, 3, 3, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 6, 6, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 1, 1, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 6, 1, 1, 6, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 6, 0, 1, 1, 0, 6, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    cat: [
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], // Ears
        [0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0], // Head
        [0, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 0, 0, 0, 0], // Eyes
        [0, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 0, 0, 0, 0], // Nose
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0], // Body
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0], // Legs
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0], // Tail
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0]
    ],
    santa: [
        [0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0], // Hat tip
        [0, 0, 0, 0, 0, 2, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 2, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0],
        [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0], // Hat brim (white)
        [0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0], // Face
        [0, 0, 0, 3, 4, 3, 3, 3, 3, 4, 3, 3, 0, 0, 0, 0], // Eyes
        [0, 0, 0, 3, 3, 3, 3, 1, 3, 3, 3, 3, 0, 0, 0, 0], // Nose (red)
        [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0], // Beard
        [0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0], // Body (red)
        [0, 0, 0, 0, 1, 1, 5, 5, 5, 1, 1, 0, 0, 0, 0, 0], // Belt
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 4, 4, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0], // Boots
        [0, 0, 0, 0, 4, 4, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    apple: [
        [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Stem
        [0, 0, 0, 0, 0, 2, 2, 3, 3, 0, 0, 0, 0, 0, 0, 0], // Leaf
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    banana: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0], // Stem
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Tip
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ]
};

// Map sprite names to their color definitions
const spriteColors = {
    bear: { 1: '#FF99CC', 2: '#FFCCDD', 3: '#000000' }, // Pink, Light Pink, Black
    elmo: { 1: '#FF0000', 2: '#FFFFFF', 3: '#000000', 4: '#FF9900' }, // Red, White, Black, Orange
    carrots: { 1: '#FF7700', 2: '#00AA00', 3: '#884400' }, // Orange, Green, Brown
    hotcakes: { 1: '#EECC88', 2: '#AA5500', 4: '#FFFFAA' }, // Pancake, Syrup, Butter
    eggs: { 1: '#FFFFFF', 2: '#FFCC00' }, // White, Yolk
    padelball: { 1: '#CCFF00', 2: '#000000' }, // Neon Yellow/Green, Black logo
    racket: { 1: '#0066CC', 2: '#FFFFFF', 3: '#FF5500', 4: '#4488FF' }, // Blue frame, White holes, Orange throat, Light blue grip
    lola: { 1: '#000000', 2: '#FFCCDD', 3: '#FFFFFF', 4: '#FF9999' }, // Black, Pink Nose, White spots
    avocado: { 1: '#006600', 2: '#CCFF66', 3: '#663300' }, // Dark Green, Light Green, Brown Pit
    tortilla: { 1: '#F4E0A0', 2: '#C4A060' }, // Maize, Toasted spots
    spaniel: { 1: '#FFFFFF', 2: '#663300', 3: '#000000' }, // White, Liver/Brown, Black Features
    ladder: { 1: '#8B4513' }, // SaddleBrown
    train: { 1: '#CC0000', 2: '#88CCFF', 3: '#000000' }, // Red engine, Blue window, Black wheels
    moon: { 1: '#F4F6F0', 2: '#E0E0E0' }, // Off-white, Grey crater
    koelreuteria: { 1: '#5C3317', 2: '#1B5E20', 3: '#2E7D32', 5: '#FFD700', 6: '#3E2723', 7: '#E8830C', 8: '#D4566A' }, // Trunk, dark/mid green, gold flowers, bark, orange clusters, salmon/pink pods
    cat: { 1: '#FF8800', 2: '#33CC33', 3: '#FF6699', 4: '#FF8800' }, // Orange tabby, Green eyes, Pink nose, Orange tail
    santa: { 1: '#CC0000', 2: '#FFFFFF', 3: '#FFCC99', 4: '#000000', 5: '#FFD700' }, // Red suit, White beard/trim, Skin, Black boots/eyes, Gold belt
    apple: { 1: '#CC0000', 2: '#663300', 3: '#00AA00' }, // Red body, Brown stem, Green leaf
    banana: { 1: '#FFD700', 2: '#8B6914' } // Yellow, Brown tips
};

class Particle {
    constructor(x, y, char, type) {
        this.x = x;
        this.y = y;
        this.char = char;
        this.type = type || 'circle';
        this.size = char ? Math.random() * 50 + 50 : Math.random() * 15 + 5;
        this.speedX = (Math.random() - 0.5) * 10;
        this.speedY = (Math.random() - 0.5) * 10;
        this.color = getRandomColor();
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
        this.gravity = 0.2;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 10;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedY += this.gravity;
        this.life -= this.decay;
        this.rotation += this.rotationSpeed;

        if (!this.char) {
            this.size *= 0.95;
        } else {
            this.size *= 0.99;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;

        if (this.char) {
            ctx.font = `bold ${this.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.char, 0, 0);
        } else {
            this.drawShape();
        }

        ctx.restore();
    }

    drawShape() {
        ctx.beginPath();
        if (this.type === 'circle') {
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        } else if (this.type === 'square') {
            ctx.rect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else if (this.type === 'triangle') {
            ctx.moveTo(0, -this.size);
            ctx.lineTo(this.size, this.size);
            ctx.lineTo(-this.size, this.size);
            ctx.closePath();
        } else if (this.type === 'star') {
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.size,
                    -Math.sin((18 + i * 72) * Math.PI / 180) * this.size);
                ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (this.size / 2),
                    -Math.sin((54 + i * 72) * Math.PI / 180) * (this.size / 2));
            }
            ctx.closePath();
        }
        ctx.fill();
    }
}

// Cache for pre-rendered sprite canvases
const spriteCanvasCache = {};

function getSpriteCanvas(spriteName, pixelSize, colors, grid) {
    const key = spriteName + '_' + Math.round(pixelSize);
    if (spriteCanvasCache[key]) return spriteCanvasCache[key];

    const rows = grid.length;
    const cols = grid[0].length;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = cols * pixelSize;
    offCanvas.height = rows * pixelSize;
    const offCtx = offCanvas.getContext('2d');

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const val = grid[r][c];
            if (val !== 0) {
                offCtx.fillStyle = colors[val] || '#FFFFFF';
                offCtx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
            }
        }
    }
    // Limit cache size
    const keys = Object.keys(spriteCanvasCache);
    if (keys.length > 50) delete spriteCanvasCache[keys[0]];
    spriteCanvasCache[key] = offCanvas;
    return offCanvas;
}

class PixelSprite {
    constructor(x, y, spriteName) {
        this.x = x;
        this.y = y;
        this.name = spriteName;
        this.grid = sprites[spriteName];
        this.colors = spriteColors[spriteName];

        // Made them MUCH larger (scale down on small/mobile screens)
        const isSmallScreen = Math.min(canvas.width, canvas.height) < 500;
        this.pixelSize = isSmallScreen
            ? Math.round(Math.random() * 6 + 10)
            : Math.round(Math.random() * 10 + 15);
        this.speedX = (Math.random() - 0.5) * 8;
        this.speedY = -Math.random() * 10 - 5;
        this.gravity = 0.5;
        this.life = 1.0;
        // Lasts ~3 seconds
        this.decay = 0.006;
        // Pre-render the sprite
        this._cachedCanvas = getSpriteCanvas(spriteName, this.pixelSize, this.colors, this.grid);
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedY += this.gravity;
        this.life -= this.decay;

        if (this.y > canvas.height) {
            this.y = canvas.height;
            this.speedY *= -0.6;
        }
        if (this.x < 0 || this.x > canvas.width) {
            this.speedX *= -1;
        }
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.drawImage(
            this._cachedCanvas,
            this.x - this._cachedCanvas.width / 2,
            this.y - this._cachedCanvas.height / 2
        );
        ctx.restore();
    }
}

class Leaf {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4 + 3;
        this.speedX = (Math.random() - 0.5) * 1.5;
        this.speedY = Math.random() * 1.2 + 0.3;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 6;
        // Koelreuteria golden rain petals
        const petalColors = ['#FFD700', '#FFC107', '#FFAB00', '#FFE082', '#F9A825'];
        this.color = petalColors[Math.floor(Math.random() * petalColors.length)];
        this.life = 1.0;
        this.sway = Math.random() * 0.15;
    }

    update() {
        this.x += this.speedX + Math.sin(this.y * 0.04) * this.sway;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;

        if (this.y > canvas.height - 50) {
            this.life -= 0.008;
            this.speedY *= 0.95;
            this.speedX *= 0.95;
            this.rotationSpeed *= 0.95;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        // Draw a small petal shape
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function handleInput(e) {
    if (e.repeat) return;
    if (!audioCtx) initAudio();

    const char = e.key;
    const upperChar = char.toUpperCase();

    // Spawn from tree canopy area
    const x = treeTrunkX + (Math.random() - 0.5) * treeCanopyW * 0.85;
    const y = treeCanopyTop + Math.random() * treeCanopyH * 0.6;

    // EMI sequence tracking
    if (upperChar === 'E' || upperChar === 'M' || upperChar === 'I') {
        // Add big letter display
        emiBigLetters.push({
            char: upperChar,
            x: canvas.width / 2 + (Math.random() - 0.5) * 200,
            y: canvas.height * 0.3,
            life: 1.0,
            decay: 0.008,
            speedY: -1,
            scale: 150 + Math.random() * 50,
            color: upperChar === 'E' ? '#FF4444' : (upperChar === 'M' ? '#44FF44' : '#4444FF')
        });

        playSound('standard', char);

        // Track sequence
        const expected = ['E', 'M', 'I'];
        if (upperChar === expected[emiSequence.length]) {
            emiSequence.push(upperChar);
            if (emiSequence.length === 3) {
                // EMI complete! Trigger celebration
                triggerEMICelebration();
                emiSequence = [];
            }
        } else if (upperChar === 'E') {
            emiSequence = ['E'];
        } else {
            emiSequence = [];
        }
    } else {
        // Reset sequence on other keys
        if (emiSequence.length > 0 && upperChar !== 'E' && upperChar !== 'M' && upperChar !== 'I') {
            emiSequence = [];
        }
    }

    // MAMA sequence tracking
    if (upperChar === 'M' || upperChar === 'A') {
        // Add big letter display for MAMA
        if (upperChar === 'A') {
            mamaBigLetters.push({
                char: upperChar,
                x: canvas.width / 2 + (Math.random() - 0.5) * 200,
                y: canvas.height * 0.3,
                life: 1.0,
                decay: 0.008,
                speedY: -1,
                scale: 150 + Math.random() * 50,
                color: '#FF69B4'
            });
        }

        // Track M-A-M-A sequence
        const mamaExpected = ['M', 'A', 'M', 'A'];
        if (upperChar === mamaExpected[mamaSequence.length]) {
            mamaSequence.push(upperChar);
            if (mamaSequence.length === 4) {
                // MAMA complete! Trigger celebration
                triggerMAMACelebration();
                mamaSequence = [];
            }
        } else if (upperChar === 'M') {
            mamaSequence = ['M'];
        } else {
            mamaSequence = [];
        }
    } else {
        // Reset MAMA sequence on other keys
        if (mamaSequence.length > 0 && upperChar !== 'M' && upperChar !== 'A') {
            mamaSequence = [];
        }
    }

    // ROOMBA sequence tracking (R-O-O-M-B-A)
    const roombaExpected = ['R', 'O', 'O', 'M', 'B', 'A'];
    const roombaLetters = ['R', 'O', 'M', 'B', 'A'];
    if (roombaLetters.includes(upperChar)) {
        if (upperChar === roombaExpected[roombaSequence.length]) {
            roombaSequence.push(upperChar);
            if (roombaSequence.length === 6) {
                // ROOMBA complete! Spawn the Roomba
                triggerRoomba();
                roombaSequence = [];
            }
        } else if (upperChar === 'R') {
            roombaSequence = ['R'];
        } else {
            roombaSequence = [];
        }
    } else {
        if (roombaSequence.length > 0 && !roombaLetters.includes(upperChar)) {
            roombaSequence = [];
        }
    }

    if (Math.random() < 0.25) {
        if (spawnableSprites.length > 0) {
            const type = spawnableSprites[Math.floor(Math.random() * spawnableSprites.length)];
            particles.push(new PixelSprite(x, y, type));
            playSound('animal');
        }
    } else {
        particles.push(new Particle(x, y, char, null));

        const shapeTypes = ['circle', 'square', 'triangle', 'star'];
        const randomType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(x, y, null, randomType));
        }
        playSound('standard');
    }
}

window.addEventListener('keydown', handleInput);
window.addEventListener('mousedown', (e) => {
    if (!audioCtx) initAudio();

    // Spawn from tree canopy area
    const x = treeTrunkX + (Math.random() - 0.5) * treeCanopyW * 0.85;
    const y = treeCanopyTop + Math.random() * treeCanopyH * 0.6;

    if (Math.random() < 0.35) {
        if (spawnableSprites.length > 0) {
            const type = spawnableSprites[Math.floor(Math.random() * spawnableSprites.length)];
            particles.push(new PixelSprite(x, y, type));
            playSound('animal');
        }
    } else {
        const keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const randomKey = keys.charAt(Math.floor(Math.random() * keys.length));

        particles.push(new Particle(x, y, randomKey, null));

        const shapeTypes = ['circle', 'square', 'triangle', 'star'];
        const randomType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(x, y, null, randomType));
        }
        playSound('standard');
    }
});

// --- Touch Events for Mobile ---
function spawnFromTouch(touchX, touchY) {
    // Spawn from tree canopy area (same logic as mouse/keyboard)
    const x = treeTrunkX + (Math.random() - 0.5) * treeCanopyW * 0.85;
    const y = treeCanopyTop + Math.random() * treeCanopyH * 0.6;

    if (Math.random() < 0.35) {
        if (spawnableSprites.length > 0) {
            const type = spawnableSprites[Math.floor(Math.random() * spawnableSprites.length)];
            particles.push(new PixelSprite(x, y, type));
            playSound('animal');
        }
    } else {
        const keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const randomKey = keys.charAt(Math.floor(Math.random() * keys.length));

        particles.push(new Particle(x, y, randomKey, null));

        const shapeTypes = ['circle', 'square', 'triangle', 'star'];
        const randomType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(x, y, null, randomType));
        }
        playSound('standard');
    }
}

// --- Gesture Detection State ---
let touchThrottle = 0;
let tapCount = 0;
let tapTimer = null;
const TAP_WINDOW = 500; // ms to complete triple-tap
const SWIPE_THRESHOLD = 80; // min px to count as a swipe
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let touchMoved = false;

window.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!audioCtx) initAudio();

    // Record start position for swipe detection
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
    touchMoved = false;

    // Spawn particles on touch
    for (let i = 0; i < e.touches.length; i++) {
        spawnFromTouch(e.touches[i].clientX, e.touches[i].clientY);
    }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    e.preventDefault();
    touchMoved = true;

    // Throttle touchmove to avoid spawning too many particles
    const now = Date.now();
    if (now - touchThrottle < 80) return;
    touchThrottle = now;
    for (let i = 0; i < e.touches.length; i++) {
        spawnFromTouch(e.touches[i].clientX, e.touches[i].clientY);
    }
}, { passive: false });

window.addEventListener('touchend', (e) => {
    e.preventDefault();

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const absDX = Math.abs(deltaX);
    const absDY = Math.abs(deltaY);
    const elapsed = Date.now() - touchStartTime;

    // --- Swipe Detection (must be fast and long enough) ---
    if (elapsed < 600 && (absDX > SWIPE_THRESHOLD || absDY > SWIPE_THRESHOLD)) {

        // Swipe DOWN → MAMA
        if (absDY > absDX && deltaY > SWIPE_THRESHOLD) {
            triggerMAMACelebration();
            tapCount = 0;
            if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; }
            return;
        }

        // Swipe SIDEWAYS (left or right) → ROOMBA
        if (absDX > absDY && absDX > SWIPE_THRESHOLD) {
            triggerRoomba();
            tapCount = 0;
            if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; }
            return;
        }
    }

    // --- Triple-Tap Detection (only if no significant movement) ---
    if (!touchMoved || (absDX < 20 && absDY < 20)) {
        tapCount++;

        if (tapTimer) clearTimeout(tapTimer);

        if (tapCount >= 3) {
            // Triple tap! → EMI
            triggerEMICelebration();
            tapCount = 0;
            tapTimer = null;
        } else {
            // Wait for more taps
            tapTimer = setTimeout(() => {
                tapCount = 0;
                tapTimer = null;
            }, TAP_WINDOW);
        }
    } else {
        // Movement was too much for a tap, reset
        tapCount = 0;
        if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; }
    }
}, { passive: false });

// --- Pixel Art Background System ---

// Cloud pixel grids (small retro clouds)
const cloudSprites = [
    [
        [0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 2, 2, 2, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        [0, 1, 2, 2, 2, 2, 2, 1, 1, 2, 2, 1, 0, 0, 0, 0],
        [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
        [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
        [0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]
    ],
    [
        [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 2, 2, 1, 1, 0, 0, 0],
        [0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0],
        [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0],
        [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0]
    ],
    [
        [0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
        [1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 1, 0, 0, 0, 0],
        [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
        [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
        [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]
    ]
];
const cloudColors = { 1: '#D0E8F8', 2: '#FFFFFF' };

// Cloud positions (drift slowly, big and slow)
let clouds = [
    { sprite: 0, x: 0.1, y: 0.06, speed: 0.008, scale: 12 },
    { sprite: 1, x: 0.55, y: 0.10, speed: 0.005, scale: 10 },
    { sprite: 2, x: 0.75, y: 0.03, speed: 0.01, scale: 13 }
];

// Seeded grass details (generated once, redrawn each frame)
let grassDetails = [];
let grassFlowers = [];
let grassPlants = []; // Lavender and jasmine plants
let bgInitialized = false;

function initBackgroundDetails() {
    grassDetails = [];
    grassFlowers = [];
    const grassTop = canvas.height - 100;

    // Grass blades - random darker/lighter patches
    for (let i = 0; i < 300; i++) {
        grassDetails.push({
            x: Math.random() * canvas.width,
            y: grassTop + Math.random() * 100,
            w: 2 + Math.random() * 3,
            h: 4 + Math.random() * 8,
            shade: Math.floor(Math.random() * 3) // 0=dark, 1=mid, 2=light
        });
    }

    // Small pixel flowers
    const flowerColors = ['#FF6B8A', '#FFD700', '#FF4444', '#FF8C00', '#DA70D6', '#FF69B4'];
    for (let i = 0; i < 40; i++) {
        grassFlowers.push({
            x: Math.random() * canvas.width,
            y: grassTop + 5 + Math.random() * 60,
            color: flowerColors[Math.floor(Math.random() * flowerColors.length)],
            size: 2 + Math.random() * 3
        });
    }

    // Lavender and Jasmine plants
    grassPlants = [];
    for (let i = 0; i < 12; i++) {
        grassPlants.push({
            x: Math.random() * canvas.width,
            y: grassTop + 5 + Math.random() * 40,
            type: 'lavender',
            height: 18 + Math.random() * 14,
            sway: Math.random() * Math.PI * 2
        });
    }
    for (let i = 0; i < 10; i++) {
        grassPlants.push({
            x: Math.random() * canvas.width,
            y: grassTop + 10 + Math.random() * 45,
            type: 'jasmine',
            size: 10 + Math.random() * 8,
            sway: Math.random() * Math.PI * 2
        });
    }
    bgInitialized = true;
}

function drawBackground() {
    const w = canvas.width;
    const h = canvas.height;
    const grassTop = h - 100;

    // Cache the static background (sky, grass, flowers, plants) to an offscreen canvas
    if (bgNeedsRedraw || !bgCanvas || bgCanvas.width !== w || bgCanvas.height !== h) {
        bgCanvas = document.createElement('canvas');
        bgCanvas.width = w;
        bgCanvas.height = h;
        const bgCtx = bgCanvas.getContext('2d');

        // --- Gradient Sky (pixel banded for retro feel) ---
        const bandSize = 4;
        for (let y = 0; y < grassTop; y += bandSize) {
            const t = y / grassTop;
            const r = Math.floor(60 + t * 80);
            const g = Math.floor(120 + t * 90);
            const b = Math.floor(200 + t * 40);
            bgCtx.fillStyle = `rgb(${r},${g},${b})`;
            bgCtx.fillRect(0, y, w, bandSize);
        }

        // --- Textured Grass ---
        const grassShades = ['#1B7A1B', '#28A428', '#32CD32', '#45E045'];
        const layerHeight = 25;
        for (let i = 0; i < 4; i++) {
            bgCtx.fillStyle = grassShades[i];
            bgCtx.fillRect(0, grassTop + (3 - i) * layerHeight, w, layerHeight + 1);
        }

        if (!bgInitialized) initBackgroundDetails();
        const detailShades = ['#1A6B1A', '#24922E', '#3CBF3C'];
        for (const g of grassDetails) {
            bgCtx.fillStyle = detailShades[g.shade];
            bgCtx.fillRect(g.x, g.y - g.h, g.w, g.h);
        }

        for (const f of grassFlowers) {
            bgCtx.fillStyle = f.color;
            bgCtx.fillRect(f.x, f.y, f.size, f.size);
            bgCtx.fillStyle = '#1B7A1B';
            bgCtx.fillRect(f.x + f.size / 2 - 0.5, f.y + f.size, 1, 4);
        }

        // Draw lavender and jasmine plants to cache
        for (const p of grassPlants) {
            if (p.type === 'lavender') {
                const stemH = p.height;
                const baseX = p.x;
                const baseY = p.y;
                bgCtx.fillStyle = '#4A7A3A';
                bgCtx.fillRect(baseX, baseY - stemH, 2, stemH);
                bgCtx.fillStyle = '#5A8A4A';
                bgCtx.fillRect(baseX - 3, baseY - stemH * 0.4, 3, 2);
                bgCtx.fillRect(baseX + 2, baseY - stemH * 0.6, 3, 2);
                const spikeH = stemH * 0.45;
                const purples = ['#7B4FAA', '#9B59B6', '#8E44AD', '#A569BD', '#7D3C98'];
                for (let j = 0; j < spikeH; j += 2) {
                    bgCtx.fillStyle = purples[Math.floor(j / 2) % purples.length];
                    const pw = Math.max(1, 4 - Math.abs(j - spikeH * 0.4) * 0.15);
                    bgCtx.fillRect(baseX - pw / 2 + 1, baseY - stemH - j + spikeH - 2, pw, 2);
                }
            } else if (p.type === 'jasmine') {
                const baseX = p.x;
                const baseY = p.y;
                const sz = p.size;
                bgCtx.fillStyle = '#2D7A2D';
                for (let row = 0; row < 3; row++) {
                    const rowW = sz * (1 - row * 0.25);
                    bgCtx.fillRect(baseX - rowW / 2, baseY - row * 3, rowW, 3);
                }
                bgCtx.fillStyle = '#3A8F3A';
                for (let row = 0; row < 2; row++) {
                    const rowW = sz * 0.7 * (1 - row * 0.3);
                    bgCtx.fillRect(baseX - rowW / 2 + 1, baseY - row * 3 - 3, rowW, 3);
                }
                bgCtx.fillStyle = '#FFFFFF';
                const flowerPositions = [
                    [-sz * 0.25, -3], [sz * 0.2, -5], [0, -7], [sz * 0.1, -2], [-sz * 0.15, -6]
                ];
                for (const [fx, fy] of flowerPositions) {
                    bgCtx.fillRect(baseX + fx, baseY + fy, 2, 2);
                    bgCtx.fillRect(baseX + fx - 1, baseY + fy + 1, 1, 1);
                    bgCtx.fillRect(baseX + fx + 2, baseY + fy + 1, 1, 1);
                    bgCtx.fillRect(baseX + fx + 1, baseY + fy - 1, 1, 1);
                    bgCtx.fillRect(baseX + fx + 1, baseY + fy + 2, 1, 1);
                }
                bgCtx.fillStyle = '#FFE066';
                for (const [fx, fy] of flowerPositions) {
                    bgCtx.fillRect(baseX + fx + 0.5, baseY + fy + 0.5, 1, 1);
                }
            }
        }

        bgNeedsRedraw = false;
    }

    // Blit cached static background in one call
    ctx.drawImage(bgCanvas, 0, 0);

    // --- Pixel Clouds ---
    for (const cloud of clouds) {
        cloud.x += cloud.speed / 60; // drift per frame
        if (cloud.x * w > w + 200) cloud.x = -0.15;

        const sprite = cloudSprites[cloud.sprite];
        const px = cloud.scale;
        const cx = cloud.x * w;
        const cy = cloud.y * h;

        for (let r = 0; r < sprite.length; r++) {
            for (let c = 0; c < sprite[r].length; c++) {
                const val = sprite[r][c];
                if (val !== 0) {
                    ctx.fillStyle = cloudColors[val];
                    ctx.fillRect(cx + c * px, cy + r * px, px, px);
                }
            }
        }
    }
}

// --- Procedural Koelreuteria Paniculata Tree ---

// Foliage cluster mini-sprites (8x8 pixel art)
const foliagePatterns = [
    // Dense round cluster
    [
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 2, 2, 1, 1, 0],
        [1, 1, 2, 2, 2, 2, 1, 1],
        [1, 2, 2, 2, 2, 2, 2, 1],
        [1, 2, 2, 2, 2, 2, 2, 1],
        [1, 1, 2, 2, 2, 2, 1, 1],
        [0, 1, 1, 2, 2, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 0, 0]
    ],
    // Asymmetric cluster
    [
        [0, 0, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 2, 2, 2, 1, 0],
        [1, 1, 2, 2, 2, 2, 2, 1],
        [1, 2, 2, 2, 2, 2, 2, 1],
        [1, 2, 2, 2, 2, 2, 1, 1],
        [0, 1, 2, 2, 2, 2, 1, 0],
        [0, 1, 1, 1, 2, 1, 1, 0],
        [0, 0, 0, 1, 1, 0, 0, 0]
    ]
];

// Color sets for foliage (each cluster gets one)
const foliageColorSets = [
    { 1: '#1B5E20', 2: '#2E7D32' },   // Dark green
    { 1: '#2E7D32', 2: '#43A047' },   // Mid green
    { 1: '#33691E', 2: '#558B2F' },   // Olive green
    { 1: '#E65100', 2: '#FF8F00' },   // Orange cluster
    { 1: '#BF360C', 2: '#E8830C' },   // Dark orange
    { 1: '#C62828', 2: '#D4566A' },   // Salmon/pink pods
    { 1: '#F57F17', 2: '#FFD700' },   // Gold flowers
    { 1: '#F9A825', 2: '#FFEE58' },   // Yellow flowers
];

function generateTree() {
    const w = canvas.width;
    const h = canvas.height;

    treeTrunkX = w / 2;
    treeTrunkBaseY = h - 100; // grass line
    const trunkTop = h * 0.42;
    const trunkHeight = treeTrunkBaseY - trunkTop;

    // Adjust proportions for portrait (vertical) vs landscape
    const isPortrait = h > w;
    treeCanopyW = isPortrait ? w * 0.9 : w * 0.75;
    treeCanopyH = isPortrait ? h * 0.45 : h * 0.5;
    treeCanopyTop = isPortrait ? h * 0.12 : h * 0.1;

    treeBranches = [];

    // Generate recursive branches
    function addBranch(x1, y1, angle, length, thickness, depth) {
        const x2 = x1 + Math.cos(angle) * length;
        const y2 = y1 + Math.sin(angle) * length;

        treeBranches.push({
            x1, y1, x2, y2,
            thickness,
            depth,
            // Foliage clusters at endpoints
            foliage: generateFoliageClusters(x2, y2, length * 1.0, depth)
        });

        if (depth < 3) {
            // Number of sub-branches
            const numBranches = depth === 0 ? 5 : (depth === 1 ? 4 : 3);
            for (let i = 0; i < numBranches; i++) {
                const spread = depth === 0 ? 1.8 : (depth === 1 ? 1.2 : 0.9);
                const angleOffset = (i / (numBranches - 1) - 0.5) * spread;
                const newAngle = angle + angleOffset + (Math.random() - 0.5) * 0.25;
                const newLength = length * (0.5 + Math.random() * 0.25);
                const newThickness = thickness * 0.55;
                addBranch(x2, y2, newAngle, newLength, newThickness, depth + 1);
            }
        }
    }

    function generateFoliageClusters(cx, cy, radius, depth) {
        const clusters = [];
        const count = depth === 0 ? 6 : (depth === 1 ? 8 : 5);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            clusters.push({
                x: cx + Math.cos(angle) * dist,
                y: Math.min(cy + Math.sin(angle) * dist, treeTrunkBaseY - 100),
                pattern: Math.floor(Math.random() * foliagePatterns.length),
                colors: foliageColorSets[Math.floor(Math.random() * foliageColorSets.length)],
                scale: 3 + Math.random() * 2.5
            });
        }
        return clusters;
    }

    // Main trunk splits into major branches
    addBranch(treeTrunkX, treeTrunkBaseY, -Math.PI / 2, trunkHeight * 0.5, 30, 0);
    // Wide spread branches from trunk
    addBranch(treeTrunkX, treeTrunkBaseY - trunkHeight * 0.25, -Math.PI / 2 - 0.4, trunkHeight * 0.45, 24, 0);
    addBranch(treeTrunkX, treeTrunkBaseY - trunkHeight * 0.25, -Math.PI / 2 + 0.4, trunkHeight * 0.45, 24, 0);
    addBranch(treeTrunkX, treeTrunkBaseY - trunkHeight * 0.12, -Math.PI / 2 - 0.8, trunkHeight * 0.4, 18, 0);
    addBranch(treeTrunkX, treeTrunkBaseY - trunkHeight * 0.12, -Math.PI / 2 + 0.8, trunkHeight * 0.4, 18, 0);
    // Extra wide outer branches
    addBranch(treeTrunkX, treeTrunkBaseY - trunkHeight * 0.05, -Math.PI / 2 - 1.1, trunkHeight * 0.32, 14, 0);
    addBranch(treeTrunkX, treeTrunkBaseY - trunkHeight * 0.05, -Math.PI / 2 + 1.1, trunkHeight * 0.32, 14, 0);
    // Render tree to offscreen canvas for caching
    treeCanvas = document.createElement('canvas');
    treeCanvas.width = canvas.width;
    treeCanvas.height = canvas.height;
    const tCtx = treeCanvas.getContext('2d');

    const px = 3;
    const renderTrunkTop = canvas.height * 0.42;
    const trunkW = 55;
    const trunkColors = ['#3E2723', '#4E342E', '#5D4037', '#5C3317'];

    // Pixel-art trunk
    for (let y = treeTrunkBaseY; y > renderTrunkTop; y -= px) {
        const taper = 1 - (treeTrunkBaseY - y) / (treeTrunkBaseY - renderTrunkTop) * 0.4;
        const w = trunkW * taper;
        for (let x = -w / 2; x < w / 2; x += px) {
            tCtx.fillStyle = trunkColors[Math.floor(Math.random() * trunkColors.length)];
            tCtx.fillRect(treeTrunkX + x, y, px, px);
        }
    }

    // Draw roots
    const rootColors = ['#3E2723', '#5D4037'];
    for (let i = -2; i <= 2; i++) {
        if (i === 0) continue;
        const rootLen = 30 + Math.abs(i) * 20;
        for (let s = 0; s < rootLen; s += px) {
            tCtx.fillStyle = rootColors[Math.floor(Math.random() * rootColors.length)];
            tCtx.fillRect(treeTrunkX + i * 15 + s * Math.sign(i), treeTrunkBaseY - 5 + Math.abs(s * 0.15), px * 1.5, px);
        }
    }

    // Draw branches (sorted by depth so thicker ones are behind)
    const sortedBranches = [...treeBranches].sort((a, b) => a.depth - b.depth);

    for (const branch of sortedBranches) {
        const steps = Math.max(10, Math.floor(Math.sqrt((branch.x2 - branch.x1) ** 2 + (branch.y2 - branch.y1) ** 2) / px));
        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const bx = branch.x1 + (branch.x2 - branch.x1) * t;
            const by = branch.y1 + (branch.y2 - branch.y1) * t;
            const bw = branch.thickness * (1 - t * 0.5);
            tCtx.fillStyle = trunkColors[Math.floor(Math.random() * trunkColors.length)];
            tCtx.fillRect(bx - bw / 2, by - bw / 2, bw, px);
        }
    }

    // Draw foliage clusters on top of branches
    for (const branch of sortedBranches) {
        for (const cluster of branch.foliage) {
            const pattern = foliagePatterns[cluster.pattern];
            const s = cluster.scale;
            for (let r = 0; r < pattern.length; r++) {
                for (let c = 0; c < pattern[r].length; c++) {
                    const val = pattern[r][c];
                    if (val !== 0) {
                        tCtx.fillStyle = cluster.colors[val];
                        tCtx.fillRect(
                            cluster.x + c * s - (pattern[r].length * s) / 2,
                            cluster.y + r * s - (pattern.length * s) / 2,
                            s, s
                        );
                    }
                }
            }
        }
    }
}

function drawTree() {
    if (treeCanvas) {
        ctx.drawImage(treeCanvas, 0, 0);
    }
}

// --- Walking Spaniel System ---
class WalkingSpaniel {
    constructor() {
        this.pixelSize = 7;
        this.width = 16 * this.pixelSize;
        this.height = 16 * this.pixelSize;
        this.groundY = 0; // Set in init
        this.x = 0;
        this.y = 0;
        this.direction = 1; // 1 = right, -1 = left
        this.speed = 0.6;
        this.state = 'walking'; // walking, idle, approaching_tree, peeing, walking_away
        this.stateTimer = 0;
        this.idleDuration = 0;
        this.peeDuration = 0;
        this.peeStreamProgress = 0;
        this.legFrame = 0;
        this.legTimer = 0;
        this.tailWag = 0;
        this.tailTimer = 0;
        // Side-view sprite grids (right-facing)
        this.spriteRight = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 3, 1, 1, 2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 3, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
            [0, 4, 4, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 4, 2, 2, 2, 2, 2, 1, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 2, 2, 1, 1, 2, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ];
        // Peeing sprite (leg lifted, side view)
        this.spritePee = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 3, 1, 1, 2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 3, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
            [0, 4, 4, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 4, 2, 2, 2, 2, 2, 1, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 2, 2, 1, 1, 2, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 5, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 5, 5, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ];
        this.colors = { 1: '#FFFFFF', 2: '#663300', 3: '#000000', 4: '#663300', 5: '#FFFFFF' };
    }

    init() {
        this.groundY = canvas.height - 100 - this.height + 16; // Sit on grass
        this.x = Math.random() * canvas.width * 0.3 + canvas.width * 0.1;
        this.y = this.groundY;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.state = 'walking';
        this.stateTimer = 0;
    }

    update() {
        this.stateTimer++;
        this.tailTimer++;
        this.tailWag = Math.sin(this.tailTimer * 0.15) * 3;

        switch (this.state) {
            case 'walking':
                this.legTimer++;
                this.legFrame = Math.floor(this.legTimer / 10) % 2;
                this.x += this.speed * this.direction;

                // Bounce off edges
                if (this.x > canvas.width - 100) {
                    this.direction = -1;
                } else if (this.x < 50) {
                    this.direction = 1;
                }

                // Randomly stop to idle
                if (this.stateTimer > 120 && Math.random() < 0.005) {
                    this.state = 'idle';
                    this.stateTimer = 0;
                    this.idleDuration = 60 + Math.random() * 120;
                }

                // Randomly decide to go pee on the tree
                if (this.stateTimer > 300 && Math.random() < 0.002) {
                    this.state = 'approaching_tree';
                    this.stateTimer = 0;
                    this.direction = (treeTrunkX > this.x) ? 1 : -1;
                }
                break;

            case 'idle':
                this.legFrame = 0;
                if (this.stateTimer > this.idleDuration) {
                    this.state = 'walking';
                    this.stateTimer = 0;
                    // Maybe change direction
                    if (Math.random() > 0.5) this.direction *= -1;
                }
                break;

            case 'approaching_tree':
                this.legTimer++;
                this.legFrame = Math.floor(this.legTimer / 8) % 2;
                this.speed = 0.9;
                this.x += this.speed * this.direction;

                // Reached the tree trunk area
                const distToTree = Math.abs(this.x - treeTrunkX);
                if (distToTree < 40) {
                    this.state = 'peeing';
                    this.stateTimer = 0;
                    this.peeDuration = 120 + Math.random() * 80;
                    this.peeStreamProgress = 0;
                    // Face the tree
                    this.direction = (treeTrunkX > this.x) ? 1 : -1;
                }
                break;

            case 'peeing':
                this.legFrame = 0;
                this.peeStreamProgress = Math.min(1, this.stateTimer / 20);
                if (this.stateTimer > this.peeDuration) {
                    this.state = 'walking_away';
                    this.stateTimer = 0;
                    this.direction = Math.random() > 0.5 ? 1 : -1;
                    this.speed = 0.6;
                }
                break;

            case 'walking_away':
                this.legTimer++;
                this.legFrame = Math.floor(this.legTimer / 10) % 2;
                this.x += this.speed * this.direction;
                this.speed = 0.6;
                if (this.stateTimer > 100) {
                    this.state = 'walking';
                    this.stateTimer = 0;
                }
                break;
        }
    }

    draw() {
        ctx.save();
        const sprite = this.state === 'peeing' ? this.spritePee : this.spriteRight;
        const px = this.pixelSize;

        // Flip horizontally if facing left
        if (this.direction === -1) {
            ctx.translate(this.x + this.width / 2, this.y);
            ctx.scale(-1, 1);
            ctx.translate(-this.width / 2, 0);
        } else {
            ctx.translate(this.x, this.y);
        }

        // Slight leg animation offset
        const legOffset = this.legFrame * 2;

        for (let r = 0; r < sprite.length; r++) {
            for (let c = 0; c < sprite[r].length; c++) {
                const val = sprite[r][c];
                if (val !== 0) {
                    ctx.fillStyle = this.colors[val] || '#FFFFFF';
                    let offsetY = 0;
                    // Animate legs (rows 11-12 are legs)
                    if (r >= 11 && r <= 12 && this.state !== 'peeing' && this.state !== 'idle') {
                        if (c < 6) offsetY = legOffset;
                        else offsetY = -legOffset;
                    }
                    ctx.fillRect(c * px, r * px + offsetY, px, px);
                }
            }
        }

        // Draw pee stream when peeing
        if (this.state === 'peeing' && this.peeStreamProgress > 0) {
            ctx.fillStyle = '#FFD700';
            const streamDir = this.direction;
            // The stream comes from the body toward the tree
            const startX = (streamDir === 1) ? 11 * px : 5 * px;
            const startY = 10 * px;
            const streamLen = this.peeStreamProgress * 25;

            // Arcing pee stream
            for (let i = 0; i < streamLen; i++) {
                const t = i / streamLen;
                const sx = startX + i * 1.5 * streamDir;
                const sy = startY + Math.sin(t * Math.PI) * -8 + t * 12;
                ctx.fillRect(sx, sy, 2, 2);
            }

            // Small puddle at base
            if (this.peeStreamProgress > 0.5) {
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#FFD700';
                const puddleX = startX + streamLen * 1.5 * streamDir;
                const puddleY = startY + 12;
                ctx.beginPath();
                ctx.ellipse(puddleX, puddleY, 6 * this.peeStreamProgress, 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        ctx.restore();
    }
}

function animate() {
    // Draw the full retro pixel art background
    drawBackground();

    // Draw Tree (procedural)
    drawTree();

    // Initialize walking spaniel on first frame (or respawn after being eaten)
    if (!walkingSpaniel && treeTrunkX && !dogEaten) {
        walkingSpaniel = new WalkingSpaniel();
        walkingSpaniel.init();
    }

    // Respawn dog timer (after roomba leaves)
    if (dogEaten && !activeRoomba) {
        dogRespawnTimer++;
        if (dogRespawnTimer > 300) { // ~5 seconds to respawn
            dogEaten = false;
            dogRespawnTimer = 0;
            walkingSpaniel = null; // Force fresh creation
        }
    }

    // Update and Draw Walking Spaniel
    if (walkingSpaniel && !dogEaten) {
        walkingSpaniel.update();
        walkingSpaniel.draw();
    }

    // Update and Draw Roomba
    if (activeRoomba) {
        activeRoomba.update();
        activeRoomba.draw();
        if (activeRoomba.done) {
            activeRoomba = null;
        }
    }

    // Spawn falling leaves from canopy
    if (Math.random() < 0.1 && leaves.length < 80) {
        const spawnX = treeTrunkX + (Math.random() - 0.5) * treeCanopyW * 0.8;
        const spawnY = treeCanopyTop + Math.random() * treeCanopyH * 0.5;
        leaves.push(new Leaf(spawnX, spawnY));
    }

    // Update and Draw Leaves
    for (let i = 0; i < leaves.length; i++) {
        leaves[i].update();
        leaves[i].draw();
    }
    leaves = leaves.filter(l => l.life > 0);

    // Update and Draw Sprites/Particles
    if (particles.length > 100) {
        particles = particles.slice(-100);
    }
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        // Bounce off the 'ground' (grass level)
        if (particles[i].y > canvas.height - 100) {
            particles[i].y = canvas.height - 100;
            particles[i].speedY *= -0.6;
        }
    }
    particles = particles.filter(p => p.life > 0);

    // Update and Draw Big EMI Letters
    for (let i = 0; i < emiBigLetters.length; i++) {
        const bl = emiBigLetters[i];
        bl.y += bl.speedY;
        bl.life -= bl.decay;
        ctx.save();
        ctx.globalAlpha = bl.life;
        ctx.font = `bold ${bl.scale}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = bl.color;
        ctx.shadowColor = bl.color;
        ctx.shadowBlur = 20;
        ctx.fillText(bl.char, bl.x, bl.y);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeText(bl.char, bl.x, bl.y);
        ctx.restore();
    }
    emiBigLetters = emiBigLetters.filter(bl => bl.life > 0);

    // Draw MAMA Big Letters
    for (let i = 0; i < mamaBigLetters.length; i++) {
        const bl = mamaBigLetters[i];
        bl.y += bl.speedY;
        bl.life -= bl.decay;
        ctx.save();
        ctx.globalAlpha = bl.life;
        ctx.font = `bold ${bl.scale}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = bl.color;
        ctx.shadowColor = bl.color;
        ctx.shadowBlur = 20;
        ctx.fillText(bl.char, bl.x, bl.y);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeText(bl.char, bl.x, bl.y);
        ctx.restore();
    }
    mamaBigLetters = mamaBigLetters.filter(bl => bl.life > 0);

    // Draw EMI Celebration
    if (emiCelebration) {
        drawEMICelebration();
    }

    // Draw MAMA Celebration
    if (mamaCelebration) {
        drawMAMACelebration();
    }

    // Draw ROOMBA Celebration
    if (roombaCelebration) {
        drawROOMBACelebration();
    }

    // Update and draw walking doctor
    if (walkingDoctor) {
        doctorTimer++;
        // Doctor disappears after ~30 seconds (1800 frames at 60fps)
        if (doctorTimer > 1800) {
            walkingDoctor = null;
            doctorTimer = 0;
        } else {
            walkingDoctor.update();
            walkingDoctor.draw();
        }
    }

    requestAnimationFrame(animate);
}

// --- EMI Celebration System ---

function triggerEMICelebration() {
    playCelebrationSound();
    emiCelebration = {
        startTime: Date.now(),
        duration: 4000,
        confetti: [],
        bannerAlpha: 0
    };
    // Generate confetti
    for (let i = 0; i < 40; i++) {
        emiCelebration.confetti.push({
            x: Math.random() * canvas.width,
            y: -Math.random() * canvas.height * 0.5,
            speedX: (Math.random() - 0.5) * 6,
            speedY: Math.random() * 4 + 2,
            size: Math.random() * 8 + 4,
            color: ['#FF0055', '#FFD700', '#00FF55', '#FF77FF', '#00CCFF', '#FF8800', '#FFFFFF'][Math.floor(Math.random() * 7)],
            spin: Math.random() * 0.3
        });
    }
}

function drawEMICelebration() {
    const elapsed = Date.now() - emiCelebration.startTime;
    const progress = elapsed / emiCelebration.duration;

    if (progress >= 1) {
        emiCelebration = null;
        return;
    }

    // Confetti
    for (const c of emiCelebration.confetti) {
        c.x += c.speedX;
        c.y += c.speedY;
        c.spin += 0.05;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.spin);
        ctx.fillStyle = c.color;
        ctx.globalAlpha = 1 - progress * 0.5;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
        ctx.restore();
    }

    // Big EMI Banner
    const bannerAlpha = progress < 0.1 ? progress * 10 : (progress > 0.7 ? (1 - progress) / 0.3 : 1);
    ctx.save();
    ctx.globalAlpha = bannerAlpha;

    // Banner background with glow
    const bannerY = canvas.height * 0.15;
    const bannerH = 220;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, bannerY - 10, canvas.width, bannerH + 20);

    // Rainbow gradient border
    const grad = ctx.createLinearGradient(0, bannerY - 10, canvas.width, bannerY - 10);
    grad.addColorStop(0, '#FF0055');
    grad.addColorStop(0.25, '#FFD700');
    grad.addColorStop(0.5, '#00FF55');
    grad.addColorStop(0.75, '#00CCFF');
    grad.addColorStop(1, '#FF77FF');
    ctx.fillStyle = grad;
    ctx.fillRect(0, bannerY - 14, canvas.width, 6);
    ctx.fillRect(0, bannerY + bannerH + 10, canvas.width, 6);

    // EMI text
    const fontSize = 160;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Pulsing scale
    const pulse = 1 + Math.sin(elapsed * 0.01) * 0.05;
    ctx.translate(canvas.width / 2, bannerY + bannerH / 2);
    ctx.scale(pulse, pulse);

    // E in red
    ctx.fillStyle = '#FF4444';
    ctx.shadowColor = '#FF4444';
    ctx.shadowBlur = 30;
    ctx.fillText('E', -fontSize * 0.8, 0);

    // M in green
    ctx.fillStyle = '#44FF44';
    ctx.shadowColor = '#44FF44';
    ctx.fillText('M', 0, 0);

    // I in blue
    ctx.fillStyle = '#6666FF';
    ctx.shadowColor = '#6666FF';
    ctx.fillText('I', fontSize * 0.7, 0);

    // Subtitle
    ctx.scale(1 / pulse, 1 / pulse);
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    ctx.fillText('✨ ¡E M I! ✨', 0, fontSize * 0.55);

    ctx.restore();
}

// Build spawnable sprites list (excluding koelreuteria)
Object.keys(sprites).forEach(name => {
    if (name !== 'koelreuteria') {
        spawnableSprites.push(name);
    }
});

// --- MAMA Celebration System ---

function triggerMAMACelebration() {
    playCelebrationSound();
    mamaCelebration = {
        startTime: Date.now(),
        duration: 5000,
        confetti: [],
        bannerAlpha: 0
    };
    // Generate heart-shaped confetti (pink/magenta theme)
    for (let i = 0; i < 40; i++) {
        mamaCelebration.confetti.push({
            x: Math.random() * canvas.width,
            y: -Math.random() * canvas.height * 0.5,
            speedX: (Math.random() - 0.5) * 5,
            speedY: Math.random() * 3 + 1.5,
            size: Math.random() * 10 + 4,
            color: ['#FF69B4', '#FF1493', '#FFB6C1', '#FF85A2', '#FFC0CB', '#FF007F', '#FFFFFF'][Math.floor(Math.random() * 7)],
            spin: Math.random() * 0.3,
            isHeart: Math.random() > 0.4
        });
    }

    // Spawn the doctor (only if none exists)
    if (!walkingDoctor) {
        walkingDoctor = new WalkingDoctor();
        walkingDoctor.init();
        doctorTimer = 0;
    } else {
        // Reset timer if doctor already exists
        doctorTimer = 0;
    }
}

function drawMAMACelebration() {
    const elapsed = Date.now() - mamaCelebration.startTime;
    const progress = elapsed / mamaCelebration.duration;

    if (progress >= 1) {
        mamaCelebration = null;
        return;
    }

    // Confetti (hearts and squares)
    for (const c of mamaCelebration.confetti) {
        c.x += c.speedX;
        c.y += c.speedY;
        c.spin += 0.05;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.spin);
        ctx.fillStyle = c.color;
        ctx.globalAlpha = 1 - progress * 0.5;

        if (c.isHeart) {
            // Draw tiny heart
            const s = c.size * 0.5;
            ctx.beginPath();
            ctx.moveTo(0, s * 0.3);
            ctx.bezierCurveTo(-s, -s * 0.5, -s * 0.5, -s, 0, -s * 0.3);
            ctx.bezierCurveTo(s * 0.5, -s, s, -s * 0.5, 0, s * 0.3);
            ctx.fill();
        } else {
            ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
        }
        ctx.restore();
    }

    // Big MAMA Banner
    const bannerAlpha = progress < 0.1 ? progress * 10 : (progress > 0.7 ? (1 - progress) / 0.3 : 1);
    ctx.save();
    ctx.globalAlpha = bannerAlpha;

    // Banner background
    const bannerY = canvas.height * 0.15;
    const bannerH = 220;
    ctx.fillStyle = 'rgba(60, 0, 30, 0.7)';
    ctx.fillRect(0, bannerY - 10, canvas.width, bannerH + 20);

    // Pink gradient border
    const grad = ctx.createLinearGradient(0, bannerY - 10, canvas.width, bannerY - 10);
    grad.addColorStop(0, '#FF69B4');
    grad.addColorStop(0.25, '#FF1493');
    grad.addColorStop(0.5, '#FFB6C1');
    grad.addColorStop(0.75, '#FF007F');
    grad.addColorStop(1, '#FF69B4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, bannerY - 14, canvas.width, 6);
    ctx.fillRect(0, bannerY + bannerH + 10, canvas.width, 6);

    // MAMA text
    const fontSize = 130;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Pulsing scale
    const pulse = 1 + Math.sin(elapsed * 0.01) * 0.05;
    ctx.translate(canvas.width / 2, bannerY + bannerH / 2);
    ctx.scale(pulse, pulse);

    // M in hot pink
    ctx.fillStyle = '#FF1493';
    ctx.shadowColor = '#FF1493';
    ctx.shadowBlur = 30;
    ctx.fillText('M', -fontSize * 1.2, 0);

    // A in pink
    ctx.fillStyle = '#FF69B4';
    ctx.shadowColor = '#FF69B4';
    ctx.fillText('A', -fontSize * 0.4, 0);

    // M in magenta
    ctx.fillStyle = '#FF007F';
    ctx.shadowColor = '#FF007F';
    ctx.fillText('M', fontSize * 0.4, 0);

    // A in light pink
    ctx.fillStyle = '#FFB6C1';
    ctx.shadowColor = '#FFB6C1';
    ctx.fillText('A', fontSize * 1.2, 0);

    // Subtitle
    ctx.scale(1 / pulse, 1 / pulse);
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    ctx.fillText('💖 ¡M A M Á! 💖', 0, fontSize * 0.6);

    ctx.restore();
}

// --- Walking Doctor System ---
class WalkingDoctor {
    constructor() {
        this.pixelSize = 7;
        this.spriteW = 16;
        this.spriteH = 26;
        this.width = this.spriteW * this.pixelSize;
        this.height = this.spriteH * this.pixelSize;
        this.groundY = 0;
        this.x = 0;
        this.y = 0;
        this.direction = 1;
        this.speed = 0.5;
        this.state = 'walking';
        this.stateTimer = 0;
        this.idleDuration = 0;
        this.legFrame = 0;
        this.legTimer = 0;
        // Side-view doctor sprite (right-facing, 16x26) - long hair, blue surgical scrubs
        // 0=empty, 1=hair, 2=skin, 3=eyes, 4=lips, 5=scrubs top, 6=stethoscope, 7=scrubs pants, 8=shoes, 9=hair-long
        this.spriteRight = [
            [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0], // 0  Top of head
            [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0], // 1
            [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0], // 2  Hair top
            [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0], // 3
            [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0], // 4  Forehead
            [0, 0, 0, 0, 9, 2, 3, 2, 2, 3, 2, 9, 0, 0, 0, 0], // 5  Eyes + hair sides
            [0, 0, 0, 0, 9, 2, 2, 2, 2, 2, 2, 9, 0, 0, 0, 0], // 6  Nose
            [0, 0, 0, 0, 9, 2, 2, 4, 4, 2, 2, 9, 0, 0, 0, 0], // 7  Mouth
            [0, 0, 0, 0, 9, 0, 2, 2, 2, 2, 0, 9, 0, 0, 0, 0], // 8  Chin + hair sides
            [0, 0, 0, 0, 9, 0, 2, 2, 2, 2, 0, 9, 0, 0, 0, 0], // 9  Neck + hair
            [0, 0, 0, 0, 9, 5, 5, 5, 5, 5, 5, 9, 0, 0, 0, 0], // 10 Collar + hair
            [0, 0, 0, 9, 5, 5, 5, 5, 5, 5, 5, 5, 9, 0, 0, 0], // 11 Scrubs top + hair
            [0, 0, 0, 9, 5, 5, 6, 5, 5, 5, 5, 5, 9, 0, 0, 0], // 12 + stethoscope
            [0, 0, 0, 9, 5, 5, 6, 5, 5, 5, 5, 5, 9, 0, 0, 0], // 13
            [0, 0, 0, 0, 5, 5, 6, 6, 5, 5, 5, 5, 0, 0, 0, 0], // 14 Stethoscope end
            [0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0], // 15 Scrubs body
            [0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0], // 16
            [0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0, 0], // 17 Scrubs hem
            [0, 0, 0, 0, 0, 7, 7, 7, 7, 7, 7, 0, 0, 0, 0, 0], // 18 Pants top
            [0, 0, 0, 0, 0, 7, 7, 7, 7, 7, 7, 0, 0, 0, 0, 0], // 19
            [0, 0, 0, 0, 0, 7, 7, 0, 0, 7, 7, 0, 0, 0, 0, 0], // 20 Pants legs
            [0, 0, 0, 0, 0, 7, 7, 0, 0, 7, 7, 0, 0, 0, 0, 0], // 21
            [0, 0, 0, 0, 0, 2, 2, 0, 0, 2, 2, 0, 0, 0, 0, 0], // 22 Ankles
            [0, 0, 0, 0, 0, 8, 8, 0, 0, 8, 8, 0, 0, 0, 0, 0], // 23 Shoes
            [0, 0, 0, 0, 8, 8, 8, 0, 0, 8, 8, 8, 0, 0, 0, 0], // 24 Shoe soles
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]  // 25 empty
        ];
        this.colors = {
            1: '#3D1F0A',  // Dark brown hair (top)
            2: '#DEB887',  // Skin tone
            3: '#2C1810',  // Dark eyes
            4: '#CC5555',  // Lips
            5: '#1A8FC4',  // Surgical scrubs blue (teal-blue)
            6: '#333333',  // Stethoscope (dark gray)
            7: '#157AA0',  // Scrubs pants (slightly darker blue)
            8: '#FFFFFF',  // White shoes
            9: '#3D1F0A'   // Long hair (same as top hair)
        };
    }

    init() {
        this.groundY = canvas.height - 100 - this.height + 20;
        // Start from one side of the screen
        this.x = Math.random() > 0.5 ? -this.width : canvas.width + this.width;
        this.direction = this.x < 0 ? 1 : -1;
        this.y = this.groundY;
        this.state = 'walking';
        this.stateTimer = 0;
    }

    update() {
        this.stateTimer++;

        switch (this.state) {
            case 'walking':
                this.legTimer++;
                this.legFrame = Math.floor(this.legTimer / 12) % 2;
                this.x += this.speed * this.direction;

                // Bounce off edges
                if (this.x > canvas.width - 80) {
                    this.direction = -1;
                } else if (this.x < 30) {
                    this.direction = 1;
                }

                // Randomly stop to idle
                if (this.stateTimer > 150 && Math.random() < 0.006) {
                    this.state = 'idle';
                    this.stateTimer = 0;
                    this.idleDuration = 80 + Math.random() * 120;
                }
                break;

            case 'idle':
                this.legFrame = 0;
                if (this.stateTimer > this.idleDuration) {
                    this.state = 'walking';
                    this.stateTimer = 0;
                    if (Math.random() > 0.5) this.direction *= -1;
                }
                break;
        }
    }

    draw() {
        ctx.save();
        const px = this.pixelSize;

        // Flip horizontally if facing left
        if (this.direction === -1) {
            ctx.translate(this.x + this.width / 2, this.y);
            ctx.scale(-1, 1);
            ctx.translate(-this.width / 2, 0);
        } else {
            ctx.translate(this.x, this.y);
        }

        const legOffset = this.legFrame * 3;

        for (let r = 0; r < this.spriteRight.length; r++) {
            for (let c = 0; c < this.spriteRight[r].length; c++) {
                const val = this.spriteRight[r][c];
                if (val !== 0) {
                    ctx.fillStyle = this.colors[val] || '#FFFFFF';
                    let offsetY = 0;
                    // Animate legs and shoes (rows 20-24)
                    if (r >= 20 && r <= 24 && this.state !== 'idle') {
                        if (c < 8) offsetY = legOffset;
                        else offsetY = -legOffset;
                    }
                    ctx.fillRect(c * px, r * px + offsetY, px, px);
                }
            }
        }

        ctx.restore();
    }
}

// --- ROOMBA System ---
function triggerRoomba() {
    if (activeRoomba) return; // Only one Roomba at a time
    playCelebrationSound();
    activeRoomba = new RoombaCleaner();
    activeRoomba.init();

    // Trigger red alert celebration
    roombaCelebration = {
        startTime: Date.now(),
        duration: 5000,
        confetti: []
    };
    // Danger-themed confetti
    for (let i = 0; i < 40; i++) {
        roombaCelebration.confetti.push({
            x: Math.random() * canvas.width,
            y: -Math.random() * canvas.height * 0.5,
            speedX: (Math.random() - 0.5) * 5,
            speedY: Math.random() * 3 + 1.5,
            size: Math.random() * 10 + 4,
            color: ['#FF0000', '#FF3300', '#CC0000', '#FF6600', '#990000', '#FF4444', '#FFD700'][Math.floor(Math.random() * 7)],
            spin: Math.random() * 0.3,
            isWarning: Math.random() > 0.5
        });
    }
}

function drawROOMBACelebration() {
    const elapsed = Date.now() - roombaCelebration.startTime;
    const progress = elapsed / roombaCelebration.duration;

    if (progress >= 1) {
        roombaCelebration = null;
        return;
    }

    // Red/orange confetti
    for (const c of roombaCelebration.confetti) {
        c.x += c.speedX;
        c.y += c.speedY;
        c.spin += 0.05;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.spin);
        ctx.fillStyle = c.color;
        ctx.globalAlpha = 1 - progress * 0.5;

        if (c.isWarning) {
            // Draw warning triangle
            const s = c.size * 0.6;
            ctx.beginPath();
            ctx.moveTo(0, -s);
            ctx.lineTo(-s, s);
            ctx.lineTo(s, s);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
        }
        ctx.restore();
    }

    // Flashing red alert banner
    const bannerAlpha = progress < 0.1 ? progress * 10 : (progress > 0.7 ? (1 - progress) / 0.3 : 1);
    const flashIntensity = Math.sin(elapsed * 0.015) * 0.3 + 0.7;
    ctx.save();
    ctx.globalAlpha = bannerAlpha;

    // Banner background (dark red, flashing)
    const bannerY = canvas.height * 0.15;
    const bannerH = 220;
    ctx.fillStyle = `rgba(${Math.floor(60 * flashIntensity)}, 0, 0, 0.8)`;
    ctx.fillRect(0, bannerY - 10, canvas.width, bannerH + 20);

    // Red gradient border
    const grad = ctx.createLinearGradient(0, bannerY - 10, canvas.width, bannerY - 10);
    grad.addColorStop(0, '#FF0000');
    grad.addColorStop(0.25, '#FF3300');
    grad.addColorStop(0.5, '#CC0000');
    grad.addColorStop(0.75, '#FF4400');
    grad.addColorStop(1, '#FF0000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, bannerY - 14, canvas.width, 6);
    ctx.fillRect(0, bannerY + bannerH + 10, canvas.width, 6);

    // ROOMBA text
    const fontSize = 110;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Pulsing scale
    const pulse = 1 + Math.sin(elapsed * 0.012) * 0.05;
    ctx.translate(canvas.width / 2, bannerY + bannerH / 2);
    ctx.scale(pulse, pulse);

    // R-O-O-M-B-A letters in shades of red
    const letters = ['R', 'O', 'O', 'M', 'B', 'A'];
    const colors = ['#FF0000', '#FF3300', '#CC0000', '#FF4400', '#FF2200', '#FF0000'];
    const totalWidth = letters.length * fontSize * 0.65;
    const startX = -totalWidth / 2 + fontSize * 0.325;

    for (let i = 0; i < letters.length; i++) {
        ctx.fillStyle = colors[i];
        ctx.shadowColor = colors[i];
        ctx.shadowBlur = 30;
        ctx.fillText(letters[i], startX + i * fontSize * 0.65, 0);
    }

    // Subtitle
    ctx.scale(1 / pulse, 1 / pulse);
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    ctx.fillText('⚠️ ¡ALERTA ROOMBA! ⚠️', 0, fontSize * 0.6);

    ctx.restore();
}

class RoombaCleaner {
    constructor() {
        this.pixelSize = 6;
        this.spriteW = 16;
        this.spriteH = 8;
        this.width = this.spriteW * this.pixelSize;
        this.height = this.spriteH * this.pixelSize;
        this.x = 0;
        this.y = 0;
        this.speed = 1.5;
        this.direction = 1;
        this.state = 'entering'; // entering, chasing, eating, leaving
        this.stateTimer = 0;
        this.done = false;
        this.poofParticles = [];
        // Top-down Roomba sprite (circle-ish, 16x8 for side view)
        // 1=dark body, 2=bumper, 3=button/light, 4=wheel
        this.sprite = [
            [0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0], // Bumper top
            [0, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 0, 0, 0], // Body
            [0, 0, 2, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 2, 0, 0], // Body + button
            [0, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4, 0], // Body + wheels
            [0, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4, 0], // Body + wheels
            [0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0], // Body
            [0, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 0, 0, 0], // Body
            [0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0]  // Bumper bottom
        ];
        this.colors = {
            1: '#2A2A2A', // Dark gray body
            2: '#555555', // Light gray bumper
            3: '#00FF00', // Green LED light
            4: '#111111'  // Black wheels
        };
    }

    init() {
        this.y = canvas.height - 100 - this.height + 30;
        // Enter from the opposite side of the dog
        if (walkingSpaniel) {
            if (walkingSpaniel.x > canvas.width / 2) {
                this.x = -this.width;
                this.direction = 1;
            } else {
                this.x = canvas.width + this.width;
                this.direction = -1;
            }
        } else {
            this.x = -this.width;
            this.direction = 1;
        }
        this.state = 'chasing';
        this.stateTimer = 0;
    }

    update() {
        this.stateTimer++;

        switch (this.state) {
            case 'chasing':
                if (walkingSpaniel && !dogEaten) {
                    // Chase the dog
                    const targetX = walkingSpaniel.x;
                    if (Math.abs(this.x - targetX) > 10) {
                        this.direction = targetX > this.x ? 1 : -1;
                        this.x += this.speed * this.direction;
                    } else {
                        // Caught the dog!
                        this.state = 'eating';
                        this.stateTimer = 0;
                        dogEaten = true;
                        // Create poof effect
                        for (let i = 0; i < 20; i++) {
                            this.poofParticles.push({
                                x: walkingSpaniel.x + walkingSpaniel.width / 2,
                                y: walkingSpaniel.y + walkingSpaniel.height / 2,
                                speedX: (Math.random() - 0.5) * 8,
                                speedY: (Math.random() - 0.5) * 8,
                                size: Math.random() * 10 + 5,
                                life: 1.0,
                                color: ['#FFFFFF', '#CCCCCC', '#888888', '#663300'][Math.floor(Math.random() * 4)]
                            });
                        }
                    }
                } else if (dogEaten || !walkingSpaniel) {
                    // No dog to chase, just leave
                    this.state = 'leaving';
                    this.stateTimer = 0;
                }
                // Timeout: if can't catch dog in ~15s, give up
                if (this.stateTimer > 900) {
                    this.state = 'leaving';
                    this.stateTimer = 0;
                }
                break;

            case 'eating':
                // Pause and vibrate to simulate eating
                this.x += Math.sin(this.stateTimer * 0.5) * 1;
                if (this.stateTimer > 90) { // ~1.5 seconds
                    this.state = 'leaving';
                    this.stateTimer = 0;
                    // Change LED to red after eating
                    this.colors[3] = '#FF0000';
                }
                break;

            case 'leaving':
                this.x += this.speed * 2 * this.direction;
                // Off screen?
                if (this.x > canvas.width + this.width || this.x < -this.width * 2) {
                    this.done = true;
                }
                break;
        }

        // Update poof particles
        for (let i = this.poofParticles.length - 1; i >= 0; i--) {
            const p = this.poofParticles[i];
            p.x += p.speedX;
            p.y += p.speedY;
            p.speedY += 0.1;
            p.life -= 0.025;
            p.size *= 0.97;
            if (p.life <= 0) {
                this.poofParticles.splice(i, 1);
            }
        }
    }

    draw() {
        ctx.save();
        const px = this.pixelSize;

        // Flip if going left
        if (this.direction === -1) {
            ctx.translate(this.x + this.width / 2, this.y);
            ctx.scale(-1, 1);
            ctx.translate(-this.width / 2, 0);
        } else {
            ctx.translate(this.x, this.y);
        }

        for (let r = 0; r < this.sprite.length; r++) {
            for (let c = 0; c < this.sprite[r].length; c++) {
                const val = this.sprite[r][c];
                if (val !== 0) {
                    ctx.fillStyle = this.colors[val];
                    ctx.fillRect(c * px, r * px, px, px);
                }
            }
        }

        ctx.restore();

        // Draw poof particles
        for (const p of this.poofParticles) {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

resizeCanvas();
animate();
