const TOTAL_ENERGY = 100;

// Subsystems state
const subsystems = {
    propulsion: { name: 'PROPULSION', value: 0 },
    defense: { name: 'DEFENSE', value: 0 },
    navigation: { name: 'NAVIGATION', value: 0 },
    communication: { name: 'COMMUNICATION', value: 0 }
};

// DOM Elements
const remainingEl = document.getElementById('energy-remaining');
const containerEl = document.getElementById('subsystems-container');
const statusTextEl = document.getElementById('global-status');
const alertBoxEl = document.getElementById('alert-box');
const arcReactorEl = document.getElementById('arc-reactor');
const tempDiagEl = document.getElementById('val-temp');
const screenGlowEl = document.getElementById('screen-glow');

// Initialize UI
function init() {
    renderSubsystems();
    updateUI();
    setInterval(updateTemp, 2000); // Random temp fluctuations for realism
}

// Render Subsystems
function renderSubsystems() {
    // Keep header
    const header = containerEl.querySelector('.panel-header').outerHTML;

    let html = header;

    for (const [key, sys] of Object.entries(subsystems)) {
        html += `
            <div class="subsystem-card" id="card-${key}">
                <div class="sys-header">
                    <span class="sys-name">${sys.name}</span>
                    <span class="sys-efficiency" id="eff-${key}">EFF: 0%</span>
                </div>
                <div class="bar-container">
                    <div class="bar-fill" id="bar-${key}"></div>
                </div>
                <div class="sys-controls">
                    <button class="btn btn-lg" onclick="adjust('${key}', -10)">-10</button>
                    <button class="btn" onclick="adjust('${key}', -1)">-</button>
                    <div class="value-display" id="val-${key}">0</div>
                    <button class="btn" onclick="adjust('${key}', 1)">+</button>
                    <button class="btn btn-lg" onclick="adjust('${key}', 10)">+10</button>
                </div>
            </div>
        `;
    }

    containerEl.innerHTML = html;
}

// Calculate Energy
function getUsedEnergy() {
    return Object.values(subsystems).reduce((sum, sys) => sum + sys.value, 0);
}

// Adjust Allocation
window.adjust = function (sysKey, amount) {
    const sys = subsystems[sysKey];
    const currentUsed = getUsedEnergy();
    const currentRemaining = TOTAL_ENERGY - currentUsed;

    let newValue = sys.value + amount;

    // Prevent negative subsystem value
    if (newValue < 0) {
        newValue = 0;
    }

    // Prevent over-allocation
    const difference = newValue - sys.value;
    if (difference > currentRemaining) {
        showError("WARNING: INSUFFICIENT REACTOR OUTPUT FOR OPERATION.");
        flashReactorError();
        return;
    }

    clearError();
    sys.value = newValue;
    updateUI();
};

// Smoothly interpolate animation speed based on remaining energy
function updateAnimationSpeed(remaining) {
    const rings = document.querySelectorAll('.ring');
    const pct = remaining / TOTAL_ENERGY; // 1.0 = full, 0.0 = depleted

    if (pct > 0.5) {
        // Normal — default CSS speeds
        rings.forEach(ring => ring.style.animationDuration = '');
    } else if (pct > 0) {
        // Smoothly interpolate: 6s at 50% → 0.8s near 0%
        const speed = 0.8 + (pct * 2) * 5.2; // pct*2 goes from 1→0 as pct goes 0.5→0
        rings.forEach(ring => ring.style.animationDuration = speed.toFixed(1) + 's');
    } else {
        // Depleted — very fast
        rings.forEach(ring => ring.style.animationDuration = '0.5s');
    }
}

