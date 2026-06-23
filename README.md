# 👁️ Advanced Eye Tracking AR

A real-time Augmented Reality experience that uses your webcam to track facial landmarks and render dynamic eye laser effects — powered entirely in the browser with no backend required.

---

## 🌐 Live Demo


---

## ✨ Features

- 👁️ Real-time iris & eye tracking via MediaPipe Face Mesh
- ⚡ Dynamic eye laser beams that follow your head direction
- 🌈 5 switchable visual themes (Rainbow, Cyberpunk, Lava, Ocean, Galaxy)
- 🟩 Matrix-style animated background that reacts to head movement
- 🔊 Ambient audio engine — hum frequency shifts with face motion
- 💥 Physics-based particle effects at beam tips
- 📊 Live HUD showing Face Detection status and FPS
- 🎨 Glassmorphism UI with smooth transitions
- 📱 Fully responsive — works on desktop and mobile browsers

---

## 📂 Project Structure

```
eye-tracking-ar/
├── index.html       
├── style.css        
└── script.js        
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 Canvas | Dual-layer rendering (background + effects) |
| CSS3 | Glassmorphism UI, layered canvas layout |
| JavaScript (ES6+) | Render loop, physics, audio, face processing |
| MediaPipe Face Mesh | 468+ facial landmark detection with iris refinement |
| Web Audio API | Reactive ambient sound engine |

---

## 🚀 How It Works

1. Click **"Dive In"** and grant camera permissions.
2. MediaPipe Face Mesh detects **468 facial landmarks** in real time.
3. Iris points (`468` left, `473` right) determine eye center positions.
4. Eye openness ratio (vertical / horizontal diameter) controls laser intensity.
5. Head pose (nose tip vs face center offset) determines laser beam direction.
6. Both eyes shoot **parallel beams** in the exact direction you face.
7. Head movement velocity drives **Matrix rain speed** and **audio pitch**.

---

## 🎨 Themes

| Theme | Description |
|---|---|
| 🌈 Rainbow | Full HSL color cycle |
| 🔴 Cyberpunk | Alternating red `#ff003c` and cyan `#00f0ff` |
| 🔥 Lava | Warm orange-red hues with animated brightness |
| 🌊 Ocean | Cool blue-teal spectrum |
| 🌌 Galaxy | Deep purple hues with sine-wave variation |

Switch themes live using the pill buttons at the bottom of the screen.

---

## ⚙️ Eye Laser Effect — Technical Details

```
Openness Ratio  = vertical eye height / horizontal eye width
Laser Intensity = clamp((openness − 0.12) / 0.22,  0, 1)
Beam Length     = 320px × intensity
Direction       = head facing direction (nose offset from face center)
```

Each beam is rendered in **3 layers**: outer bloom → mid glow → white-hot core, plus an iris dot and halo ring using Canvas2D `screen` composite blending.

---

# Clone Repository

```bash
https://github.com/your-username/AR-Eye-Tracking


---

## 🔮 Future Enhancements

- [ ] Blink detection to trigger special effects
- [ ] Multi-face support (up to 4 simultaneous faces)
- [ ] Gaze direction mapped to screen coordinates
- [ ] Mobile rear-camera support
- [ ] WebGL renderer for higher performance
- [ ] Shareable theme presets

---

## 🌐 Browser Compatibility

| Browser | Support |
|---|---|
| Chrome 88+ | ✅ Full support |
| Edge 88+ | ✅ Full support |
| Firefox | ⚠️ Limited (WebRTC permissions may vary) |
| Safari | ⚠️ Requires enabling camera permissions manually |

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Ashish Kumar Prajapati**
GitHub: https://github.com/codertheashish

---

⭐ If you found this project cool, consider giving it a star on GitHub!
```

---

