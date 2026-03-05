/**
 * Hand Tracking Module for Arc Reactor Interface
 * Uses MediaPipe Hands to detect hand gestures via webcam.
 *
 * Gestures:
 *   - Index finger pointing  → virtual cursor
 *   - Pinch (thumb + index)  → click at cursor position
 */

const HandTracker = (() => {
    // State
    let isActive = false;
    let camera = null;
    let hands = null;
    let cursorEl = null;
    let feedCanvas = null;
    let feedCtx = null;
    let videoEl = null;
    let statusEl = null;
    let lastPinch = false;
    let hoveredElement = null;
    let lastClickTime = 0;
    const CLICK_COOLDOWN = 700; // ms between clicks
    const PINCH_THRESHOLD = 0.045; // distance threshold for pinch (tighter = harder to trigger)

    // Smoothing for cursor (reduces jitter)
    let smoothX = 0;
    let smoothY = 0;
    const SMOOTH_FACTOR = 0.18; // lower = smoother / less twitchy

    /**
     * Initialize the hand tracking system
     */
    function init() {
        createUI();
        setupMediaPipe();
    }

    /**
     * Create the camera feed overlay, cursor, and toggle button
     */
    function createUI() {
        // Toggle button in header area
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'hand-track-toggle';
        toggleBtn.className = 'hand-track-toggle';
        toggleBtn.innerHTML = '&#9995; GESTURE CTRL';
        toggleBtn.title = 'Toggle hand gesture control';
        toggleBtn.addEventListener('click', toggle);
        document.querySelector('.header-left').appendChild(toggleBtn);

        // Camera feed container
        const feedContainer = document.createElement('div');
        feedContainer.id = 'camera-feed';
        feedContainer.className = 'camera-feed hidden';
        feedContainer.innerHTML = `
            <div class="feed-header">
                <span class="feed-title">HAND TRACKING</span>
                <span class="feed-status" id="feed-status">OFFLINE</span>
            </div>
            <div class="feed-viewport">
                <video id="hand-video" playsinline></video>
                <canvas id="hand-canvas"></canvas>
            </div>
            <div class="gesture-indicator" id="gesture-indicator">AWAITING HAND...</div>
        `;
        document.querySelector('.hud-wrapper').appendChild(feedContainer);

        // Virtual cursor
        cursorEl = document.createElement('div');
        cursorEl.id = 'hand-cursor';
        cursorEl.className = 'hand-cursor hidden';
        cursorEl.innerHTML = '<div class="cursor-ring"></div><div class="cursor-dot"></div>';
        document.body.appendChild(cursorEl);

        // Cache elements
        feedCanvas = document.getElementById('hand-canvas');
        feedCtx = feedCanvas.getContext('2d');
        videoEl = document.getElementById('hand-video');
        statusEl = document.getElementById('feed-status');
    }

    /**
     * Setup MediaPipe Hands
     */
    function setupMediaPipe() {
        hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.6
        });

        hands.onResults(onResults);
    }

    /**
     * Toggle hand tracking on/off
     */
    async function toggle() {
        if (isActive) {
            stop();
        } else {
            await start();
        }
    }

    /**
     * Start the camera and hand tracking
     */
    async function start() {
        const feedContainer = document.getElementById('camera-feed');
        feedContainer.classList.remove('hidden');
        statusEl.textContent = 'STARTING...';
        statusEl.className = 'feed-status warning';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });

            videoEl.srcObject = stream;
            await videoEl.play();

            feedCanvas.width = videoEl.videoWidth || 640;
            feedCanvas.height = videoEl.videoHeight || 480;

            isActive = true;
            cursorEl.classList.remove('hidden');

            statusEl.textContent = 'ONLINE';
            statusEl.className = 'feed-status online';

            document.getElementById('hand-track-toggle').classList.add('active');

            processFrame();
        } catch (err) {
            console.error('Camera access denied:', err);
            statusEl.textContent = 'CAM DENIED';
            statusEl.className = 'feed-status error';
            feedContainer.classList.add('hidden');
        }
    }

    /**
     * Process each video frame through MediaPipe
     */
    async function processFrame() {
        if (!isActive) return;

        try {
            await hands.send({ image: videoEl });
        } catch (e) {
            // Silently handle frame processing errors
        }

        requestAnimationFrame(processFrame);
    }

    /**
     * Stop hand tracking
     */
    function stop() {
        isActive = false;

        if (videoEl && videoEl.srcObject) {
            videoEl.srcObject.getTracks().forEach(t => t.stop());
            videoEl.srcObject = null;
        }

        document.getElementById('camera-feed').classList.add('hidden');
        cursorEl.classList.add('hidden');
        cursorEl.classList.remove('pinching');

        statusEl.textContent = 'OFFLINE';
        statusEl.className = 'feed-status';

        document.getElementById('hand-track-toggle').classList.remove('active');
        document.getElementById('gesture-indicator').textContent = 'AWAITING HAND...';

        if (hoveredElement) {
            hoveredElement.classList.remove('hand-hover');
            hoveredElement = null;
        }
    }

    /**
     * Handle MediaPipe results
     */
    function onResults(results) {
        // Draw camera feed + landmarks on canvas
        drawFeed(results);

        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            document.getElementById('gesture-indicator').textContent = 'NO HAND DETECTED';
            cursorEl.classList.add('hidden');

            if (hoveredElement) {
                hoveredElement.classList.remove('hand-hover');
                hoveredElement = null;
            }
            return;
        }

        cursorEl.classList.remove('hidden');
        const landmarks = results.multiHandLandmarks[0];

        // Get finger positions
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];

        // --- Cursor position (index finger tip) ---
        // Mirror X because webcam is mirrored
        const rawX = (1 - indexTip.x) * window.innerWidth;
        const rawY = indexTip.y * window.innerHeight;

        // Apply smoothing
        smoothX = smoothX + (rawX - smoothX) * SMOOTH_FACTOR;
        smoothY = smoothY + (rawY - smoothY) * SMOOTH_FACTOR;

        cursorEl.style.left = `${smoothX}px`;
        cursorEl.style.top = `${smoothY}px`;

        // --- Detect pinch (thumb + index close together) ---
        const pinchDist = distance(thumbTip, indexTip);
        const isPinching = pinchDist < PINCH_THRESHOLD;

        // --- Gesture recognition ---
        let gesture = 'POINTING';

        if (isPinching) {
            gesture = 'PINCH → CLICK';
            cursorEl.classList.add('pinching');
        } else {
            cursorEl.classList.remove('pinching');
        }

        document.getElementById('gesture-indicator').textContent = gesture;

        // --- Hover detection ---
        updateHover(smoothX, smoothY);

        // --- Click action ---
        const now = Date.now();

        // Pinch → click the element under cursor
        if (isPinching && !lastPinch && now - lastClickTime > CLICK_COOLDOWN) {
            performClick(smoothX, smoothY);
            lastClickTime = now;
        }

        lastPinch = isPinching;
    }

    /**
     * Calculate distance between two landmarks
     */
    function distance(a, b) {
        return Math.sqrt(
            (a.x - b.x) ** 2 +
            (a.y - b.y) ** 2 +
            (a.z - b.z) ** 2
        );
    }

    /**
     * Draw the camera feed and hand landmarks on the overlay canvas
     */
    function drawFeed(results) {
        feedCtx.save();
        feedCtx.clearRect(0, 0, feedCanvas.width, feedCanvas.height);

        // Draw mirrored video
        feedCtx.translate(feedCanvas.width, 0);
        feedCtx.scale(-1, 1);
        feedCtx.drawImage(results.image, 0, 0, feedCanvas.width, feedCanvas.height);
        feedCtx.restore();

        // Draw landmarks
        if (results.multiHandLandmarks) {
            for (const hand of results.multiHandLandmarks) {
                drawLandmarks(hand);
                drawConnectors(hand);
            }
        }
    }

    /**
     * Draw hand landmarks as dots
     */
    function drawLandmarks(landmarks) {
        for (let i = 0; i < landmarks.length; i++) {
            const lm = landmarks[i];
            // Mirror X for display
            const x = (1 - lm.x) * feedCanvas.width;
            const y = lm.y * feedCanvas.height;

            feedCtx.beginPath();
            feedCtx.arc(x, y, 3, 0, 2 * Math.PI);
            feedCtx.fillStyle = i === 4 || i === 8 ? '#ff003c' : '#00f3ff';
            feedCtx.fill();
            feedCtx.strokeStyle = 'rgba(0,243,255,0.5)';
            feedCtx.lineWidth = 1;
            feedCtx.stroke();
        }
    }

    /**
     * Draw connections between landmarks
     */
    function drawConnectors(landmarks) {
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8],       // Index
            [0, 9], [9, 10], [10, 11], [11, 12],   // Middle
            [0, 13], [13, 14], [14, 15], [15, 16], // Ring
            [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
            [5, 9], [9, 13], [13, 17]               // Palm
        ];

        feedCtx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
        feedCtx.lineWidth = 1;

        for (const [a, b] of connections) {
            const ax = (1 - landmarks[a].x) * feedCanvas.width;
            const ay = landmarks[a].y * feedCanvas.height;
            const bx = (1 - landmarks[b].x) * feedCanvas.width;
            const by = landmarks[b].y * feedCanvas.height;

            feedCtx.beginPath();
            feedCtx.moveTo(ax, ay);
            feedCtx.lineTo(bx, by);
            feedCtx.stroke();
        }
    }

    /**
     * Highlight the element currently under the virtual cursor
     */
    function updateHover(x, y) {
        const el = document.elementFromPoint(x, y);

        if (hoveredElement && hoveredElement !== el) {
            hoveredElement.classList.remove('hand-hover');
        }

        if (el) {
            // Find closest interactive element (button or subsystem card)
            const btn = el.closest('.btn');
            const card = el.closest('.subsystem-card');
            const target = btn || card;

            if (target) {
                target.classList.add('hand-hover');
                hoveredElement = target;
            } else {
                if (hoveredElement) hoveredElement.classList.remove('hand-hover');
                hoveredElement = null;
            }
        }
    }

    /**
     * Simulate a click at the given screen coordinates
     */
    function performClick(x, y) {
        const el = document.elementFromPoint(x, y);
        if (el) {
            // Find the closest button
            const btn = el.closest('.btn');
            if (btn && !btn.disabled) {
                btn.click();
                flashCursor();
                showGestureFlash('CLICK!');
            }
        }
    }

    /**
     * Flash the cursor to indicate an action
     */
    function flashCursor() {
        cursorEl.classList.add('click-flash');
        setTimeout(() => cursorEl.classList.remove('click-flash'), 300);
    }

    /**
     * Show a floating gesture feedback near the cursor
     */
    function showGestureFlash(text) {
        const flash = document.createElement('div');
        flash.className = 'gesture-flash';
        flash.textContent = text;
        flash.style.left = `${smoothX + 20}px`;
        flash.style.top = `${smoothY - 20}px`;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 700);
    }

    // Public API
    return { init, toggle, start, stop };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    HandTracker.init();
});
