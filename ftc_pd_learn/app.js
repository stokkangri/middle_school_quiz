/* Steer Straight — diagonal path race + error graphs */

(() => {
  function wrapDeg(a) {
    while (a > 180) a -= 360;
    while (a < -180) a += 360;
    return a;
  }

  function headingToCanvasRad(headingDeg) {
    // 0° = toward +X (right); canvas y grows down
    return (headingDeg * Math.PI) / 180;
  }

  function angleToGoal(bot, goal) {
    const dx = goal.x - bot.x;
    const dy = goal.y - bot.y;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function createBot(x, y, color, label, kind) {
    return {
      x,
      y,
      heading: 0,
      prevError: 0,
      integral: 0,
      path: [{ x, y }],
      color,
      label,
      kind, // 'none' | 'p' | 'pd' | 'pid'
      done: false,
      miss: null,
      errHist: [],
      distHist: [],
    };
  }

  function stepBot(bot, goal, opts) {
    if (bot.done) return;

    const { kp, kd, ki, bias, skid, speed, dt } = opts;
    const desired = angleToGoal(bot, goal);
    const error = wrapDeg(desired - bot.heading);
    const dError = (error - bot.prevError) / Math.max(dt, 1e-3);

    let steer = 0;
    if (bot.kind === "none") {
      steer = 0;
    } else if (bot.kind === "p") {
      // Strong P → visible overshoot when noise kicks
      steer = kp * error;
    } else if (bot.kind === "pd") {
      steer = kp * error + kd * dError * 0.06;
    } else {
      bot.integral += error * dt;
      // Loose clamp so windup still shows in the graph
      bot.integral = Math.max(-120, Math.min(120, bot.integral));
      steer = kp * error + ki * bot.integral * 1.4 + kd * dError * 0.06;
    }

    bot.prevError = error;

    const maxTurn = 280;
    const turnRate = Math.max(-maxTurn, Math.min(maxTurn, steer * 60));
    const noise = (Math.random() * 2 - 1) * skid;
    // Angular bias (uneven motors / twist)
    bot.heading = wrapDeg(bot.heading + (turnRate + bias * 0.55 + noise) * dt);

    const rad = headingToCanvasRad(bot.heading);
    // Forward motion
    bot.x += Math.cos(rad) * speed * dt;
    bot.y += Math.sin(rad) * speed * dt;
    // Lateral slip (carpet push) — exaggerated, same for every bot
    // Perpendicular to current heading
    const slip = bias * 0.55; // px/s scaled via bias slider
    bot.x += Math.cos(rad + Math.PI / 2) * slip * dt;
    bot.y += Math.sin(rad + Math.PI / 2) * slip * dt;

    bot.path.push({ x: bot.x, y: bot.y });

    const dGoal = dist(bot, goal);
    const t = bot.errHist.length ? bot.errHist[bot.errHist.length - 1].t + dt : 0;
    bot.errHist.push({ t, e: error });
    bot.distHist.push({ t, d: dGoal });
    if (bot.errHist.length > 600) {
      bot.errHist.shift();
      bot.distHist.shift();
    }

    if (dGoal < 18) {
      bot.done = true;
      bot.miss = dGoal;
    } else if (t > 8) {
      // Timed out — record miss distance
      bot.done = true;
      bot.miss = dGoal;
    }
  }

  function drawField(ctx, w, h, start, goal) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#123048");
    g.addColorStop(1, "#071522");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let x = 40; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 40; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Ideal path S → G (any angle)
    ctx.strokeStyle = "rgba(61,186,122,0.65)";
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(goal.x, goal.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Start / goal markers
    ctx.fillStyle = "#3ec6c9";
    ctx.beginPath();
    ctx.arc(start.x, start.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8eef4";
    ctx.font = "700 13px Lexend, sans-serif";
    ctx.fillText("S", start.x - 4, start.y - 12);

    ctx.fillStyle = "#3dba7a";
    ctx.beginPath();
    ctx.arc(goal.x, goal.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8eef4";
    ctx.fillText("G", goal.x - 4, goal.y - 14);
  }

  function drawPath(ctx, bot) {
    if (bot.path.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = bot.color;
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = 2.75;
    ctx.lineJoin = "round";
    ctx.moveTo(bot.path[0].x, bot.path[0].y);
    for (let i = 1; i < bot.path.length; i++) ctx.lineTo(bot.path[i].x, bot.path[i].y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawRobot(ctx, bot) {
    const size = 14;
    ctx.save();
    ctx.translate(bot.x, bot.y);
    ctx.rotate(headingToCanvasRad(bot.heading));
    ctx.fillStyle = bot.color;
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.75, size * 0.7);
    ctx.lineTo(-size * 0.35, 0);
    ctx.lineTo(-size * 0.75, -size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawGraph(canvas, seriesList, yKey, yLabel, yRange) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#071522";
    ctx.fillRect(0, 0, w, h);

    // axes
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(48, 12);
    ctx.lineTo(48, h - 28);
    ctx.lineTo(w - 12, h - 28);
    ctx.stroke();

    // zero line for error
    if (yKey === "e") {
      const zeroY = 12 + ((yRange[1] - 0) / (yRange[1] - yRange[0])) * (h - 40);
      ctx.strokeStyle = "rgba(61,186,122,0.35)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(48, zeroY);
      ctx.lineTo(w - 12, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    let tMax = 0.001;
    seriesList.forEach((s) => {
      const hist = s.hist;
      if (hist.length) tMax = Math.max(tMax, hist[hist.length - 1].t);
    });

    seriesList.forEach((s) => {
      const hist = s.hist;
      if (hist.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      for (let i = 0; i < hist.length; i++) {
        const pt = hist[i];
        const x = 48 + (pt.t / tMax) * (w - 60);
        const v = pt[yKey];
        const y =
          12 + ((yRange[1] - v) / (yRange[1] - yRange[0])) * (h - 40);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    ctx.fillStyle = "#9db0c3";
    ctx.font = "12px Lexend, sans-serif";
    ctx.fillText(yLabel, 8, 16);
    ctx.fillText("0", 8, h - 14);
    ctx.fillText("time →", w - 70, h - 10);
  }

  // ——— Shared course geometry ———
  function courseFromAngle(w, h, angleDeg) {
    const cx = w * 0.5;
    const cy = h * 0.55;
    const len = Math.min(w, h) * 0.38;
    const rad = (angleDeg * Math.PI) / 180;
    // Start lower-leftish along the angle; goal opposite
    const start = {
      x: cx - Math.cos(rad) * len,
      y: cy - Math.sin(rad) * len,
    };
    const goal = {
      x: cx + Math.cos(rad) * len,
      y: cy + Math.sin(rad) * len,
    };
    return { start, goal, bearing: angleDeg };
  }

  const COLORS = {
    none: "#8b9aab",
    p: "#4ea1ff",
    pd: "#ffb347",
    pid: "#e879f9",
  };

  function visibleKinds(mode) {
    if (mode === "all") return ["none", "p", "pd", "pid"];
    if (mode === "ladder") return ["none", "p", "pd"];
    if (mode === "p-pd") return ["p", "pd"];
    if (mode === "pid-compare") return ["pd", "pid"];
    return ["none", "p", "pd"];
  }

  // ——— Hero ———
  const heroCanvas = document.getElementById("hero-canvas");
  if (heroCanvas) {
    const hctx = heroCanvas.getContext("2d");
    let heroAngle = 32;
    let heroCourse = courseFromAngle(heroCanvas.width, heroCanvas.height, heroAngle);
    let heroBots = [];
    let heroT = 0;

    function resetHero() {
      heroCourse = courseFromAngle(heroCanvas.width, heroCanvas.height, heroAngle);
      const s = heroCourse.start;
      heroBots = [
        createBot(s.x, s.y, COLORS.none, "none", "none"),
        createBot(s.x, s.y, COLORS.p, "P", "p"),
        createBot(s.x, s.y, COLORS.pd, "PD", "pd"),
      ];
      heroBots.forEach((b) => {
        b.heading = heroCourse.bearing;
      });
      heroT = 0;
    }

    resetHero();

    function heroFrame() {
      const dt = 0.018;
      heroT += dt;
      const opts = {
        kp: 1.8,
        kd: 1.0,
        ki: 0,
        bias: 55,
        skid: 25,
        speed: 100,
        dt,
      };
      heroBots.forEach((b) => stepBot(b, heroCourse.goal, opts));

      if (heroT > 5.5 || heroBots.every((b) => b.done)) resetHero();

      drawField(hctx, heroCanvas.width, heroCanvas.height, heroCourse.start, heroCourse.goal);
      heroBots.forEach((b) => {
        drawPath(hctx, b);
        drawRobot(hctx, b);
      });
      requestAnimationFrame(heroFrame);
    }
    requestAnimationFrame(heroFrame);
  }

  // ——— Lab ———
  const labCanvas = document.getElementById("lab-canvas");
  const errCanvas = document.getElementById("err-canvas");
  const distCanvas = document.getElementById("dist-canvas");
  const els = {
    mode: document.getElementById("mode"),
    pathAngle: document.getElementById("path-angle"),
    bias: document.getElementById("bias"),
    skid: document.getElementById("skid"),
    kp: document.getElementById("kp"),
    kd: document.getElementById("kd"),
    ki: document.getElementById("ki"),
    speed: document.getElementById("speed"),
    pathAngleOut: document.getElementById("path-angle-out"),
    biasOut: document.getElementById("bias-out"),
    skidOut: document.getElementById("skid-out"),
    kpOut: document.getElementById("kp-out"),
    kdOut: document.getElementById("kd-out"),
    kiOut: document.getElementById("ki-out"),
    speedOut: document.getElementById("speed-out"),
    reset: document.getElementById("reset-btn"),
    pause: document.getElementById("pause-btn"),
    hint: document.getElementById("lab-hint"),
    scoreline: document.getElementById("scoreline"),
  };

  let paused = false;
  let last = performance.now();
  let course = null;
  let bots = [];

  function spawnLab() {
    const angle = Number(els.pathAngle.value);
    course = courseFromAngle(labCanvas.width, labCanvas.height, angle);
    const kinds = visibleKinds(els.mode.value);
    const s = course.start;
    bots = kinds.map((k) => {
      const b = createBot(s.x, s.y, COLORS[k], k.toUpperCase(), k);
      b.heading = course.bearing; // start aimed along S→G, then bias pulls them off
      return b;
    });
    updateScore();
  }

  function updateScore() {
    if (!els.scoreline) return;
    const parts = bots.map((b) => {
      if (b.done) return `${b.label}: hit (~${b.miss.toFixed(0)} px)`;
      const d = dist(b, course.goal);
      return `${b.label}: ${d.toFixed(0)} px out`;
    });
    els.scoreline.textContent = parts.join(" · ");
  }

  function updateHint() {
    const bias = Number(els.bias.value);
    if (bias < 15) {
      els.hint.textContent =
        "Side push is low — differences look small. Raise constant side push to exaggerate drift.";
    } else {
      els.hint.textContent =
        "Gray (none) drifts off the dashed line. Blue (P) corrects but wiggles. Orange (PD) settles. Magenta (PID) may overshoot after windup.";
    }
  }

  function bindOutputs() {
    const map = [
      [els.pathAngle, els.pathAngleOut, (v) => `${v}°`],
      [els.bias, els.biasOut, (v) => v],
      [els.skid, els.skidOut, (v) => v],
      [els.kp, els.kpOut, (v) => Number(v).toFixed(2)],
      [els.kd, els.kdOut, (v) => Number(v).toFixed(2)],
      [els.ki, els.kiOut, (v) => Number(v).toFixed(2)],
      [els.speed, els.speedOut, (v) => v],
    ];
    map.forEach(([input, out, fmt]) => {
      const u = () => {
        out.textContent = fmt(input.value);
      };
      input.addEventListener("input", u);
      u();
    });
  }

  function labFrame(now) {
    const dt = Math.min(0.04, (now - last) / 1000);
    last = now;
    const ctx = labCanvas.getContext("2d");

    if (!paused && dt > 0) {
      const opts = {
        kp: Number(els.kp.value),
        kd: Number(els.kd.value),
        ki: Number(els.ki.value),
        bias: Number(els.bias.value),
        skid: Number(els.skid.value),
        speed: Number(els.speed.value),
        dt,
      };
      bots.forEach((b) => stepBot(b, course.goal, opts));
      updateScore();
    }

    drawField(ctx, labCanvas.width, labCanvas.height, course.start, course.goal);
    bots.forEach((b) => {
      drawPath(ctx, b);
      drawRobot(ctx, b);
    });

    // Graphs
    const seriesErr = bots.map((b) => ({ color: b.color, hist: b.errHist }));
    const seriesDist = bots.map((b) => ({ color: b.color, hist: b.distHist }));
    drawGraph(errCanvas, seriesErr, "e", "err °", [-90, 90]);
    drawGraph(distCanvas, seriesDist, "d", "dist", [0, 520]);

    requestAnimationFrame(labFrame);
  }

  if (labCanvas) {
    bindOutputs();
    spawnLab();
    updateHint();

    els.reset.addEventListener("click", spawnLab);
    els.pause.addEventListener("click", () => {
      paused = !paused;
      els.pause.textContent = paused ? "Resume" : "Pause";
    });
    els.mode.addEventListener("change", spawnLab);
    els.pathAngle.addEventListener("change", spawnLab);
    els.pathAngle.addEventListener("input", () => {
      // live rebuild when sliding angle
      spawnLab();
    });
    els.bias.addEventListener("input", updateHint);

    requestAnimationFrame(labFrame);
  }

  // Tabs
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.tab;
      document.querySelectorAll(".tab").forEach((t) => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        const show = panel.id === `panel-${name}`;
        panel.hidden = !show;
        panel.classList.toggle("active", show);
      });
    });
  });
})();
