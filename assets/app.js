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
   1. FONDO DE MALLA: SIMULACIÓN REALISTA DE RED AD-HOC MÓVIL (MANET)
      Topología de corredores humanos, enjambres orgánicos, nodos ancla y saltos multi-hop
   ========================================================================== */
function initMeshCanvas() {
  const canvas = document.getElementById("meshBackground");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width, height;
  let clusters = [];
  let packets = [];
  let isMobile = false;
  let animationId = null;
  let isTabActive = true;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    isMobile = width < 768;
    initTopology();
  }
  window.addEventListener("resize", resize);

  document.addEventListener("visibilitychange", () => {
    isTabActive = !document.hidden;
    if (isTabActive && !animationId) {
      lastTime = performance.now();
      draw(lastTime);
    }
  });

  // Generación de topología realista de nodos móviles (MANET)
  function initTopology() {
    clusters = [];
    packets = [];

    const numClusters = isMobile ? 3 : 5;
    const topologies = ["CORRIDOR", "SWARM", "ANCHOR_BASE", "CORRIDOR", "SWARM"];

    for (let c = 0; c < numClusters; c++) {
      const type = topologies[c % topologies.length];
      const cx = (width * (c + 0.5)) / numClusters + (Math.random() - 0.5) * (width * 0.12);
      const cy = (height * 0.22) + Math.random() * (height * 0.56);
      
      // Velocidad general de deriva del cluster (enjambre desplazándose)
      const cvx = (Math.random() - 0.5) * 0.28;
      const cvy = (Math.random() - 0.5) * 0.22;

      // Orientación del corredor (eje preferente de movimiento humano)
      const angle = (Math.random() * 0.8 - 0.4) + (c % 2 === 0 ? 0.35 : -0.35);
      const semiMajor = isMobile ? (type === "CORRIDOR" ? 95 : 65) : (type === "CORRIDOR" ? 140 : 90);
      const semiMinor = isMobile ? (type === "CORRIDOR" ? 38 : 55) : (type === "CORRIDOR" ? 52 : 75);

      const nodesCount = isMobile ? (type === "ANCHOR_BASE" ? 12 : 15) : (type === "ANCHOR_BASE" ? 18 : 22);
      const clusterNodes = [];

      for (let i = 0; i < nodesCount; i++) {
        let isAnchor = false;
        let isGateway = false;

        // Distribución según la topología
        let u, v; // Coordenadas locales respecto a los semiejes
        if (type === "CORRIDOR") {
          // Dispersión a lo largo del corredor (densidad central con colas)
          u = (Math.random() + Math.random() - 1) * semiMajor;
          v = (Math.random() + Math.random() - 1) * semiMinor;
          if (i === 0) isGateway = true;
        } else if (type === "ANCHOR_BASE") {
          // Base fija con repetidor Mac / Basecamp en el centro
          if (i === 0) {
            u = 0;
            v = 0;
            isAnchor = true;
          } else {
            const r = Math.pow(Math.random(), 0.6) * semiMajor * 0.9;
            const theta = Math.random() * Math.PI * 2;
            u = Math.cos(theta) * r;
            v = Math.sin(theta) * r * 0.8;
            if (i === 1) isGateway = true;
          }
        } else {
          // Enjambre orgánico con 2 centros de gravitación local
          const subCenter = Math.random() > 0.5 ? -semiMajor * 0.35 : semiMajor * 0.35;
          u = subCenter + (Math.random() - 0.5) * semiMajor * 0.7;
          v = (Math.random() - 0.5) * semiMinor * 1.2;
          if (i === 0) isGateway = true;
        }

        // Rotar según la inclinación del corredor
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const relX = u * cosA - v * sinA;
        const relY = u * sinA + v * cosA;

        // Velocidad interna de los nodos (peatones caminando)
        const moveSpeed = isAnchor ? 0.02 : (Math.random() * 0.22 + 0.08);
        const moveDir = Math.random() * Math.PI * 2;

        clusterNodes.push({
          relX,
          relY,
          vx: Math.cos(moveDir) * moveSpeed,
          vy: Math.sin(moveDir) * moveSpeed,
          semiMajor,
          semiMinor,
          angle,
          isAnchor,
          isGateway,
          radius: isAnchor ? 3.8 : (isGateway ? 2.8 : (Math.random() * 1.5 + 1.2)),
          pulseRadius: 0,
          pulseAlpha: 0,
          x: cx + relX,
          y: cy + relY
        });
      }

      clusters.push({
        type,
        cx,
        cy,
        cvx,
        cvy,
        angle,
        semiMajor,
        semiMinor,
        nodes: clusterNodes
      });
    }
  }

  resize();

  // Disparador de paquetes multi-hop a través de la topología
  let packetTimer = 0;
  function triggerMultiHopPacket() {
    if (clusters.length < 2) return;
    
    // Buscar pares de clusters cercanos con enlace inter-cluster activo
    const proximityThreshold = isMobile ? 310 : 420;
    const candidates = [];

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const c1 = clusters[i];
        const c2 = clusters[j];
        const d = Math.hypot(c1.cx - c2.cx, c1.cy - c2.cy);
        if (d < proximityThreshold) {
          candidates.push({ c1, c2, d });
        }
      }
    }

    if (candidates.length > 0) {
      // Elegir un par de clusters enlazados
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      
      // Buscar el camino más corto de 3 o 4 nodos entre ambos clusters
      const gw1 = pick.c1.nodes.find(n => n.isGateway || n.isAnchor) || pick.c1.nodes[0];
      const gw2 = pick.c2.nodes.find(n => n.isGateway || n.isAnchor) || pick.c2.nodes[0];

      // Encontrar nodo interior en c1 y nodo interior en c2
      const inner1 = pick.c1.nodes[Math.floor(Math.random() * pick.c1.nodes.length)];
      const inner2 = pick.c2.nodes[Math.floor(Math.random() * pick.c2.nodes.length)];

      const path = [inner1, gw1, gw2, inner2];
      packets.push({
        path,
        currentSegment: 0,
        progress: 0,
        speed: 0.024 + Math.random() * 0.012,
        color: Math.random() > 0.3 ? "#00f59b" : "#38bdf8",
        size: 3.4
      });
    } else {
      // Disparo interno dentro de un mismo cluster (multi-salto local)
      const c = clusters[Math.floor(Math.random() * clusters.length)];
      if (c && c.nodes.length >= 4) {
        const n1 = c.nodes[0];
        const n2 = c.nodes[1];
        const n3 = c.nodes[2];
        const n4 = c.nodes[3];
        packets.push({
          path: [n1, n2, n3, n4],
          currentSegment: 0,
          progress: 0,
          speed: 0.03,
          color: "#00f59b",
          size: 3.2
        });
      }
    }
  }

  let lastTime = performance.now();

  function draw(currentTime) {
    if (!isTabActive) {
      animationId = null;
      return;
    }

    const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    ctx.clearRect(0, 0, width, height);

    // Temporizador de paquetes multi-salto
    packetTimer += dt;
    if (packetTimer > (isMobile ? 2.2 : 1.6)) {
      packetTimer = 0;
      if (packets.length < 5) {
        triggerMultiHopPacket();
      }
    }

    // 1. Actualizar posiciones de clusters y física de nodos
    for (let c = 0; c < clusters.length; c++) {
      const cluster = clusters[c];

      // Desplazamiento orgánico del centro del cúmulo
      cluster.cx += cluster.cvx;
      cluster.cy += cluster.cvy;

      // Rebote suave en los límites de pantalla
      const margin = 70;
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

      // Actualizar nodos del cluster con topología no circular
      const nodes = cluster.nodes;
      const cosA = Math.cos(cluster.angle);
      const sinA = Math.sin(cluster.angle);

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        if (!n.isAnchor) {
          n.relX += n.vx;
          n.relY += n.vy;

          // Proyectar coordenadas locales en el sistema alineado con el corredor
          const u = n.relX * cosA + n.relY * sinA;
          const v = -n.relX * sinA + n.relY * cosA;

          // Comprobar contorno elíptico / corredor irregular
          const normalizedDist = (u * u) / (n.semiMajor * n.semiMajor) + (v * v) / (n.semiMinor * n.semiMinor);

          // Si se aleja del corredor, atracción suave hacia el eje central
          if (normalizedDist > 1.0) {
            n.vx -= (n.relX / n.semiMajor) * 0.015;
            n.vy -= (n.relY / n.semiMinor) * 0.015;
          }
        }

        // Ripple/Pulso de nodo al retransmitir
        if (n.pulseAlpha > 0.01) {
          n.pulseRadius += 0.6;
          n.pulseAlpha *= 0.94;
        } else {
          n.pulseAlpha = 0;
        }

        n.x = cluster.cx + n.relX;
        n.y = cluster.cy + n.relY;
      }
    }

    // 2. Dibujar enlaces de radio RF intra-cluster (Budget de enlace RF realista)
    const rfRange = isMobile ? 80 : 100;
    for (let c = 0; c < clusters.length; c++) {
      const nodes = clusters[c].nodes;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);

          if (dist < rfRange) {
            // Modelo de atenuación de señal RF (de 1/d^2 a gradiente suave)
            const signalRatio = 1 - (dist / rfRange);
            const alpha = signalRatio * signalRatio * 0.32;

            ctx.lineWidth = signalRatio > 0.5 ? 1.0 : 0.7;
            
            // Enlace fuerte = Volt Green sólido; Enlace débil = Cyan punteado
            if (signalRatio > 0.55) {
              ctx.strokeStyle = `rgba(0, 245, 155, ${alpha})`;
              ctx.setLineDash([]);
            } else {
              ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.8})`;
              ctx.setLineDash([4, 4]);
            }

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }

    // 3. Puentes dinámicos entre clusters cercanos (Inter-Cluster RF Bridge)
    const proximityThreshold = isMobile ? 310 : 420;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const c1 = clusters[i];
        const c2 = clusters[j];
        const distClusters = Math.hypot(c1.cx - c2.cx, c1.cy - c2.cy);

        if (distClusters < proximityThreshold) {
          const factor = 1 - (distClusters / proximityThreshold);

          // Localizar los nodos perimetrales más cercanos entre ambos cúmulos
          let bestPair = null;
          let minD = Infinity;

          for (let na of c1.nodes) {
            for (let nb of c2.nodes) {
              const d = Math.hypot(na.x - nb.x, na.y - nb.y);
              if (d < minD) {
                minD = d;
                bestPair = { a: na, b: nb };
              }
            }
          }

          if (bestPair && minD < (isMobile ? 210 : 280)) {
            const bridgeAlpha = factor * 0.42;
            ctx.strokeStyle = `rgba(0, 245, 155, ${bridgeAlpha})`;
            ctx.lineWidth = 1.2 + factor * 1.2;
            ctx.setLineDash([6, 5]);
            ctx.beginPath();
            ctx.moveTo(bestPair.a.x, bestPair.a.y);
            ctx.lineTo(bestPair.b.x, bestPair.b.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }

    // 4. Paquetes multi-hop en tránsito
    for (let p = packets.length - 1; p >= 0; p--) {
      const pkt = packets[p];
      pkt.progress += pkt.speed;

      if (pkt.progress >= 1.0) {
        // Paquete alcanzó el siguiente nodo del salto
        pkt.progress = 0;
        const reachedNode = pkt.path[pkt.currentSegment + 1];
        if (reachedNode) {
          reachedNode.pulseRadius = 2.5;
          reachedNode.pulseAlpha = 0.8;
        }

        pkt.currentSegment++;
        if (pkt.currentSegment >= pkt.path.length - 1) {
          // Paquete entregado al destino final
          packets.splice(p, 1);
          continue;
        }
      }

      // Calcular posición actual sobre el segmento activo
      const startNode = pkt.path[pkt.currentSegment];
      const endNode = pkt.path[pkt.currentSegment + 1];
      if (startNode && endNode) {
        const px = startNode.x + (endNode.x - startNode.x) * pkt.progress;
        const py = startNode.y + (endNode.y - startNode.y) * pkt.progress;

        ctx.beginPath();
        ctx.arc(px, py, pkt.size, 0, Math.PI * 2);
        ctx.fillStyle = pkt.color;
        ctx.shadowColor = pkt.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // 5. Dibujar nodos tácticos
    for (let c = 0; c < clusters.length; c++) {
      const nodes = clusters[c].nodes;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        // Ripple de retransmisión
        if (n.pulseAlpha > 0.05) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + n.pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 245, 155, ${n.pulseAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Nodo Ancla / Basecamp (Rombo con halo distintivo)
        if (n.isAnchor) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0, 245, 155, 0.4)";
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
          ctx.fillStyle = "#00f59b";
          ctx.shadowColor = "#00f59b";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (n.isGateway) {
          // Gateway o nodo enlace prioritario
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
          ctx.fillStyle = "#00f59b";
          ctx.shadowColor = "#00f59b";
          ctx.shadowBlur = 5;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Nodo móvil estándar (cyan táctico sutil)
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(56, 189, 248, 0.78)";
          ctx.fill();
        }
      }
    }

    animationId = requestAnimationFrame(draw);
  }

  draw(performance.now());
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

  const lang = (document.documentElement.lang || 'es').toLowerCase();

  const captionsByLang = {
    es: {
      iphone: [
        "01. Mensajería Instantánea Cifrada",
        "02. Chat E2EE & Notas de Voz PTT",
        "03. Mapax: Mapa Táctico Satelital Offline",
        "04. Radar Mesh de Nodos Cercanos",
        "05. Identidad Soberana sin Servidor"
      ],
      ipad: [
        "01. Vista Multipanel iPadOS",
        "02. Conversación de Alta Definición",
        "03. Mapax Táctico en Pantalla Completa",
        "04. Radar Mesh y Llaves Soberanas",
        "05. Configuración de Red Soberana"
      ],
      mac: [
        "01. Chax Nativo macOS para Escritorio",
        "02. Chat E2EE con Soporte de Teclado",
        "03. Mapax: Cartografía Satelital en Mac",
        "04. Radar Mesh de Nodos de Escritorio",
        "05. Ajustes y Bóveda Criptográfica"
      ]
    },
    en: {
      iphone: [
        "01. Encrypted Instant Messaging",
        "02. E2EE Chat & Tactical PTT Voice",
        "03. Mapax: Offline Satellite Tactical Maps",
        "04. Mesh Radar of Nearby Peers",
        "05. Sovereign Identity Without Servers"
      ],
      ipad: [
        "01. Multi-Panel iPadOS View",
        "02. High-Definition Conversation",
        "03. Tactical Mapax Fullscreen",
        "04. Mesh Radar and Sovereign Keys",
        "05. Sovereign Network Configuration"
      ],
      mac: [
        "01. Native macOS Desktop Chax",
        "02. E2EE Chat with Full Keyboard Support",
        "03. Mapax: Satellite Cartography on Mac",
        "04. Mesh Radar for Desktop Peers",
        "05. Settings & Cryptographic Vault"
      ]
    },
    pt: {
      iphone: [
        "01. Mensagens Instantâneas Criptografadas",
        "02. Chat E2EE & Notas de Voz PTT",
        "03. Mapax: Mapa Tático Satelital Offline",
        "04. Radar Mesh de Nodos Próximos",
        "05. Identidade Soberana sem Servidor"
      ],
      ipad: [
        "01. Visualização Multipainel iPadOS",
        "02. Conversas em Alta Resolução",
        "03. Mapax Tático em Tela Cheia",
        "04. Radar Mesh e Chaves Soberanas",
        "05. Configuração de Rede Soberana"
      ],
      mac: [
        "01. Chax Nativo macOS para Desktop",
        "02. Chat E2EE com Suporte de Teclado",
        "03. Mapax: Cartografia Satelital no Mac",
        "04. Radar Mesh de Nodos Desktop",
        "05. Ajustes e Cofre Criptográfico"
      ]
    }
  };

  const currentCaps = captionsByLang[lang] || captionsByLang.es;

  const screenshotsData = {
    iphone: [
      { src: `${basePath}iphone/01_conversaciones.png`, caption: currentCaps.iphone[0] },
      { src: `${basePath}iphone/02_chat_directo.png`, caption: currentCaps.iphone[1] },
      { src: `${basePath}iphone/03_mapax.png`, caption: currentCaps.iphone[2] },
      { src: `${basePath}iphone/04_radar_mesh.png`, caption: currentCaps.iphone[3] },
      { src: `${basePath}iphone/05_ajustes_red.png`, caption: currentCaps.iphone[4] }
    ],
    ipad: [
      { src: `${basePath}ipad/01_conversaciones.png`, caption: currentCaps.ipad[0] },
      { src: `${basePath}ipad/02_chat_directo.png`, caption: currentCaps.ipad[1] },
      { src: `${basePath}ipad/03_mapax.png`, caption: currentCaps.ipad[2] },
      { src: `${basePath}ipad/04_identidad.png`, caption: currentCaps.ipad[3] },
      { src: `${basePath}ipad/05_ajustes_red.png`, caption: currentCaps.ipad[4] }
    ],
    mac: [
      { src: `${basePath}mac/01_conversaciones.png`, caption: currentCaps.mac[0], isMac: true },
      { src: `${basePath}mac/02_chat_directo.png`, caption: currentCaps.mac[1], isMac: true },
      { src: `${basePath}mac/03_mapax.png`, caption: currentCaps.mac[2], isMac: true },
      { src: `${basePath}mac/04_radar_mesh.png`, caption: currentCaps.mac[3], isMac: true },
      { src: `${basePath}mac/05_ajustes_red.png`, caption: currentCaps.mac[4], isMac: true }
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
  let isConnecting = false;
  let connectTimeout = null;
  let playInterval = null;
  let seconds = 0;

  playBtn.addEventListener("click", () => {
    if (isPlaying || isConnecting) {
      stopPtt();
      return;
    }

    // 1. Respuesta Háptica Táctil Inmediata
    if (navigator.vibrate) {
      try { navigator.vibrate([25, 35, 25]); } catch (e) {}
    }

    // 2. Indicador de Conexión (Spinner de Chirp de Radio)
    isConnecting = true;
    playBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 0.6s linear infinite;">
        <circle cx="12" cy="12" r="9" stroke="rgba(0, 245, 155, 0.25)"/>
        <path d="M12 3a9 9 0 0 1 9 9" stroke="#00f59b" stroke-linecap="round"/>
      </svg>
    `;

    playChirpTone();

    // 3. Conexión completada en 380ms -> Iniciar Audio
    connectTimeout = setTimeout(() => {
      isConnecting = false;
      isPlaying = true;

      playBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      `;
      bars.forEach(b => b.classList.add("playing"));

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
    }, 380);
  });

  function stopPtt() {
    isPlaying = false;
    isConnecting = false;
    clearTimeout(connectTimeout);
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

  function playChirpTone() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;

      // Primer pit (880 Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.09, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.1);

      // Segundo pit de enlace (1240 Hz en milisegundo 120)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1240, now + 0.12);
      gain2.gain.setValueAtTime(0.08, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.22);
    } catch (e) {
      // Ignorar si el navegador bloquea audio sin interacción de usuario
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