// Smoothly interpolate screen glow color based on remaining energy
function updateScreenGlow(remaining) {
    const pct = remaining / TOTAL_ENERGY;

    if (pct > 0.5) {
        // Safe zone — no glow
        screenGlowEl.style.opacity = '0';
        screenGlowEl.style.background = 'transparent';
    } else if (pct > 0) {
        // Gradually intensifying glow: yellow → orange → red-orange
        const intensity = 1 - (pct * 2); // 0 at 50% → 1 at 0%

        // Green channel: 200 (yellow) → 40 (red-orange) as intensity increases
        const g = Math.floor(200 - intensity * 160);
        // Alpha: faint at start → strong near depletion
        const alpha = (0.08 + intensity * 0.4).toFixed(2);
        const alphaFade = (alpha * 0.35).toFixed(2);

        screenGlowEl.style.opacity = '1';
        screenGlowEl.style.background = `linear-gradient(to bottom,
            rgba(255, ${g}, 0, ${alpha}) 0%,
            rgba(255, ${g}, 0, ${alphaFade}) 18%,
            transparent 45%)`;
    } else {
        // Fully depleted — intense red glow
        screenGlowEl.style.opacity = '1';
        screenGlowEl.style.background = `linear-gradient(to bottom,
            rgba(255, 0, 60, 0.55) 0%,
            rgba(255, 0, 40, 0.3) 20%,
            rgba(255, 0, 30, 0.1) 45%,
            transparent 60%)`;
    }
}

// Update entire UI state
function updateUI() {
    const used = getUsedEnergy();
    const remaining = TOTAL_ENERGY - used;
    const magEl = document.getElementById('val-mag');

    // Update remaining number
    remainingEl.innerText = remaining;

    // Update individual systems
    for (const [key, sys] of Object.entries(subsystems)) {
        document.getElementById(`val-${key}`).innerText = sys.value;

        // Efficiency calculation (just for visual flair)
        const eff = Math.min(100, Math.floor((sys.value / 40) * 100));
        document.getElementById(`eff-${key}`).innerText = `EFF: ${eff}%`;

        // Bar width based on percentage of max (100 total capacity)
        const barWidth = (sys.value / TOTAL_ENERGY) * 100;
        const barFill = document.getElementById(`bar-${key}`);
        barFill.style.width = `${barWidth}%`;

        // Color code bars based on energy pull
        if (sys.value > 40) {
            barFill.style.background = 'var(--warning)';
            barFill.style.boxShadow = '0 0 10px var(--warning)';
        } else {
            barFill.style.background = 'var(--primary)';
            barFill.style.boxShadow = '0 0 10px var(--primary)';
        }
    }

    // Smooth screen glow & animation speed (interpolated)
    updateScreenGlow(remaining);
    updateAnimationSpeed(remaining);

    // Global Status Update — three states: optimal, low-energy, depleted
    if (remaining === 0) {
        // CRITICAL: Energy fully depleted — RED danger mode
        statusTextEl.innerText = "ENERGY DEPLETED";
        statusTextEl.className = "status-text danger";
        arcReactorEl.className = "arc-reactor danger";
        document.querySelector('.status-box').style.borderColor = "var(--danger)";
        document.querySelector('.status-box').style.background = "rgba(255, 0, 60, 0.15)";
        document.querySelector('.status-box').style.boxShadow = "0 0 15px var(--danger)";

        // MAG-FIELD → UNSTABLE with flicker
        magEl.innerText = "UNSTABLE";
        magEl.classList.add('mag-unstable');

        if (!alertBoxEl.classList.contains('error')) {
            alertBoxEl.innerText = "⚠ CRITICAL: REACTOR OUTPUT FULLY ALLOCATED. NO RESERVES.";
            alertBoxEl.style.borderColor = "var(--danger)";
            alertBoxEl.style.color = "var(--danger)";
        }
    } else if (remaining <= 30) {
        // LOW ENERGY: Yellow/orange warning
        statusTextEl.innerText = "LOW RESERVES";
        statusTextEl.className = "status-text warning";
        arcReactorEl.className = "arc-reactor warning";
        document.querySelector('.status-box').style.borderColor = "var(--warning)";
        document.querySelector('.status-box').style.background = "rgba(255, 183, 0, 0.1)";
        document.querySelector('.status-box').style.boxShadow = "0 0 10px var(--warning)";

        // MAG-FIELD → STABLE
        magEl.innerText = "STABLE";
        magEl.classList.remove('mag-unstable');

        if (!alertBoxEl.classList.contains('error')) {
            alertBoxEl.innerText = "CAUTION: REACTOR RESERVES BELOW 30%. MONITOR OUTPUT.";
            alertBoxEl.style.borderColor = "var(--warning)";
            alertBoxEl.style.color = "var(--warning)";
        }
    } else {
        // NORMAL: All systems optimal
        statusTextEl.innerText = "OPTIMAL";
        statusTextEl.className = "status-text optimal";
        arcReactorEl.className = "arc-reactor";
        document.querySelector('.status-box').style.borderColor = "var(--primary)";
        document.querySelector('.status-box').style.background = "rgba(0, 243, 255, 0.1)";
        document.querySelector('.status-box').style.boxShadow = "0 0 10px var(--primary-dim)";

        // MAG-FIELD → STABLE
        magEl.innerText = "STABLE";
        magEl.classList.remove('mag-unstable');

        if (!alertBoxEl.classList.contains('error')) {
            alertBoxEl.innerText = "ALL SYSTEMS NOMINAL. AWAITING INPUT.";
            alertBoxEl.style.borderColor = "var(--primary)";
            alertBoxEl.style.color = "var(--primary)";
        }
    }

    updateButtonsState(remaining);
}

