/**
 * CHAX 2.0 — CONTROLADOR INTERACTIVO Y SIMULADOR TÁCTICO
 */

document.addEventListener("DOMContentLoaded", () => {
  initMeshCanvas();
  initSignalSimulator();
  initDeviceTabs();
  initPttPlayer();
  initDiagramSlideshow();
});

/* ==========================================================================
   1. FONDO DE MALLA POR CLUSTERS E ISLAS INTERCONECTADAS
   ========================================================================== */
function initMeshCanvas() {
  const canvas = document.getElementById("meshBackground");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width, height;
  let clusters = [];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initClusters();
  }
  window.addEventListener("resize", resize);

  function initClusters() {
    clusters = [];
    const numClusters = width < 768 ? 3 : 5;
    const nodesPerCluster = width < 768 ? 10 : 14;

    for (let c = 0; c < numClusters; c++) {
      const cx = (width * (c + 0.5)) / numClusters + (Math.random() - 0.5) * 80;
      const cy = (height * 0.15) + Math.random() * (height * 0.7);
      const clusterNodes = [];

      for (let i = 0; i < nodesPerCluster; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (width < 768 ? 65 : 100);
        clusterNodes.push({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          ox: cx + Math.cos(angle) * dist,
          oy: cy + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          radius: Math.random() * 2 + 1.2,
          isGateway: i === 0
        });
      }
      clusters.push({ cx, cy, nodes: clusterNodes });
    }
  }

  resize();

  let frame = 0;
  function draw() {
    frame++;
    ctx.clearRect(0, 0, width, height);

    // 1. Dibujar conexiones internas dentro de cada cluster
    for (let c = 0; c < clusters.length; c++) {
      const nodes = clusters[c].nodes;

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.x += a.vx;
        a.y += a.vy;

        // Mantener dentro del área del cluster
        const dx = a.x - a.ox;
        const dy = a.y - a.oy;
        if (Math.abs(dx) > 35) a.vx *= -1;
        if (Math.abs(dy) > 35) a.vy *= -1;

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 95) {
            const alpha = (1 - dist / 95) * 0.28;
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    // 2. Conectar clusters vecinos con puentes inter-cluster dinámicos
    for (let c = 0; c < clusters.length; c++) {
      const nextCluster = clusters[(c + 1) % clusters.length];
      const gwA = clusters[c].nodes.find(n => n.isGateway) || clusters[c].nodes[0];
      const gwB = nextCluster.nodes.find(n => n.isGateway) || nextCluster.nodes[0];

      const bridgeDist = Math.hypot(gwA.x - gwB.x, gwA.y - gwB.y);
      if (bridgeDist < 500) {
        const alpha = Math.max(0.12, (1 - bridgeDist / 500) * 0.4);
        ctx.strokeStyle = `rgba(0, 245, 155, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(gwA.x, gwA.y);
        ctx.lineTo(gwB.x, gwB.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Paquete luminoso viajando por el puente
        const t = ((frame * 0.012) % 1);
        const px = gwA.x + (gwB.x - gwA.x) * t;
        const py = gwA.y + (gwB.y - gwA.y) * t;
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#00f59b";
        ctx.shadowColor = "#00f59b";
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // 3. Dibujar nodos
    for (let c = 0; c < clusters.length; c++) {
      for (let i = 0; i < clusters[c].nodes.length; i++) {
        const n = clusters[c].nodes[i];
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.isGateway ? n.radius + 1.4 : n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.isGateway ? "#00f59b" : "#38bdf8";
        ctx.fill();
      }
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

/* ==========================================================================
   5. DIAPOSITIVAS INTERACTIVAS Y DIAGRAMAS DE PROPAGACIÓN
   ========================================================================== */
function initDiagramSlideshow() {
  const tabBtns = document.querySelectorAll(".diagram-tab-btn");
  const cards = document.querySelectorAll(".diagram-card");
  if (!tabBtns.length || !cards.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-diagram");
      
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      cards.forEach(card => {
        card.classList.remove("active");
        if (card.id === targetId) {
          card.classList.add("active");
        }
      });
    });
  });

  // Animación de pasos interactivos dentro de cada diagrama
  const stepperSteps = document.querySelectorAll(".stepper-step");
  stepperSteps.forEach(step => {
    step.addEventListener("click", () => {
      const parent = step.closest(".diagram-stepper");
      if (!parent) return;
      parent.querySelectorAll(".stepper-step").forEach(s => s.classList.remove("active"));
      step.classList.add("active");

      const stepNum = step.getAttribute("data-step");
      const card = step.closest(".diagram-card");
      if (card && stepNum) {
        highlightDiagramElements(card, stepNum);
      }
    });
  });

  function highlightDiagramElements(card, stepNum) {
    const svg = card.querySelector("svg");
    if (!svg) return;

    // Resaltar elementos correspondientes al paso
    const allStepEls = svg.querySelectorAll("[data-diag-step]");
    if (!allStepEls.length) return;

    allStepEls.forEach(el => {
      const elStep = el.getAttribute("data-diag-step");
      if (parseInt(elStep, 10) <= parseInt(stepNum, 10)) {
        el.style.opacity = "1";
        el.style.filter = elStep === stepNum ? "drop-shadow(0 0 8px #00f59b)" : "none";
      } else {
        el.style.opacity = "0.2";
        el.style.filter = "none";
      }
    });
  }
}

