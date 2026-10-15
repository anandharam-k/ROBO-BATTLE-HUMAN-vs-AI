# ROBO BATTLE — HUMAN vs AI

A futuristic third-person 3D robot shooting game built with **Three.js, HTML5, CSS3, JavaScript**, a **Python Flask & SQLite** backend, an independent **Java validation engine**, and **MediaPipe Hands** webcam gesture recognition.

---

## 1. Game Concept

- **Protagonist**: Blue-armored combat robot equipped with a high-velocity dual-rail plasma rifle, boost thrusters, and deployable defensive energy dome.
- **The Opposition**: Exactly **15 AI Enemy Combat Droids** per match:
  - **5 Scouts**: Lightweight, agile drones (60 HP) with evasive flanking tactics.
  - **7 Assaults**: Balanced combat androids (100 HP) using cover and tactical burst blasters.
  - **3 Heavies**: Juggernaut mechs (220 HP) equipped with twin heavy cannons.
- **Duration**: Strict **5:00 minutes (300 seconds)** countdown timer.
- **Victory Condition**: Neutralize all 15 enemy droids before time expires while keeping player chassis health above zero.
- **Defeat Condition**: Chassis health reaches zero OR match timer expires while any enemy droid remains active.

---

## 2. Controls & Hand Gesture Protocol

### Desktop (Keyboard & Mouse)
- `W / A / S / D`: Combat translation
- `Mouse`: Camera look & crosshair aiming (Click anywhere to activate Pointer Lock)
- `Left Click`: Fire energy gun
- `Space`: Thruster Jump
- `Shift`: Sprint boost (consumes stamina)
- `R`: Reload energy magazine (24 rounds)
- `C` or `Right Click`: Defensive Stance (absorbs 50% damage)
- `Escape`: Pause / Resume battle

### Webcam Hand Gestures (MediaPipe Hands)
Toggle webcam tracking via the in-game PIP widget (bottom-right) or through the **Hand Gesture Setup** menu:
1. **Open Palm**: Enters weapon aiming mode.
2. **Pointing Index Finger**: Adjusts crosshair aiming pitch and yaw in real-time.
3. **Thumb & Index Finger Pinch**: Fires the energy weapon with automatic debouncing.
4. **Closed Fist**: Activates Defensive Stance, deploying a glowing cyan force-field that reduces incoming damage by 50%.

*Note: Keyboard and mouse controls remain active simultaneously at all times.*

---

## 3. Technology Stack & File Architecture

```
robo-battle/
├── index.html                 # HTML5 Game structure & HUD overlays
├── css/
│   ├── style.css             # Cyberpunk design tokens & buttons
│   ├── game.css              # Battle HUD, minimap, PIP preview, menus
│   └── responsive.css        # Adaptive viewports & touch handling
├── js/
│   ├── main.js               # Application bootstrap & audio unlock
│   ├── game.js               # Three.js scene, arena generation & main loop
│   ├── player.js             # 3D robot model, camera orbit & kinematics
│   ├── enemyAI.js            # 15 AI robots, 3 classes, FSM (patrol/chase/attack/evade/cover)
│   ├── weapons.js            # Projectile pooling, collision, muzzle flash & sparks
│   ├── collision.js          # Arena bounds, buildings, containers & line-of-sight raycasts
│   ├── timer.js              # Strict 300s countdown, freeze on pause & audio warning beeps
│   ├── ui.js                 # HUD update, 2D radar minimap canvas, modals & score sync
│   ├── gesture.js            # MediaPipe Hands webcam landmark classifier
│   └── audio.js              # Procedural Web Audio API sound synthesizer
├── backend/
│   ├── python/
│   │   ├── app.py            # Python Flask REST API service (with WSGI fallback)
│   │   ├── database.py       # SQLite database operations & CLI interface
│   │   └── requirements.txt  # Python dependencies (flask, flask-cors)
│   └── java/
│       ├── src/com/robobattle/
│       │   ├── MatchRecord.java        # Telemetry data model
│       │   ├── ScoreValidator.java     # Authoritative anti-cheat & scoring engine
│       │   ├── GameStatistics.java     # Aggregated career analytics
│       │   └── test/
│       │       └── ScoreValidatorTest.java # Unit tests for scoring & validation
│       ├── build.sh          # Compilation & test runner script
│       └── README.md         # Java module documentation
├── database/
│   └── robobattle.db         # Persistent SQLite database for player profiles & high scores
├── server.ts                 # Full-stack Express server bridging APIs to SQLite & Vite
└── README.md
```

---

## 4. How to Run Each Component

### A. Web Application (Frontend + Full-Stack Server)
```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev
```
Open `http://localhost:3000` in your browser.

### B. Python Flask Backend (Independent Mode)
The Python backend can run as an independent REST API:
```bash
cd backend/python

# (Optional) Install Flask & CORS
pip install -r requirements.txt

# Run the backend service on port 5000
python3 app.py
```
To test SQLite commands directly via CLI:
```bash
python3 database.py scores   # Outputs top high scores JSON
python3 database.py stats    # Outputs player stats JSON
```

### C. Java Validation Module
To compile and execute the Java scoring & anti-cheat unit tests:
```bash
cd backend/java

# Compile classes
mkdir -p bin
javac -d bin src/com/robobattle/*.java src/com/robobattle/test/*.java

# Run unit tests
java -cp bin com.robobattle.test.ScoreValidatorTest
```
Or simply run `./build.sh`.

---

## 5. Anti-Cheat & Authoritative Scoring Formula

```text
Score = (Scout_Kills * 150) + (Assault_Kills * 250) + (Heavy_Kills * 500)
        + (Time_Remaining_Seconds * 10)
        + (Accuracy_Percentage * 10)
        + (Victory_Bonus: 1000)
        + (Gesture_Mastery_Bonus: 500)
```
- **S-Tier**: >= 4,500 points
- **A-Tier**: >= 3,200 points
- **B-Tier**: >= 2,000 points
- **C-Tier**: < 2,000 points
- Server rejects any submission with kills > 15, time remaining > 300s, or impossible mathematical totals.
