/**
 * CHAX 2.0 — CONTROLADOR INTERACTIVO Y SIMULADOR TÁCTICO
 */

document.addEventListener("DOMContentLoaded", () => {
  initMeshCanvas();
  initSignalSimulator();
  initDeviceTabs();
  initPttPlayer();
});

/* ==========================================================================
   1. FONDO DE MALLA DINÁMICA (CANVAS OPTIMIZADO)
   ========================================================================== */
function initMeshCanvas() {
  const canvas = document.getElementById("meshBackground");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width, height;
  let nodes = [];
  const NODE_COUNT = window.innerWidth < 768 ? 30 : 65;
  const MAX_DISTANCE = 140;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 2 + 1.2,
      isRelay: Math.random() > 0.8
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAX_DISTANCE) {
          const alpha = (1 - dist / MAX_DISTANCE) * 0.22;
          ctx.strokeStyle = a.isRelay || b.isRelay 
            ? `rgba(0, 245, 155, ${alpha * 1.5})` 
            : `rgba(56, 189, 248, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fillStyle = n.isRelay ? "#00f59b" : "#38bdf8";
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  draw();
}

/* ==========================================================================
   2. SIMULADOR INTERACTIVO "CORTA LA SEÑAL"
   ========================================================================== */
function initSignalSimulator() {
  const signalToggle = document.getElementById("signalToggle");
  const standardStatus = document.getElementById("standardStatus");
  const chaxStatus = document.getElementById("chaxStatus");
  const standardChat = document.getElementById("standardChat");
  const chaxChat = document.getElementById("chaxChat");
  const simInput = document.getElementById("simInput");
  const simSendBtn = document.getElementById("simSendBtn");
  const labelOnline = document.querySelector(".toggle-label.online");
  const labelOffline = document.querySelector(".toggle-label.offline");

  if (!signalToggle) return;

  function updateSimulationState() {
    const isOffline = signalToggle.checked;

    if (isOffline) {
      if (labelOffline) {
        labelOffline.style.fontWeight = "850";
        labelOffline.style.color = "var(--solar-coral)";
      }
      if (labelOnline) {
        labelOnline.style.fontWeight = "500";
        labelOnline.style.color = "var(--text-dim)";
      }

      if (standardStatus) {
        standardStatus.className = "phone-status-badge status-failed";
        standardStatus.innerHTML = "🚫 Sin Señal / Colapsado";
      }

      if (chaxStatus) {
        chaxStatus.className = "phone-status-badge status-mesh";
        chaxStatus.innerHTML = "⚡ Malla Mesh P2P (3 Nodos)";
      }

      if (standardChat) {
        const outgoingStandard = standardChat.querySelectorAll(".chat-bubble.outgoing");
        outgoingStandard.forEach(b => {
          b.classList.add("failed-bubble");
          const meta = b.querySelector(".bubble-meta");
          if (meta) {
            meta.innerHTML = "<span>No entregado</span> <span class='bubble-check red'>⏱️ Esperando red</span>";
          }
        });
      }

      if (chaxChat) {
        const outgoingChax = chaxChat.querySelectorAll(".chat-bubble.outgoing");
        outgoingChax.forEach(b => {
          b.classList.remove("failed-bubble");
          const meta = b.querySelector(".bubble-meta");
          if (meta) {
            meta.innerHTML = "<span>Vía Salto Bluetooth Mesh</span> <span class='bubble-check green'>✓✓ Entregado</span>";
          }
        });
      }

    } else {
      if (labelOnline) {
        labelOnline.style.fontWeight = "850";
        labelOnline.style.color = "#38bdf8";
      }
      if (labelOffline) {
        labelOffline.style.fontWeight = "500";
        labelOffline.style.color = "var(--text-dim)";
      }

      if (standardStatus) {
        standardStatus.className = "phone-status-badge status-online";
        standardStatus.innerHTML = "🌐 5G / Servidor Cloud OK";
      }

      if (chaxStatus) {
        chaxStatus.className = "phone-status-badge status-online";
        chaxStatus.innerHTML = "🌐 Online (Nostr Relays)";
      }

      if (standardChat) {
        const outgoingStandard = standardChat.querySelectorAll(".chat-bubble.outgoing");
        outgoingStandard.forEach(b => {
          b.classList.remove("failed-bubble");
          const meta = b.querySelector(".bubble-meta");
          if (meta) {
            meta.innerHTML = "<span>Enviado</span> <span class='bubble-check'>✓✓</span>";
          }
        });
      }

      if (chaxChat) {
        const outgoingChax = chaxChat.querySelectorAll(".chat-bubble.outgoing");
        outgoingChax.forEach(b => {
          const meta = b.querySelector(".bubble-meta");
          if (meta) {
            meta.innerHTML = "<span>Vía Internet</span> <span class='bubble-check green'>✓✓</span>";
          }
        });
      }
    }
  }

  signalToggle.addEventListener("change", updateSimulationState);

  function sendMessage() {
    if (!simInput) return;
    const text = simInput.value.trim();
    if (!text) return;

    const isOffline = signalToggle.checked;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (standardChat) {
      const standardBubble = document.createElement("div");
      standardBubble.className = isOffline ? "chat-bubble outgoing failed-bubble" : "chat-bubble outgoing";
      standardBubble.innerHTML = `
        <p>${escapeHtml(text)}</p>
        <div class="bubble-meta">
          <span>${time}</span>
          <span class="${isOffline ? 'bubble-check red' : 'bubble-check'}">${isOffline ? '⏱️ Reintentando...' : '✓✓'}</span>
        </div>
      `;
      standardChat.appendChild(standardBubble);
      standardChat.scrollTop = standardChat.scrollHeight;
    }

    if (chaxChat) {
      const chaxBubble = document.createElement("div");
      chaxBubble.className = "chat-bubble outgoing";
      chaxBubble.innerHTML = `
        <p>${escapeHtml(text)}</p>
        <div class="bubble-meta">
          <span>${isOffline ? '⚡ Malla P2P (Salto #2)' : '🌐 Nostr'}</span>
          <span class="bubble-check green">✓✓ Entregado</span>
        </div>
      `;
      chaxChat.appendChild(chaxBubble);
      chaxChat.scrollTop = chaxChat.scrollHeight;

      if (isOffline) {
        setTimeout(() => {
          const replyBubble = document.createElement("div");
          replyBubble.className = "chat-bubble incoming";
          replyBubble.innerHTML = `
            <p>¡Recibido por Bluetooth! Te localicé en el mapa satelital Mapax a 45 metros 📍</p>
            <div class="bubble-meta">
              <span>Directo P2P</span>
              <span class="bubble-check green">✓✓</span>
            </div>
          `;
          chaxChat.appendChild(replyBubble);
          chaxChat.scrollTop = chaxChat.scrollHeight;
        }, 1200);
      }
    }

    simInput.value = "";
  }

  if (simSendBtn) {
    simSendBtn.addEventListener("click", sendMessage);
  }
  if (simInput) {
    simInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }

  updateSimulationState();
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ==========================================================================
   3. SHOWCASE MULTIDISPOSITIVO (IPHONE / IPAD / MAC)
   ========================================================================== */
function initDeviceTabs() {
  const tabBtns = document.querySelectorAll(".device-tab-btn");
  const carousel = document.getElementById("screenshotsCarousel");
  if (!tabBtns.length || !carousel) return;

  const isSubdir = window.location.pathname.includes('/2') || window.location.pathname.includes('/en') || window.location.pathname.includes('/pt');
  const basePath = isSubdir ? '../assets/screenshots/' : 'assets/screenshots/';

  const screenshotsData = {
    iphone: [
      { src: `${basePath}iphone/01_conversaciones.png`, caption: "01. Mensajería Instantánea Cifrada" },
      { src: `${basePath}iphone/02_chat_directo.png`, caption: "02. Chat E2EE & Notas de Voz PTT" },
      { src: `${basePath}iphone/03_mapax.png`, caption: "03. Mapax: Mapa Táctico Satelital Offline" },
      { src: `${basePath}iphone/04_radar_mesh.png`, caption: "04. Radar Mesh de Nodos Cercanos" },
      { src: `${basePath}iphone/05_ajustes_red.png`, caption: "05. Identidad Soberana sin Servidor" }
    ],
    ipad: [
      { src: `${basePath}ipad/01_conversaciones.png`, caption: "01. Vista Multipanel iPadOS" },
      { src: `${basePath}ipad/02_chat_directo.png`, caption: "02. Conversación de Alta Definición" },
      { src: `${basePath}ipad/03_mapax.png`, caption: "03. Mapax Táctico en Pantalla Completa" },
      { src: `${basePath}ipad/04_identidad.png`, caption: "04. Radar Mesh y Llaves Soberanas" },
      { src: `${basePath}ipad/05_ajustes_red.png`, caption: "05. Configuración de Red Soberana" }
    ],
    mac: [
      { src: `${basePath}mac/01_conversaciones.png`, caption: "01. Chax Nativo macOS para Escritorio", isMac: true },
      { src: `${basePath}mac/02_chat_directo.png`, caption: "02. Chat E2EE con Soporte de Teclado", isMac: true },
      { src: `${basePath}mac/03_mapax.png`, caption: "03. Mapax: Cartografía Satelital en Mac", isMac: true },
      { src: `${basePath}mac/04_radar_mesh.png`, caption: "04. Radar Mesh de Nodos de Escritorio", isMac: true },
      { src: `${basePath}mac/05_ajustes_red.png`, caption: "05. Ajustes y Bóveda Criptográfica", isMac: true }
    ]
  };

  function renderDeviceScreens(device) {
    const list = screenshotsData[device] || screenshotsData.iphone;
    carousel.innerHTML = "";

    list.forEach(item => {
      const el = document.createElement("div");
      el.className = item.isMac ? "screen-item mac-screen" : "screen-item";
      el.innerHTML = `
        <img src="${item.src}" alt="${item.caption}" loading="lazy" />
        <div class="screen-caption">${item.caption}</div>
      `;
      carousel.appendChild(el);
    });
  }

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const dev = btn.getAttribute("data-device");
      renderDeviceScreens(dev);
    });
  });

  renderDeviceScreens("iphone");
}

/* ==========================================================================
   4. REPRODUCTOR SIMULADO DE AUDIO PTT (WALKIE-TALKIE)
   ========================================================================== */
function initPttPlayer() {
  const playBtn = document.getElementById("pttPlayBtn");
  const bars = document.querySelectorAll(".audio-bar");
  const timerLabel = document.getElementById("pttTimer");
  if (!playBtn || !bars.length) return;

  let isPlaying = false;
  let playInterval = null;
  let seconds = 0;

  playBtn.addEventListener("click", () => {
    isPlaying = !isPlaying;

    if (isPlaying) {
      playBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      `;
      bars.forEach(b => b.classList.add("playing"));

      playTacticalTone();

      playInterval = setInterval(() => {
        seconds++;
        if (timerLabel) {
          const m = String(Math.floor(seconds / 60)).padStart(2, '0');
          const s = String(seconds % 60).padStart(2, '0');
          timerLabel.innerText = `${m}:${s}`;
        }
        if (seconds >= 6) {
          stopPtt();
        }
      }, 1000);
    } else {
      stopPtt();
    }
  });

  function stopPtt() {
    isPlaying = false;
    clearInterval(playInterval);
    seconds = 0;
    if (timerLabel) timerLabel.innerText = "00:06";
    playBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    `;
    bars.forEach(b => b.classList.remove("playing"));
  }

  function playTacticalTone() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Ignorar si el navegador no permite audio automático
    }
  }
}
