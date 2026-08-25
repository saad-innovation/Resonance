(function(){
  const canvas = document.getElementById('waveCanvas');
  const ctx = canvas.getContext('2d');

  function resize(){
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // paint the very first frame solid so there's no flash-through to the page background
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  // Each "theme" is a small family of hues — picking one changes the
  // emotional temperature of every wave that's spawned from then on.
  const THEMES = {
    quantum: { label:'Quantum', hues:[190, 210, 260], accent:'hsl(205,85%,62%)' },
    plasma:  { label:'Plasma',  hues:[300, 320, 200], accent:'hsl(310,85%,62%)' },
    aurora:  { label:'Aurora',  hues:[150, 170, 190], accent:'hsl(165,75%,55%)' },
    ember:   { label:'Ember',   hues:[15, 35, 50],    accent:'hsl(30,90%,58%)' }
  };
  let currentTheme = 'quantum';

  const themesEl = document.getElementById('themes');
  Object.entries(THEMES).forEach(([key, t]) => {
    const dot = document.createElement('div');
    dot.className = 'theme-dot' + (key === currentTheme ? ' active' : '');
    dot.style.background = t.accent;
    dot.title = t.label;
    dot.addEventListener('click', () => {
      currentTheme = key;
      document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      document.documentElement.style.setProperty('--accent', t.accent);
    });
    themesEl.appendChild(dot);
  });
  document.documentElement.style.setProperty('--accent', THEMES[currentTheme].accent);

  let waves = [];          // every ripple currently alive on screen
  let freq = 5;             // how fast & far a wave travels
  let ringSpacing = 3;      // how far apart the 3 rings inside one wave sit ("wavelength")
  let soundOn = false;
  let autoOn = false;
  let autoTimer = null;
  let audioCtx = null;

  const freqSlider = document.getElementById('freq');
  const decaySlider = document.getElementById('decay');
  freqSlider.addEventListener('input', e => {
    freq = +e.target.value;
    document.getElementById('freqVal').textContent = freq;
  });
  decaySlider.addEventListener('input', e => {
    ringSpacing = +e.target.value;
    document.getElementById('decayVal').textContent = ringSpacing;
  });

  function spawnWave(x, y){
    const theme = THEMES[currentTheme];
    const hue = theme.hues[Math.floor(Math.random() * theme.hues.length)] + (Math.random() * 16 - 8);
    waves.push({
      x, y,
      radius: 0,
      speed: 1 + freq * 0.6,
      maxRadius: 90 + freq * 40,
      hue
    });
    if (soundOn) playPing(hue);
    document.getElementById('hint').style.display = 'none';
  }

  function handlePointer(e){
    e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    spawnWave(point.clientX, point.clientY);
  }
  canvas.addEventListener('mousedown', handlePointer);
  canvas.addEventListener('touchstart', handlePointer, { passive:false });

  function animate(){
    // a translucent fill over the previous frame is what gives waves their fading trail
    ctx.fillStyle = 'rgba(5,6,10,0.14)';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // 'lighter' makes overlapping waves brighten and blend into new colors —
    // a visual stand-in for how real waves add up at the points where they cross
    ctx.globalCompositeOperation = 'lighter';

    waves.forEach(w => {
      w.radius += w.speed;
      const alpha = Math.max(0, 1 - w.radius / w.maxRadius);

      // draw 3 concentric rings per wave so it reads as a wavefront, not a single line
      for (let i = 0; i < 3; i++){
        const r = w.radius - i * (12 - ringSpacing);
        if (r <= 0) continue;
        const ringAlpha = alpha * (1 - i / 3) * 0.85;
        if (ringAlpha <= 0) continue;
        ctx.beginPath();
        ctx.arc(w.x, w.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${w.hue}, 90%, 65%, ${ringAlpha})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = `hsla(${w.hue}, 90%, 65%, ${ringAlpha})`;
        ctx.shadowBlur = 14;
        ctx.stroke();
      }
      w.alpha = alpha;
    });

    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;

    waves = waves.filter(w => w.alpha > 0.015);
    document.getElementById('waveCount').textContent = waves.length;

    requestAnimationFrame(animate);
  }
  animate();

  // Auto mode — lets the playground breathe on its own, handy for a LinkedIn screen-recording
  const autoBtn = document.getElementById('autoBtn');
  autoBtn.addEventListener('click', () => {
    autoOn = !autoOn;
    autoBtn.classList.toggle('active', autoOn);
    if (autoOn){
      autoTimer = setInterval(() => {
        spawnWave(Math.random() * window.innerWidth, Math.random() * window.innerHeight);
      }, 750);
    } else {
      clearInterval(autoTimer);
    }
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    waves = [];
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  });

  const soundBtn = document.getElementById('soundBtn');
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? '🔊 Sound' : '🔇 Sound';
    soundBtn.classList.toggle('active', soundOn);
    if (soundOn && !audioCtx){
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  });

  function playPing(hue){
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 180 + hue;
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  }
})();