// Disable Add buttons if no energy remains
function updateButtonsState(remaining) {
    for (const key of Object.keys(subsystems)) {
        const card = document.getElementById(`card-${key}`);
        const addBtnSmall = card.querySelector('.btn:nth-child(4)'); // +1
        const addBtnLarge = card.querySelector('.btn:nth-child(5)'); // +10

        addBtnSmall.disabled = (1 > remaining);
        addBtnLarge.disabled = (10 > remaining);
    }
}

function flashReactorError() {
    arcReactorEl.classList.add('warning');
    const core = document.querySelector('.core');
    const oldBg = core.style.background;
    const oldShadow = core.style.boxShadow;

    // Quick flash
    core.style.background = 'radial-gradient(circle, #fff 0%, var(--danger) 20%, var(--bg-dark) 80%)';
    core.style.boxShadow = '0 0 80px var(--danger-glow), inset 0 0 40px #fff';

    setTimeout(() => {
        core.style.background = '';
        core.style.boxShadow = '';
        updateUI(); // restores proper class state completely
    }, 400);
}

function showError(msg) {
    alertBoxEl.innerText = msg;
    alertBoxEl.classList.add('error');

    // Clear error after 3 seconds automatically
    if (window.errorTimeout) clearTimeout(window.errorTimeout);
    window.errorTimeout = setTimeout(() => {
        clearError();
    }, 3000);
}

function clearError() {
    alertBoxEl.classList.remove('error');
    alertBoxEl.style.borderColor = "var(--primary)";
    alertBoxEl.style.color = "var(--primary)";
    updateUI(); // Reset standard message based on capacity
}

function updateTemp() {
    const used = getUsedEnergy();
    const remaining = TOTAL_ENERGY - used;
    const pct = remaining / TOTAL_ENERGY;

    // Temp scales dramatically as energy is consumed
    // 100 remaining → ~3,250°K  |  50 remaining → ~4,000°K  |  0 remaining → ~5,200°K+
    const base = 3200 + Math.floor(used * 18);
    const noise = Math.floor(Math.random() * (remaining === 0 ? 200 : 50));
    const currentTemp = base + noise;
    tempDiagEl.innerText = `${currentTemp.toLocaleString()} °K`;
}

// Start
init();
