/**
 * CHAX — CONTROLADOR INTERACTIVO Y DIAGRAMAS TÁCTICOS
 */

document.addEventListener("DOMContentLoaded", () => {
  initMeshCanvas();
  initDeviceTabs();
  initPttPlayer();
  initDiagramSlideshow();
});

/* ==========================================================================
   1. FONDO DE MALLA: CLUSTERS VIVOS QUE SE ACERCAN Y DESCONECTAN
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
    const isMobile = width < 768;
    const numClusters = isMobile ? 3 : 5;
    const nodesPerCluster = isMobile ? 16 : 24;

    for (let c = 0; c < numClusters; c++) {
      // Centro del cluster con velocidad de desplazamiento propia
      const cx = (width * (c + 0.5)) / numClusters + (Math.random() - 0.5) * 60;
      const cy = (height * 0.2) + Math.random() * (height * 0.6);
      const cvx = (Math.random() - 0.5) * 0.45;
      const cvy = (Math.random() - 0.5) * 0.35;

      const clusterNodes = [];
      for (let i = 0; i < nodesPerCluster; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (isMobile ? 55 : 85);
        clusterNodes.push({
          relX: Math.cos(angle) * dist,
          relY: Math.sin(angle) * dist,
          relVx: (Math.random() - 0.5) * 0.25,
          relVy: (Math.random() - 0.5) * 0.25,
          maxDist: isMobile ? 65 : 95,
          radius: i === 0 ? 3.0 : (Math.random() * 1.8 + 1.2),
          isGateway: i === 0 || i === 1,
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist
        });
      }

      clusters.push({
        cx,
        cy,
        cvx,
        cvy,
        nodes: clusterNodes
      });
    }
  }

  resize();

  let frame = 0;
  function draw() {
    frame++;
    ctx.clearRect(0, 0, width, height);

    // 1. Actualizar posiciones de cada cluster y sus nodos
    for (let c = 0; c < clusters.length; c++) {
      const cluster = clusters[c];

      // Movimiento suave del centro del cluster
      cluster.cx += cluster.cvx;
      cluster.cy += cluster.cvy;

      // Rebote suave en los límites de la pantalla
      const margin = 80;
      if (cluster.cx < margin) {
        cluster.cx = margin;
        cluster.cvx = Math.abs(cluster.cvx);
      } else if (cluster.cx > width - margin) {
        cluster.cx = width - margin;
        cluster.cvx = -Math.abs(cluster.cvx);
      }
      if (cluster.cy < margin) {
        cluster.cy = margin;
        cluster.cvy = Math.abs(cluster.cvy);
      } else if (cluster.cy > height - margin) {
        cluster.cy = height - margin;
        cluster.cvy = -Math.abs(cluster.cvy);
      }

      // Actualizar nodos internos
      const nodes = cluster.nodes;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.relX += n.relVx;
        n.relY += n.relVy;

        // Mantener dentro del radio del cluster
        const currentDist = Math.hypot(n.relX, n.relY);
        if (currentDist > n.maxDist) {
          n.relVx *= -0.9;
          n.relVy *= -0.9;
        }

        n.x = cluster.cx + n.relX;
        n.y = cluster.cy + n.relY;
      }
    }

    // 2. Dibujar conexiones internas dentro de cada cluster
    for (let c = 0; c < clusters.length; c++) {
      const nodes = clusters[c].nodes;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 75) {
            const alpha = (1 - dist / 75) * 0.28;
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    // 3. Conexiones dinámicas entre clusters según proximidad
    // Cuando se aproximan (< proximityThreshold), se conectan y transfieren paquetes.
    // Cuando se alejan, se desconectan suavemente.
    const proximityThreshold = width < 768 ? 320 : 440;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const c1 = clusters[i];
        const c2 = clusters[j];
        const distClusters = Math.hypot(c1.cx - c2.cx, c1.cy - c2.cy);

        if (distClusters < proximityThreshold) {
          // Factor de proximidad de 0 a 1 (1 = muy cerca, 0 = al límite)
          const factor = 1 - (distClusters / proximityThreshold);

          // Buscar los nodos gateway o más cercanos entre ambos clusters
          const gw1 = c1.nodes.find(n => n.isGateway) || c1.nodes[0];
          const gw2 = c2.nodes.find(n => n.isGateway) || c2.nodes[0];

          // Dibujar puente inter-cluster con intensidad proporcional al acercamiento
          const lineAlpha = factor * 0.45;
          ctx.strokeStyle = `rgba(0, 245, 155, ${lineAlpha})`;
          ctx.lineWidth = 1.0 + factor * 1.2;
          ctx.setLineDash([6, 5]);
          ctx.beginPath();
          ctx.moveTo(gw1.x, gw1.y);
          ctx.lineTo(gw2.x, gw2.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Paquete de datos transferido a través del puente activo
          if (factor > 0.15) {
            const speed = 0.012;
            const t = ((frame * speed + (i * 0.3)) % 1);
            const px = gw1.x + (gw2.x - gw1.x) * t;
            const py = gw1.y + (gw2.y - gw1.y) * t;

            ctx.beginPath();
            ctx.arc(px, py, 3.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 245, 155, ${factor * 0.95})`;
            ctx.shadowColor = "#00f59b";
            ctx.shadowBlur = 8 * factor;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }
    }

    // 4. Dibujar nodos
    for (let c = 0; c < clusters.length; c++) {
      for (let i = 0; i < clusters[c].nodes.length; i++) {
        const n = clusters[c].nodes[i];
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        if (n.isGateway) {
          ctx.fillStyle = "#00f59b";
          ctx.shadowColor = "#00f59b";
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
          ctx.fill();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
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

