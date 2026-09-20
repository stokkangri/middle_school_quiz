(() => {
  const keys = { drive: 0, strafe: 0, turn: 0 };
  const pressed = new Set();
  let chassis = "mecanum"; // 'mecanum' | 'tank'
  let pattern = "x"; // 'x' | 'o' | 'flip-fr' (mecanum rollers)
  let demo = null;
  let demoT = 0;
  let sideways = null; // scripted path state
  let pose = { x: 0, y: 0, heading: 0 };
  const MOVE_PX_S = 160;
  const TURN_DEG_S = 90;
  const EDGE_PAD = 12;
  const GOAL_X = 140; // px right of field center
  const PATH_CW = "M 72 18 A 36 36 0 1 1 28 18";
  const PATH_CCW = "M 72 18 A 36 36 0 1 0 28 18";

  const MEC_IDS = ["fl", "fr", "bl", "br"];
  const TANK_IDS = ["t-fl", "t-ml", "t-bl", "t-fr", "t-mr", "t-br"];

  const angles = Object.fromEntries([...MEC_IDS, ...TANK_IDS].map((id) => [id, 0]));

  const el = {
    drive: document.getElementById("v-drive"),
    strafe: document.getElementById("v-strafe"),
    turn: document.getElementById("v-turn"),
    fl: document.getElementById("p-fl"),
    fr: document.getElementById("p-fr"),
    bl: document.getElementById("p-bl"),
    br: document.getElementById("p-br"),
    left: document.getElementById("p-left"),
    right: document.getElementById("p-right"),
    hint: document.getElementById("mode-hint"),
    vector: document.getElementById("bot-vector"),
    vectorLabel: document.getElementById("bot-vector-label"),
    arrow: document.querySelector(".bot-arrow"),
    robot: document.getElementById("robot"),
    field: document.querySelector(".field"),
    goal: document.getElementById("goal"),
    title: document.getElementById("page-title"),
    lede: document.getElementById("page-lede"),
    chassisNote: document.getElementById("chassis-note"),
    speedNote: document.getElementById("speed-note"),
    powersMec: document.getElementById("powers-mecanum"),
    powersTank: document.getElementById("powers-tank"),
    setMec: document.getElementById("set-mecanum"),
    setTank: document.getElementById("set-tank"),
    readoutStrafe: document.getElementById("readout-strafe"),
    btnStrafe: document.getElementById("btn-demo-strafe"),
    patternNote: document.getElementById("pattern-note"),
    patternPanel: document.getElementById("pattern-panel"),
  };

  const tankPowerEls = {
    "t-fl": document.getElementById("p-t-fl"),
    "t-ml": document.getElementById("p-t-ml"),
    "t-bl": document.getElementById("p-t-bl"),
    "t-fr": document.getElementById("p-t-fr"),
    "t-mr": document.getElementById("p-t-mr"),
    "t-br": document.getElementById("p-t-br"),
  };

  function wheelNodes(ids) {
    const out = {};
    for (const id of ids) {
      const wheel = document.querySelector(`[data-wheel="${id}"]`);
      out[id] = {
        spokes: wheel.querySelector(".spokes"),
        arc: wheel.querySelector(".arc-spin"),
        arrow: document.getElementById(`arrow-${id}`),
        bar: document.getElementById(`bar-${id}`),
      };
    }
    return out;
  }

  const mecWheels = wheelNodes(MEC_IDS);
  const tankWheels = wheelNodes(TANK_IDS);

  const lessons = {
    drive: document.getElementById("lesson-drive"),
    turn: document.getElementById("lesson-turn"),
    strafe: document.getElementById("lesson-strafe"),
    mix: document.getElementById("lesson-mix"),
    speeds: document.getElementById("lesson-speeds"),
    nstrafe: document.getElementById("lesson-nstrafe"),
    pattern: document.getElementById("lesson-pattern"),
  };

  function bindKey(code, on, off) {
    return { code, on, off };
  }

  const map = [
    bindKey("KeyW", () => (keys.drive = 1), () => keys.drive === 1 && (keys.drive = 0)),
    bindKey("ArrowUp", () => (keys.drive = 1), () => keys.drive === 1 && (keys.drive = 0)),
    bindKey("KeyS", () => (keys.drive = -1), () => keys.drive === -1 && (keys.drive = 0)),
    bindKey("ArrowDown", () => (keys.drive = -1), () => keys.drive === -1 && (keys.drive = 0)),
    bindKey("KeyD", () => (keys.strafe = 1), () => keys.strafe === 1 && (keys.strafe = 0)),
    bindKey("ArrowRight", () => (keys.strafe = 1), () => keys.strafe === 1 && (keys.strafe = 0)),
    bindKey("KeyA", () => (keys.strafe = -1), () => keys.strafe === -1 && (keys.strafe = 0)),
    bindKey("ArrowLeft", () => (keys.strafe = -1), () => keys.strafe === -1 && (keys.strafe = 0)),
    bindKey("KeyE", () => (keys.turn = 1), () => keys.turn === 1 && (keys.turn = 0)),
    bindKey("KeyL", () => (keys.turn = 1), () => keys.turn === 1 && (keys.turn = 0)),
    bindKey("KeyQ", () => (keys.turn = -1), () => keys.turn === -1 && (keys.turn = 0)),
    bindKey("KeyJ", () => (keys.turn = -1), () => keys.turn === -1 && (keys.turn = 0)),
  ];

  function onKeyDown(e) {
    if (e.repeat) return;
    const hit = map.find((m) => m.code === e.code);
    if (!hit) return;
    e.preventDefault();
    stopScripted();
    pressed.add(e.code);
    hit.on();
  }

  function onKeyUp(e) {
    const hit = map.find((m) => m.code === e.code);
    if (!hit) return;
    e.preventDefault();
    pressed.delete(e.code);
    hit.off();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", () => {
    pressed.clear();
    keys.drive = keys.strafe = keys.turn = 0;
  });

  function clearDemoButtons() {
    document.querySelectorAll("[data-demo]").forEach((b) => b.classList.remove("active"));
  }

  function stopScripted() {
    demo = null;
    sideways = null;
    keys.drive = keys.strafe = keys.turn = 0;
    clearDemoButtons();
    el.goal.hidden = true;
  }

  function resetPose() {
    pose = { x: 0, y: 0, heading: 0 };
  }

  document.querySelectorAll("[data-demo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-demo");
      if (mode === "stop") {
        stopScripted();
        resetPose();
        return;
      }
      if (mode === "sideways") {
        startSidewaysDemo();
        clearDemoButtons();
        btn.classList.add("active");
        return;
      }
      sideways = null;
      el.goal.hidden = true;
      demo = mode;
      demoT = 0;
      clearDemoButtons();
      btn.classList.add("active");
    });
  });

  document.querySelectorAll("[data-chassis]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setChassis(btn.getAttribute("data-chassis"));
      document.querySelectorAll("[data-chassis]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  document.querySelectorAll("[data-pattern]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (chassis !== "mecanum") return;
      setPattern(btn.getAttribute("data-pattern"));
      document.querySelectorAll("[data-pattern]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  function setPattern(next) {
    pattern = next || "x";
    el.robot.dataset.pattern = pattern;
    const notes = {
      x: "Faint <strong>X</strong> + striped rollers = correct assembly. Side forces add → strafe works.",
      o: "Faint <strong>O</strong> diamond + flipped stripes — common mistake. Side forces cancel.",
      "flip-fr": "Red <strong>FR</strong> stripes are reversed. One wrong wheel breaks clean strafe.",
    };
    el.patternNote.innerHTML = notes[pattern] || notes.x;
    window.dispatchEvent(
      new CustomEvent("patternchange", { detail: { pattern, chassis } })
    );
  }

  function motionFromPattern(drive, strafeCmd, turn) {
    if (chassis !== "mecanum") {
      return { drive, strafe: 0, turn };
    }
    if (pattern === "x") {
      return { drive, strafe: strafeCmd, turn };
    }
    if (pattern === "o") {
      // Side forces cancel; tiny scrub so kids see “almost nothing”
      return { drive, strafe: strafeCmd * 0.05, turn };
    }
    // FR flipped: partial strafe + coupled spin / crab
    return {
      drive: drive + strafeCmd * 0.15,
      strafe: strafeCmd * 0.35,
      turn: turn + strafeCmd * 0.55,
    };
  }

  function setChassis(next) {
    chassis = next;
    stopScripted();
    resetPose();
    el.robot.dataset.chassis = chassis;
    const isTank = chassis === "tank";
    el.setMec.hidden = isTank;
    el.setTank.hidden = !isTank;
    el.powersMec.hidden = isTank;
    el.powersTank.hidden = !isTank;
    el.readoutStrafe.classList.toggle("disabled", isTank);
    document.getElementById("strafe-key").classList.toggle("disabled", isTank);
    document.getElementById("strafe-key-r").classList.toggle("disabled", isTank);
    document.getElementById("hold-note").classList.toggle("disabled", isTank);
    el.btnStrafe.disabled = false;
    el.btnStrafe.title = isTank
      ? "Shows that strafe command does nothing on 6-wheel"
      : "";

    document.querySelectorAll(".mec-only").forEach((n) => {
      n.hidden = isTank;
    });
    document.querySelectorAll(".tank-only").forEach((n) => {
      n.hidden = !isTank;
    });
    if (el.patternPanel) el.patternPanel.hidden = isTank;

    if (isTank) {
      el.title.textContent = "6-wheel tank (goBILDA style)";
      el.lede.textContent =
        "Same drive & turn — but no strafe. Plain wheels cannot slide sideways.";
      el.chassisNote.innerHTML =
        "Tank drive: left motors vs right motors. <strong>Strafe is ignored.</strong>";
      el.speedNote.innerHTML =
        "Press <kbd>A</kbd>/<kbd>D</kbd> — nothing moves. Use <strong>Demo: sideways goal</strong> to see turn → drive → turn.";
    } else {
      el.title.textContent = "Mecanum wheels";
      el.lede.textContent =
        "Hold keys like a gamepad stick. Watch the wheels — and try roller patterns X, O, and FR flipped.";
      el.chassisNote.innerHTML =
        "Angled rollers let you <strong>strafe</strong> — but only if the pattern is <strong>X</strong>.";
      el.speedNote.innerHTML =
        "Try <strong>Roller pattern</strong> then Demo strafe. <strong>Demo: sideways goal</strong> works best on X.";
      setPattern(pattern);
    }
    window.dispatchEvent(new CustomEvent("chassischange", { detail: { chassis, pattern } }));
  }

  function startSidewaysDemo() {
    demo = null;
    keys.drive = keys.strafe = keys.turn = 0;
    resetPose();
    el.goal.hidden = false;
    el.goal.style.transform = `translate(${GOAL_X}px, 0)`;
    if (chassis === "mecanum") {
      if (pattern !== "x") {
        sideways = { kind: "mec-bad", phase: "try" };
        el.hint.textContent =
          pattern === "o"
            ? "O pattern: strafe command runs, but side forces cancel — GOAL stays hard to reach. Switch to X."
            : "FR flipped: strafe crabs/spins — messy path to GOAL. Switch to X for a clean slide.";
        lessons.pattern?.classList.add("live");
        return;
      }
      sideways = { kind: "mec", phase: "strafe" };
      el.hint.textContent = "Mecanum path (X pattern): strafe right to the GOAL (one move).";
    } else {
      sideways = { kind: "tank", phase: "turn1" };
      el.hint.textContent =
        "6-wheel path: turn right 90° → drive to GOAL → turn left 90° (no strafe).";
    }
    lessons.nstrafe.classList.add("live");
  }

  function clip(v) {
    return Math.max(-1, Math.min(1, v));
  }

  function powersMecanum(drive, strafe, turn) {
    return {
      fl: clip(drive + strafe + turn),
      bl: clip(drive - strafe + turn),
      fr: clip(drive - strafe - turn),
      br: clip(drive + strafe - turn),
    };
  }

  function powersTank(drive, turn) {
    const left = clip(drive + turn);
    const right = clip(drive - turn);
    return {
      left,
      right,
      "t-fl": left,
      "t-ml": left,
      "t-bl": left,
      "t-fr": right,
      "t-mr": right,
      "t-br": right,
    };
  }

  function fmt(n) {
    const s = n.toFixed(2);
    return (n >= 0 ? "+" : "") + s;
  }

  function angleDiff(a, b) {
    let d = ((a - b + 540) % 360) - 180;
    return d;
  }

  function updateSideways(dt) {
    keys.drive = keys.strafe = keys.turn = 0;
    if (!sideways) return;

    if (sideways.kind === "mec-bad") {
      // Keep trying strafe so kids see failure mode under current pattern
      keys.strafe = 0.85;
      lessons.pattern?.classList.add("live");
      return;
    }

    if (sideways.kind === "mec") {
      const dx = GOAL_X - pose.x;
      if (Math.abs(dx) < 4) {
        keys.strafe = 0;
        el.hint.textContent = "Arrived by strafing. Swap to 6-wheel and try the same demo.";
        sideways = { kind: "mec", phase: "done" };
        return;
      }
      keys.strafe = Math.sign(dx) * 0.85;
      return;
    }

    // tank: turn → drive → turn back
    if (sideways.phase === "turn1") {
      const err = angleDiff(90, pose.heading);
      if (Math.abs(err) < 3) {
        pose.heading = 90;
        sideways.phase = "drive";
        el.hint.textContent = "Step 2 · Drive forward toward the GOAL.";
        return;
      }
      keys.turn = Math.sign(err) * 0.7;
      el.hint.textContent = "Step 1 · Turn right ~90° to face the GOAL.";
      return;
    }
    if (sideways.phase === "drive") {
      const dx = GOAL_X - pose.x;
      // facing +90° (right): forward increases x
      if (Math.abs(dx) < 4) {
        pose.x = GOAL_X;
        sideways.phase = "turn2";
        el.hint.textContent = "Step 3 · Turn left ~90° to face FRONT again.";
        return;
      }
      keys.drive = 0.85;
      return;
    }
    if (sideways.phase === "turn2") {
      const err = angleDiff(0, pose.heading);
      if (Math.abs(err) < 3) {
        pose.heading = 0;
        sideways.phase = "done";
        el.hint.textContent =
          "Same GOAL — but three steps without strafe. Mecanum did it in one slide.";
        return;
      }
      keys.turn = Math.sign(err) * 0.7;
    }
  }

  function absUnequal(vals) {
    const mx = Math.max(...vals.map(Math.abs));
    const active = vals.map(Math.abs).filter((v) => v > 0.05);
    if (!active.length) return false;
    const mn = Math.min(...active);
    return mx > 0.08 && mx - mn > 0.2;
  }

  function highlightLesson(drive, strafe, turn, pVals) {
    Object.values(lessons).forEach((n) => n && n.classList.remove("live"));
    if (sideways) {
      lessons.nstrafe.classList.add("live");
      lessons.strafe.classList.add("live");
      return;
    }
    const ad = Math.abs(drive);
    const as_ = Math.abs(strafe);
    const at = Math.abs(turn);
    if (ad + as_ + at < 0.05) return;

    if (chassis === "tank" && as_ > 0.4 && as_ >= ad && as_ >= at) {
      lessons.strafe.classList.add("live");
      lessons.nstrafe.classList.add("live");
      return;
    }
    if (as_ >= ad && as_ >= at) {
      lessons.strafe.classList.add("live");
      if (chassis === "mecanum" && pattern !== "x") lessons.pattern?.classList.add("live");
    } else if (at >= ad && at >= as_) lessons.turn.classList.add("live");
    else if (ad >= as_ && ad >= at) lessons.drive.classList.add("live");
    if (ad > 0.05 && (as_ > 0.05 || at > 0.05)) lessons.mix.classList.add("live");
    else if (as_ > 0.05 && at > 0.05) lessons.mix.classList.add("live");
    if (absUnequal(pVals)) lessons.speeds.classList.add("live");
  }

  function updateHint(drive, strafe, turn) {
    if (sideways && sideways.phase !== "done" && sideways.kind !== "mec-bad") return;
    const ad = Math.abs(drive);
    const as_ = Math.abs(strafe);
    const at = Math.abs(turn);
    if (ad + as_ + at < 0.05 && !(sideways && sideways.phase === "done")) {
      el.hint.textContent =
        chassis === "tank"
          ? "6-wheel: drive & turn work. Strafe keys do nothing — try Demo: sideways goal."
          : "Press keys to drive — try Roller pattern X / O / FR flipped, then strafe.";
      return;
    }
    if (chassis === "tank" && as_ > 0.35 && as_ >= ad && as_ >= at) {
      el.hint.textContent =
        "Strafe command ignored — no mecanum rollers. Turn 90°, drive, turn back to move sideways.";
      return;
    }
    if (chassis === "mecanum" && as_ > 0.4 && as_ >= ad && as_ >= at) {
      if (pattern === "o") {
        el.hint.textContent =
          "O pattern: wheels spin for strafe, but side forces cancel — almost no slide.";
        return;
      }
      if (pattern === "flip-fr") {
        el.hint.textContent =
          "FR flipped: same strafe code, but motion crabs and spins — fix that one wheel.";
        return;
      }
      el.hint.textContent =
        "X pattern strafe: FL and BL spin opposite → fore/aft cancel → rollers push sideways.";
      return;
    }
    if (at > 0.4 && at >= ad) {
      el.hint.textContent = "Turn: left side opposite right side.";
      return;
    }
    if (ad > 0.4) {
      el.hint.textContent =
        chassis === "tank"
          ? "Drive: left and right sides same power — all six wheels roll together."
          : "Drive: all wheels help roll forward/back.";
      return;
    }
    el.hint.textContent = "Mixing commands — like TeleOp with the sticks.";
  }

  function updateVector(drive, effectiveStrafe, turn) {
    const mag = Math.hypot(effectiveStrafe, drive);
    const spinning = Math.abs(turn) > 0.15 && mag < 0.2;
    if (mag < 0.08 && !spinning) {
      el.vector.hidden = true;
      return;
    }
    el.vector.hidden = false;
    if (spinning) {
      el.vectorLabel.textContent = turn > 0 ? "turn CW" : "turn CCW";
      el.arrow.style.transform = `rotate(${turn > 0 ? 90 : -90}deg) scale(0.85)`;
      return;
    }
    const deg = (Math.atan2(effectiveStrafe, drive) * 180) / Math.PI;
    el.arrow.style.transform = `rotate(${deg}deg)`;
    if (Math.abs(effectiveStrafe) > Math.abs(drive) * 1.2) {
      el.vectorLabel.textContent = effectiveStrafe > 0 ? "strafe right" : "strafe left";
    } else if (Math.abs(drive) >= Math.abs(effectiveStrafe)) {
      el.vectorLabel.textContent = drive > 0 ? "drive forward" : "drive back";
    } else {
      el.vectorLabel.textContent = "diagonal";
    }
  }

  function setArc(node, power) {
    const path = node.querySelector(".arc-path");
    node.classList.remove("on", "fast", "slow");
    if (Math.abs(power) < 0.05) return;
    node.classList.add("on");
    path.setAttribute("d", power > 0 ? PATH_CW : PATH_CCW);
    const a = Math.abs(power);
    if (a > 0.7) node.classList.add("fast");
    else if (a < 0.4) node.classList.add("slow");
  }

  function setVelLabel(node, power) {
    if (Math.abs(power) < 0.05) {
      node.textContent = "";
      node.classList.remove("on");
      return;
    }
    node.textContent = "v" + fmt(power);
    node.classList.add("on");
  }

  function setBar(node, power) {
    node.style.width = `${Math.abs(power) * 100}%`;
  }

  function animateWheels(ids, mapNodes, p, dt) {
    const speed = 360;
    for (const id of ids) {
      const power = p[id];
      angles[id] += power * speed * dt;
      const w = mapNodes[id];
      w.spokes.style.transform = `rotate(${angles[id]}deg)`;
      setArc(w.arc, power);
      setVelLabel(w.arrow, power);
      setBar(w.bar, power);
    }
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (sideways) {
      updateSideways(dt);
    } else if (demo) {
      demoT += dt;
      const wave = Math.sin(demoT * 2.2);
      keys.drive = keys.strafe = keys.turn = 0;
      if (demo === "drive") keys.drive = wave >= 0 ? 0.85 : -0.85;
      if (demo === "strafe") keys.strafe = wave >= 0 ? 0.85 : -0.85;
      if (demo === "turn") keys.turn = wave >= 0 ? 0.75 : -0.75;
      if (demo === "curve") {
        keys.drive = 0.7;
        keys.turn = 0.45 * (wave >= 0 ? 1 : -1);
      }
    }

    const drive = keys.drive;
    const strafeCmd = keys.strafe;
    const turnCmd = keys.turn;
    // Wheel powers still use the TeleOp mix from commands (what code sends)
    const mixStrafe = chassis === "mecanum" ? strafeCmd : 0;
    // Ground motion depends on chassis + roller pattern
    const motion = motionFromPattern(drive, strafeCmd, turnCmd);
    const { drive: mDrive, strafe: mStrafe, turn: mTurn } = motion;

    el.drive.textContent = fmt(drive);
    el.strafe.textContent = fmt(strafeCmd);
    el.turn.textContent = fmt(turnCmd);

    let pVals = [];
    if (chassis === "mecanum") {
      const p = powersMecanum(drive, mixStrafe, turnCmd);
      el.fl.textContent = fmt(p.fl);
      el.fr.textContent = fmt(p.fr);
      el.bl.textContent = fmt(p.bl);
      el.br.textContent = fmt(p.br);
      animateWheels(MEC_IDS, mecWheels, p, dt);
      pVals = [p.fl, p.fr, p.bl, p.br];
    } else {
      const p = powersTank(drive, turnCmd);
      el.left.textContent = fmt(p.left);
      el.right.textContent = fmt(p.right);
      for (const id of TANK_IDS) tankPowerEls[id].textContent = fmt(p[id]);
      animateWheels(TANK_IDS, tankWheels, p, dt);
      pVals = [p.left, p.right];
    }

    const rad = (pose.heading * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    pose.x += (mStrafe * c + mDrive * s) * MOVE_PX_S * dt;
    pose.y += (-mDrive * c + mStrafe * s) * MOVE_PX_S * dt;
    pose.heading += mTurn * TURN_DEG_S * dt;

    const fieldR = el.field.getBoundingClientRect();
    const halfW = el.robot.offsetWidth / 2;
    const halfH = el.robot.offsetHeight / 2;
    const maxX = Math.max(0, fieldR.width / 2 - halfW - EDGE_PAD);
    const maxY = Math.max(0, fieldR.height / 2 - halfH - EDGE_PAD - 28);
    pose.x = Math.max(-maxX, Math.min(maxX, pose.x));
    pose.y = Math.max(-maxY, Math.min(maxY, pose.y));

    el.robot.style.transform = `translate(${pose.x}px, ${pose.y}px) rotate(${pose.heading}deg)`;

    updateVector(mDrive, mStrafe, mTurn);
    updateHint(drive, strafeCmd, turnCmd);
    highlightLesson(drive, strafeCmd, turnCmd, pVals);

    requestAnimationFrame(frame);
  }

  setChassis("mecanum");
  requestAnimationFrame(frame);
})();
