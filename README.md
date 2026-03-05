# Iron Eight — Arc Reactor Energy Distribution Panel

An **Iron Man**-inspired HUD interface that lets you manage reactor energy allocation across subsystems — complete with **real-time hand gesture control** using your webcam.

> *"Sometimes you gotta run before you can walk."* — Tony Stark

---

## Preview

A fully interactive Arc Reactor dashboard featuring glowing rings, animated diagnostics, and a 3-state reactor status system (Optimal → Low Reserves → Energy Depleted).

---

## Hand Gesture Control

Control the entire interface **without touching your keyboard or mouse** — just your fingers and your laptop camera.

Built with **MediaPipe Hands**, the system tracks your hand in real-time and translates finger positions into UI actions:

| Gesture | Action |
|---|---|
| **Point** (index finger) | Move the virtual cursor across the HUD |
| **Pinch** (thumb + index together) | Click buttons under the cursor |

### How to activate
1. Click the **✋ GESTURE CTRL** button in the top-left corner
2. Allow camera access when prompted
3. A live camera feed with hand landmarks appears in the bottom-left
4. Point at the `+` / `-` / `+10` / `-10` buttons and **pinch to click**

> No external installs required — MediaPipe runs entirely in the browser via CDN.

---

## Features

- **Arc Reactor HUD** — Animated rotating rings with a glowing core displaying remaining energy
- **4 Subsystems** — Propulsion, Defense, Navigation, Communication with independent energy allocation
- **3-State Status** — Smooth transitions between Optimal, Low Reserves, and Energy Depleted
- **Screen Glow** — Dynamic edge glow that shifts from yellow to red as energy depletes
- **MAG-FIELD Instability** — Flickering danger animation when reactor is fully allocated
- **Reactor Ring Speed** — Rings spin faster as energy reserves drop
- **Scanline & Vignette FX** — CRT-style overlay for that authentic Stark Industries feel
- **Hand Tracking Overlay** — Live webcam feed with landmark visualization

---

## Tech Stack

- **HTML / CSS / JavaScript** — Pure frontend, no build tools
- **MediaPipe Hands** — Browser-based hand landmark detection (21 keypoints)
- **Google Fonts** — Rajdhani + Share Tech Mono for the HUD aesthetic

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/A2Zcoder404/ironeight.git
cd ironeight

# Serve locally (camera API requires localhost or HTTPS)
npx serve -l 3000
```

Then open **http://localhost:3000** in your browser.

---

## License

MIT