/**
 * ROBO BATTLE — HUMAN vs AI
 * Real-time Webcam Hand Gesture Recognition via MediaPipe Hands
 */

export class GestureController {
  constructor(videoElement, canvasElement, onGesture) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.onGesture = onGesture; // callback(gestureEvent)

    this.isCameraActive = false;
    this.stream = null;
    this.hands = null;
    this.cameraUtils = null;

    this.lastGesture = 'IDLE';
    this.pinchCooldown = 0;
    this.aimSmoothing = { x: 0.5, y: 0.5 };
    this.prevIndexPos = null;

    this.HAND_CONNECTIONS = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
      [9, 13], [13, 14], [14, 15], [15, 16],// Ring
      [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
      [0, 17]                               // Palm base
    ];
  }

  // Requests webcam access and loads MediaPipe Hands
  async startWebcam() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Webcam API not supported in this browser.");
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: "user"
        },
        audio: false
      });

      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();
      this.isCameraActive = true;

      // Load MediaPipe scripts dynamically if not already loaded
      await this.ensureMediaPipeLoaded();
      this.initMediaPipeHands();

      return { success: true };
    } catch (err) {
      console.warn("Hand gesture webcam initialization failed:", err);
      this.isCameraActive = false;
      return { success: false, error: err.message };
    }
  }

  stopWebcam() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.isCameraActive = false;
    this.lastGesture = 'DISABLED';
    if (this.ctx && this.canvasElement) {
      this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
  }

  async ensureMediaPipeLoaded() {
    if (window.Hands) return;

    return new Promise((resolve, reject) => {
      const script1 = document.createElement('script');
      script1.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
      script1.crossOrigin = 'anonymous';

      const script2 = document.createElement('script');
      script2.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
      script2.crossOrigin = 'anonymous';

      script1.onload = () => {
        document.head.appendChild(script2);
      };
      script2.onload = () => resolve();
      script2.onerror = () => reject(new Error("Failed to load MediaPipe Hands from CDN"));
      document.head.appendChild(script1);
    });
  }

  initMediaPipeHands() {
    if (!window.Hands) return;

    this.hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });

    this.hands.onResults((results) => this.onHandResults(results));

    // Continuous frame processor
    const processFrame = async () => {
      if (this.isCameraActive && this.videoElement.readyState >= 2) {
        try {
          await this.hands.send({ image: this.videoElement });
        } catch (e) {
          // ignore transient frame skip
        }
      }
      if (this.isCameraActive) {
        requestAnimationFrame(processFrame);
      }
    };
    requestAnimationFrame(processFrame);
  }

  onHandResults(results) {
    if (!this.ctx || !this.canvasElement) return;

    const w = this.canvasElement.width;
    const h = this.canvasElement.height;
    this.ctx.clearRect(0, 0, w, h);

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.lastGesture = 'SEARCHING';
      this.notifyGesture({ type: 'NONE', label: 'NO HAND' });
      return;
    }

    const landmarks = results.multiHandLandmarks[0];

    // 1. Draw Hand Skeleton Overlay
    this.drawHandOverlay(landmarks, w, h);

    // 2. Classify Gesture
    const gesture = this.classifyGesture(landmarks);
    this.lastGesture = gesture.label;
    this.notifyGesture(gesture);
  }

  drawHandOverlay(landmarks, w, h) {
    this.ctx.save();
    // Hand connection lines
    this.ctx.strokeStyle = '#00f0ff';
    this.ctx.lineWidth = 2;

    for (const [i, j] of this.HAND_CONNECTIONS) {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x * w, p1.y * h);
      this.ctx.lineTo(p2.x * w, p2.y * h);
      this.ctx.stroke();
    }

    // Landmark joint dots
    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      this.ctx.fillStyle = (i === 4 || i === 8) ? '#ff2255' : '#00e5ff';
      this.ctx.beginPath();
      this.ctx.arc(p.x * w, p.y * h, (i === 4 || i === 8) ? 4.5 : 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  // Math-based geometric gesture classification
  classifyGesture(lm) {
    const wrist = lm[0];
    const thumbTip = lm[4];
    const indexTip = lm[8];
    const middleTip = lm[12];
    const ringTip = lm[16];
    const pinkyTip = lm[20];

    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

    // 1. Thumb & Index Pinch: Fire
    const pinchDist = dist(thumbTip, indexTip);
    if (pinchDist < 0.075) {
      return {
        type: 'PINCH_FIRE',
        label: 'FIRE!',
        aimX: indexTip.x,
        aimY: indexTip.y
      };
    }

    // 2. Closed Fist: Defensive Stance
    // Tips are all closer to wrist than middle joints
    const isCurled = (tipIdx, mcpIdx) => dist(lm[tipIdx], wrist) < dist(lm[mcpIdx], wrist) * 1.15;
    const allCurled = isCurled(8, 5) && isCurled(12, 9) && isCurled(16, 13) && isCurled(20, 17);

    if (allCurled) {
      return {
        type: 'CLOSED_FIST',
        label: 'DEFENSE',
        aimX: wrist.x,
        aimY: wrist.y
      };
    }

    // 3. Pointing Index Finger: Fine Aiming
    const indexExtended = dist(indexTip, wrist) > dist(lm[6], wrist) * 1.25;
    const othersCurled = isCurled(12, 9) && isCurled(16, 13) && isCurled(20, 17);

    if (indexExtended && othersCurled) {
      // Calculate delta movement for camera aiming
      let deltaX = 0;
      let deltaY = 0;
      if (this.prevIndexPos) {
        deltaX = (indexTip.x - this.prevIndexPos.x) * 2.5;
        deltaY = (indexTip.y - this.prevIndexPos.y) * 2.5;
      }
      this.prevIndexPos = { x: indexTip.x, y: indexTip.y };

      return {
        type: 'POINTING_AIM',
        label: 'AIMING',
        deltaX,
        deltaY,
        normX: indexTip.x,
        normY: indexTip.y
      };
    }

    // Reset previous pos if not pointing
    this.prevIndexPos = null;

    // 4. Open Palm: Aiming Mode
    const fingersExtended = !isCurled(8, 5) && !isCurled(12, 9) && !isCurled(16, 13) && !isCurled(20, 17);
    if (fingersExtended) {
      return {
        type: 'OPEN_PALM',
        label: 'AIM READY',
        aimX: lm[9].x,
        aimY: lm[9].y
      };
    }

    return {
      type: 'TRACKING',
      label: 'READY',
      aimX: lm[9].x,
      aimY: lm[9].y
    };
  }

  notifyGesture(event) {
    if (this.onGesture) {
      this.onGesture(event);
    }
  }
}
