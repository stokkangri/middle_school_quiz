/**
 * Snapshot carousel: wheel velocity vectors → resultant robot motion.
 * Separate slide decks for mecanum (4) vs goBILDA 6-wheel tank.
 */
(() => {
  // Robot frame: +fy = forward (drawn up), +fx = right
  const MECANUM_CASES = [
    {
      id: "m-drive-fwd",
      layout: "mecanum",
      title: "1 · Drive forward",
      caption:
        "All four mecanum wheels push the same way. Vectors point forward → resultant is straight ahead.",
      bullets: [
        "FL, FR, BL, BR all +drive (same sign)",
        "Nothing cancels — sum is large forward",
        "Robot translates forward (no spin)",
      ],
      wheels: { fl: 1, fr: 1, bl: 1, br: 1 },
      result: { fx: 0, fy: 1, spin: 0, label: "forward" },
    },
    {
      id: "m-drive-back",
      layout: "mecanum",
      title: "2 · Drive backward",
      caption: "All wheel arrows flip. Resultant flips with them — robot goes back.",
      bullets: [
        "Every wheel −drive",
        "Sum points backward",
        "Still no spin if left = right",
      ],
      wheels: { fl: -1, fr: -1, bl: -1, br: -1 },
      result: { fx: 0, fy: -1, spin: 0, label: "back" },
    },
    {
      id: "m-turn",
      layout: "mecanum",
      title: "3 · Turn (spin in place)",
      caption:
        "Left side forward, right side backward. Translation cancels — resultant is rotation.",
      bullets: [
        "Left wheels +turn, right wheels −turn",
        "Forward parts from left & right fight → net slide ≈ 0",
        "What remains: spin (CW here)",
      ],
      wheels: { fl: 1, fr: -1, bl: 1, br: -1 },
      result: { fx: 0, fy: 0, spin: 1, label: "turn CW" },
    },
    {
      id: "m-strafe-r",
      layout: "mecanum",
      title: "4 · Strafe right (mecanum)",
      caption:
        "Teal = wheel spin. Yellow = 45° roller. Purple = force on that 45° line. Side pieces add; fore/aft cancel → slide right.",
      bullets: [
        "FL & BR spin forward, FR & BL spin backward",
        "Purple arrows are the mecanum forces (not straight ahead)",
        "Orange resultant = pure strafe right",
      ],
      wheels: { fl: 1, fr: -1, bl: -1, br: 1 },
      rollers: { fl: 45, fr: -45, bl: -45, br: 45 },
      forces45: {
        fl: { dx: 1, dy: 1 },
        fr: { dx: 1, dy: -1 },
        bl: { dx: 1, dy: -1 },
        br: { dx: 1, dy: 1 },
      },
      showComponents: true,
      result: { fx: 1, fy: 0, spin: 0, label: "strafe right" },
      tall: true,
    },
    {
      id: "m-force45",
      layout: "mecanum",
      title: "5 · Why 45° rollers make side motion",
      caption:
        "Wheel spin (teal) is forward/back. Rollers are at 45°. The force each wheel can push (purple) sits on that 45° line — not straight ahead.",
      bullets: [
        "Yellow tick = roller angle (~45°)",
        "Purple arrow = force along the roller constraint",
        "That force has a side piece and a forward/back piece",
      ],
      wheels: { fl: 1, fr: -1, bl: -1, br: 1 },
      rollers: { fl: 45, fr: -45, bl: -45, br: 45 },
      // unit force directions (robot: +x right, +y forward/up on screen)
      forces45: {
        fl: { dx: 1, dy: 1 },
        fr: { dx: 1, dy: -1 },
        bl: { dx: 1, dy: -1 },
        br: { dx: 1, dy: 1 },
      },
      result: { fx: 1, fy: 0, spin: 0, label: "sideways" },
      tall: true,
    },
    {
      id: "m-force45-sum",
      layout: "mecanum",
      title: "6 · Add the 45° pieces → strafe",
      caption:
        "Split each purple 45° force into side + fore/aft. Fore/aft pieces cancel (red X). Side pieces all point the same way → orange resultant.",
      bullets: [
        "Dashed teal = fore/aft part of each 45° force",
        "Solid amber stubs = side part of each 45° force",
        "Cancel verticals · keep horizontals · robot strafes",
      ],
      wheels: { fl: 1, fr: -1, bl: -1, br: 1 },
      rollers: { fl: 45, fr: -45, bl: -45, br: 45 },
      forces45: {
        fl: { dx: 1, dy: 1 },
        fr: { dx: 1, dy: -1 },
        bl: { dx: 1, dy: -1 },
        br: { dx: 1, dy: 1 },
      },
      showComponents: true,
      result: { fx: 1, fy: 0, spin: 0, label: "strafe right" },
      tall: true,
    },
    {
      id: "m-strafe-l",
      layout: "mecanum",
      title: "7 · Strafe left (mirror)",
      caption: "Flip every wheel sign. 45° forces flip their side components — resultant slides left.",
      bullets: [
        "Same idea as strafe right, mirrored",
        "45° forces again; side parts now point left",
        "Fore/aft still cancels",
      ],
      wheels: { fl: -1, fr: 1, bl: 1, br: -1 },
      rollers: { fl: 45, fr: -45, bl: -45, br: 45 },
      forces45: {
        fl: { dx: -1, dy: -1 },
        fr: { dx: -1, dy: 1 },
        bl: { dx: -1, dy: 1 },
        br: { dx: -1, dy: -1 },
      },
      result: { fx: -1, fy: 0, spin: 0, label: "strafe left" },
      showComponents: true,
      tall: true,
    },
    {
      id: "m-curve",
      layout: "mecanum",
      title: "8 · Drive + turn (curve)",
      caption:
        "Left |power| ≠ right |power|. Resultant is forward and a little spin — the robot curves.",
      bullets: [
        "Mix: drive + turn → unequal left vs right",
        "Both sides still mostly forward → you translate",
        "Unequal sides → gentle turn while moving",
      ],
      wheels: { fl: 1, fr: 0.35, bl: 1, br: 0.35 },
      result: { fx: 0.15, fy: 0.85, spin: 0.45, label: "curve" },
    },
    {
      id: "m-diag",
      layout: "mecanum",
      title: "9 · Drive + strafe (diagonal)",
      caption:
        "Drive + strafe together. Fore/aft pieces do NOT fully cancel — leftover forward + leftover side = diagonal. Nothing “wrong”; both commands survive.",
      bullets: [
        "Wheel powers unequal (mix: drive + strafe)",
        "Purple 45° forces still split into side + fore/aft",
        "Unlike pure strafe: some fore/aft remains → orange points diagonally",
      ],
      wheels: { fl: 1, fr: 0.25, bl: 0.25, br: 1 },
      rollers: { fl: 45, fr: -45, bl: -45, br: 45 },
      // Magnitudes follow wheel |power|; directions from X + spin sense
      forces45: {
        fl: { dx: 1, dy: 1 },
        fr: { dx: 0.25, dy: -0.25 },
        bl: { dx: 0.25, dy: -0.25 },
        br: { dx: 1, dy: 1 },
      },
      showComponents: true,
      noFullCancel: true,
      result: { fx: 0.7, fy: 0.7, spin: 0, label: "diagonal" },
      tall: true,
    },
    {
      id: "m-pat-x",
      layout: "mecanum",
      title: "10 · Roller pattern X (correct)",
      caption:
        "Same strafe wheel speeds as always. Rollers form an X — 45° side components add → clean slide.",
      bullets: [
        "Yellow ticks = roller direction on each corner",
        "X layout makes sideways components reinforce",
        "This is the pattern your strafe code expects",
      ],
      wheels: { fl: 1, fr: -1, bl: -1, br: 1 },
      rollers: { fl: 45, fr: -45, bl: -45, br: 45 },
      forces45: {
        fl: { dx: 1, dy: 1 },
        fr: { dx: 1, dy: -1 },
        bl: { dx: 1, dy: -1 },
        br: { dx: 1, dy: 1 },
      },
      result: { fx: 1, fy: 0, spin: 0, label: "strafe OK" },
      showCancel: true,
    },
    {
      id: "m-pat-o",
      layout: "mecanum",
      title: "11 · Roller pattern O (wrong)",
      caption:
        "Identical motor commands — but rollers form an O. 45° side pieces fight each other → resultant ≈ 0.",
      bullets: [
        "Code can be right and the bot still won’t strafe",
        "O is a common assembly mistake",
        "Drive & turn still mostly work; strafe does not",
      ],
      wheels: { fl: 1, fr: -1, bl: -1, br: 1 },
      rollers: { fl: -45, fr: 45, bl: 45, br: -45 },
      forces45: {
        fl: { dx: -1, dy: 1 },
        fr: { dx: -1, dy: -1 },
        bl: { dx: -1, dy: -1 },
        br: { dx: -1, dy: 1 },
      },
      result: { fx: 0, fy: 0, spin: 0, label: "no strafe" },
      ghostStrafe: true,
      showCancel: true,
      showComponents: true,
      tall: true,
    },
    {
      id: "m-pat-flip",
      layout: "mecanum",
      title: "12 · One wheel flipped (FR)",
      caption:
        "Three wheels match X; FR roller is reversed. 45° sum is no longer pure sideways — crab + spin.",
      bullets: [
        "Red FR tick = the mistake",
        "Vectors no longer sum to pure sideways",
        "Fix: remount that one wheel to restore the X",
      ],
      wheels: { fl: 1, fr: -1, bl: -1, br: 1 },
      rollers: { fl: 45, fr: 45, bl: -45, br: 45, bad: "fr" },
      forces45: {
        fl: { dx: 1, dy: 1 },
        fr: { dx: -1, dy: -1 },
        bl: { dx: 1, dy: -1 },
        br: { dx: 1, dy: 1 },
      },
      result: { fx: 0.35, fy: 0.15, spin: 0.55, label: "crab + spin" },
      showComponents: true,
      tall: true,
    },
  ];

  // goBILDA-style 6-wheel: LEFT trio shares power, RIGHT trio shares power
  const TANK_CASES = [
    {
      id: "t-drive-fwd",
      layout: "tank",
      title: "1 · Drive forward (6-wheel)",
      caption:
        "All six wheels: left three and right three share the same forward power. Resultant = straight ahead.",
      bullets: [
        "LEFT = RIGHT = +drive",
        "FL, ML, BL match · FR, MR, BR match",
        "No rollers needed — plain traction rolls forward",
      ],
      wheels: { fl: 1, ml: 1, bl: 1, fr: 1, mr: 1, br: 1 },
      result: { fx: 0, fy: 1, spin: 0, label: "forward" },
    },
    {
      id: "t-drive-back",
      layout: "tank",
      title: "2 · Drive backward (6-wheel)",
      caption: "Both sides reverse together. Resultant flips backward.",
      bullets: [
        "LEFT = RIGHT = −drive",
        "All six arrows point back",
        "Still no spin when sides match",
      ],
      wheels: { fl: -1, ml: -1, bl: -1, fr: -1, mr: -1, br: -1 },
      result: { fx: 0, fy: -1, spin: 0, label: "back" },
    },
    {
      id: "t-turn",
      layout: "tank",
      title: "3 · Turn / spin (6-wheel)",
      caption:
        "Left side one way, right side the other. Forward parts cancel — resultant is rotation in place.",
      bullets: [
        "LEFT = +turn · RIGHT = −turn",
        "All three left wheels match each other",
        "Tank turn works the same idea as mecanum turn",
      ],
      wheels: { fl: 1, ml: 1, bl: 1, fr: -1, mr: -1, br: -1 },
      result: { fx: 0, fy: 0, spin: 1, label: "turn CW" },
    },
    {
      id: "t-no-strafe",
      layout: "tank",
      title: "4 · Strafe does not work",
      caption:
        "Pressing A/D asks for sideways motion, but there are no angled rollers. Wheel powers stay 0 → resultant = 0.",
      bullets: [
        "Tank mix ignores strafe (LEFT/RIGHT from drive+turn only)",
        "Dashed orange arrow = what you wanted",
        "Solid result: no slide — robot stays put",
      ],
      wheels: { fl: 0, ml: 0, bl: 0, fr: 0, mr: 0, br: 0 },
      result: { fx: 0, fy: 0, spin: 0, label: "no motion" },
      ghostStrafe: true,
    },
    {
      id: "t-curve",
      layout: "tank",
      title: "5 · Drive + turn (curve)",
      caption:
        "LEFT |power| ≠ RIGHT |power|. All three left wheels match; right trio is slower — robot curves.",
      bullets: [
        "LEFT = drive + turn · RIGHT = drive − turn",
        "Unequal sides → translate and gently spin",
        "Same idea as a car taking a corner",
      ],
      wheels: { fl: 1, ml: 1, bl: 1, fr: 0.35, mr: 0.35, br: 0.35 },
      result: { fx: 0.15, fy: 0.85, spin: 0.45, label: "curve" },
    },
    {
      id: "t-sideways-path",
      layout: "tank",
      title: "6 · Reach a side goal without strafe",
      caption:
        "To end up beside where you started: turn 90° → drive forward → turn back. Three steps instead of one slide.",
      bullets: [
        "Step A: spin so the nose faces the goal",
        "Step B: drive (all six roll forward)",
        "Step C: spin to face original heading again",
      ],
      wheels: { fl: 1, ml: 1, bl: 1, fr: 1, mr: 1, br: 1 },
      result: { fx: 0, fy: 1, spin: 0, label: "drive after turn" },
      pathHint: true,
    },
  ];

  const wrap = document.getElementById("vg-slide-wrap");
  const dots = document.getElementById("vg-dots");
  const title = document.getElementById("vg-title");
  const caption = document.getElementById("vg-caption");
  const bullets = document.getElementById("vg-bullets");
  const btnPrev = document.getElementById("vg-prev");
  const btnNext = document.getElementById("vg-next");
  const btnPause = document.getElementById("vg-pause");
  const galleryLede = document.querySelector(".vg-lede");

  if (!wrap) return;

  let chassis = "mecanum";
  let cases = [];
  let index = 0;
  let paused = false;
  let timer = null;
  const INTERVAL_MS = 12000;

  function visibleCases() {
    return chassis === "tank" ? TANK_CASES : MECANUM_CASES;
  }

  function arrowPath(x1, y1, x2, y2, color, width = 3.2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const hx = x2 - ux * 9;
    const hy = y2 - uy * 9;
    const px = -uy;
    const py = ux;
    return `
      <line x1="${x1}" y1="${y1}" x2="${hx}" y2="${hy}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>
      <polygon points="${x2},${y2} ${hx + px * 5},${hy + py * 5} ${hx - px * 5},${hy - py * 5}" fill="${color}"/>
    `;
  }

  function wheelPositions(layout, cx, cy) {
    if (layout === "tank") {
      return {
        fl: { x: cx - 92, y: cy - 78, label: "FL" },
        ml: { x: cx - 92, y: cy, label: "ML" },
        bl: { x: cx - 92, y: cy + 78, label: "BL" },
        fr: { x: cx + 92, y: cy - 78, label: "FR" },
        mr: { x: cx + 92, y: cy, label: "MR" },
        br: { x: cx + 92, y: cy + 78, label: "BR" },
      };
    }
    return {
      fl: { x: cx - 88, y: cy - 72, label: "FL" },
      fr: { x: cx + 88, y: cy - 72, label: "FR" },
      bl: { x: cx - 88, y: cy + 72, label: "BL" },
      br: { x: cx + 88, y: cy + 72, label: "BR" },
    };
  }

  function drawCase(c) {
    const W = 460;
    const H = c.tall ? 360 : c.layout === "tank" ? 320 : 300;
    const cx = W / 2;
    const cy = H / 2 + (c.tall ? 12 : 8);
    const pos = wheelPositions(c.layout, cx, cy);
    const ids = Object.keys(pos);
    const scale = c.layout === "tank" ? 28 : c.forces45 ? 26 : 38;
    const forceScale = 32;
    const rWheel = c.layout === "tank" ? 13 : 15;
    const wheelColor = "#0f7a6e";
    const forceColor = "#6b4ea8";
    const cancelColor = "#a33";
    const resultColor = "#c45c1a";
    const sideCompColor = "#c45c1a";
    const fbCompColor = "#2a7a8c";
    const uid = `vg-${c.id}`;

    let wheelArrows = "";
    for (const id of ids) {
      const p = pos[id];
      const v = c.wheels[id] ?? 0;
      const x2 = p.x;
      const y2 = p.y - v * scale;
      if (Math.abs(v) < 0.05) {
        wheelArrows += `
          <circle cx="${p.x}" cy="${p.y}" r="${rWheel}" fill="#1c2e2a" stroke="#0d1816" stroke-width="2"/>
          <text x="${p.x}" y="${p.y + 4}" text-anchor="middle" fill="#9bb" font-size="10" font-family="JetBrains Mono, monospace">0</text>
          <text x="${p.x}" y="${p.y + rWheel + 14}" text-anchor="middle" fill="#0a524a" font-size="10" font-weight="700" font-family="JetBrains Mono, monospace">${p.label}</text>
        `;
        continue;
      }
      const tag = v > 0 ? "↑" : "↓";
      // shorter wheel arrow when also drawing 45° forces
      const ySpin = c.forces45 ? p.y - v * (scale * 0.7) : y2;
      wheelArrows += `
        <circle cx="${p.x}" cy="${p.y}" r="${rWheel}" fill="#1c2e2a" stroke="#0d1816" stroke-width="2"/>
        ${arrowPath(p.x, p.y, x2, ySpin, wheelColor, c.forces45 ? 2.4 : 3)}
        <text x="${p.x}" y="${p.y + rWheel + 14}" text-anchor="middle" fill="#0a524a" font-size="10" font-weight="700" font-family="JetBrains Mono, monospace">${p.label} ${tag}</text>
      `;
    }

    let rollerTicks = "";
    if (c.rollers) {
      for (const id of ids) {
        if (c.rollers[id] == null) continue;
        const p = pos[id];
        const ang = (c.rollers[id] * Math.PI) / 180;
        const len = 16;
        const x1 = p.x - Math.cos(ang) * len;
        const y1 = p.y - Math.sin(ang) * len;
        const x2 = p.x + Math.cos(ang) * len;
        const y2 = p.y + Math.sin(ang) * len;
        const bad = c.rollers.bad === id;
        const col = bad ? "#d64545" : "#f0b429";
        rollerTicks += `
          <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="3.5" stroke-linecap="round" opacity="0.9"/>
        `;
        if (bad) {
          rollerTicks += `<text x="${p.x}" y="${p.y - rWheel - 8}" text-anchor="middle" fill="#d64545" font-size="10" font-weight="700" font-family="DM Sans, sans-serif">flipped</text>`;
        } else if (c.forces45) {
          rollerTicks += `<text x="${p.x + 22}" y="${p.y - 14}" fill="#b8860b" font-size="9" font-family="DM Sans, sans-serif">45°</text>`;
        }
      }
      if (!c.forces45) {
        const tag =
          c.id === "m-pat-o" ? "O pattern" : c.id === "m-pat-flip" ? "FR flipped" : "X pattern";
        if (c.id.startsWith("m-pat")) {
          rollerTicks += `<text x="${cx}" y="48" text-anchor="middle" fill="#0a524a" font-size="12" font-weight="700" font-family="Space Grotesk, sans-serif">${tag}</text>`;
        }
      }
    }

    let forceArrows = "";
    let componentArrows = "";
    if (c.forces45) {
      for (const id of ids) {
        const f = c.forces45[id];
        if (!f) continue;
        const p = pos[id];
        const len = Math.hypot(f.dx, f.dy) || 1;
        const ux = f.dx / len;
        const uy = -f.dy / len; // +dy forward = up = −SVG y
        const x2 = p.x + ux * forceScale;
        const y2 = p.y + uy * forceScale;
        forceArrows += arrowPath(p.x, p.y, x2, y2, forceColor, 3.2);
        forceArrows += `<text x="${x2 + ux * 8}" y="${y2 + uy * 8 + 3}" text-anchor="middle" fill="${forceColor}" font-size="9" font-weight="700" font-family="DM Sans, sans-serif">45°</text>`;

        if (c.showComponents) {
          // side component (horizontal)
          const sx = p.x + ux * forceScale * 0.85;
          const sy = p.y;
          componentArrows += `
            <line x1="${p.x}" y1="${p.y}" x2="${sx}" y2="${sy}" stroke="${sideCompColor}" stroke-width="2.2" stroke-linecap="round"/>
            <circle cx="${sx}" cy="${sy}" r="2.2" fill="${sideCompColor}"/>
          `;
          // fore/aft component (vertical)
          const fx = p.x;
          const fy = p.y + uy * forceScale * 0.85;
          componentArrows += `
            <line x1="${p.x}" y1="${p.y}" x2="${fx}" y2="${fy}" stroke="${fbCompColor}" stroke-width="2" stroke-dasharray="3 2" stroke-linecap="round" opacity="0.85"/>
          `;
        }
      }
      if (c.showComponents) {
        componentArrows += `
          <g font-family="DM Sans, sans-serif" font-size="10" fill="#4a5f5a">
            <line x1="18" y1="${H - 28}" x2="34" y2="${H - 28}" stroke="${sideCompColor}" stroke-width="2.5"/>
            <text x="40" y="${H - 24}">side parts ${c.noFullCancel ? "(keep)" : "(add)"}</text>
            <line x1="160" y1="${H - 28}" x2="176" y2="${H - 28}" stroke="${fbCompColor}" stroke-width="2" stroke-dasharray="3 2"/>
            <text x="182" y="${H - 24}">fore/aft parts ${c.noFullCancel ? "(partial — leftover)" : "(cancel)"}</text>
          </g>
        `;
        if (c.noFullCancel) {
          componentArrows += `
            <text x="${cx}" y="${cy + 36}" text-anchor="middle" fill="#0a524a" font-size="11" font-weight="700" font-family="DM Sans, sans-serif">not a full cancel → diagonal</text>
          `;
        } else {
          componentArrows += `
            <g opacity="0.85">
              <line x1="${cx - 14}" y1="${cy - 18}" x2="${cx + 14}" y2="${cy + 18}" stroke="${cancelColor}" stroke-width="2"/>
              <line x1="${cx + 14}" y1="${cy - 18}" x2="${cx - 14}" y2="${cy + 18}" stroke="${cancelColor}" stroke-width="2"/>
              <text x="${cx}" y="${cy + 32}" text-anchor="middle" fill="${cancelColor}" font-size="11" font-weight="700">fore/aft cancel</text>
            </g>
          `;
        }
      }
    }

    let sideBands = "";
    if (c.layout === "tank") {
      sideBands = `
        <text x="${cx - 92}" y="${cy - 98}" text-anchor="middle" fill="#0a524a" font-size="11" font-weight="700" font-family="Space Grotesk, sans-serif">LEFT</text>
        <text x="${cx + 92}" y="${cy - 98}" text-anchor="middle" fill="#0a524a" font-size="11" font-weight="700" font-family="Space Grotesk, sans-serif">RIGHT</text>
      `;
    }

    let cancelMarks = "";
    if (c.showCancel && pos.fl && pos.fr && !c.showComponents) {
      cancelMarks = `
        <g opacity="0.9">
          <line x1="${pos.fl.x - 22}" y1="${cy - 28}" x2="${pos.fl.x + 22}" y2="${cy + 28}" stroke="${cancelColor}" stroke-width="2.5"/>
          <line x1="${pos.fl.x + 22}" y1="${cy - 28}" x2="${pos.fl.x - 22}" y2="${cy + 28}" stroke="${cancelColor}" stroke-width="2.5"/>
          <line x1="${pos.fr.x - 22}" y1="${cy - 28}" x2="${pos.fr.x + 22}" y2="${cy + 28}" stroke="${cancelColor}" stroke-width="2.5"/>
          <line x1="${pos.fr.x + 22}" y1="${cy - 28}" x2="${pos.fr.x - 22}" y2="${cy + 28}" stroke="${cancelColor}" stroke-width="2.5"/>
          <text x="${cx}" y="${cy + 6}" text-anchor="middle" fill="${cancelColor}" font-size="12" font-weight="700" font-family="DM Sans, sans-serif">fore/aft cancel</text>
        </g>
      `;
    }

    let pathHint = "";
    if (c.pathHint) {
      pathHint = `
        <g font-family="DM Sans, sans-serif" font-size="11" fill="#4a5f5a">
          <text x="24" y="${H - 36}" >① turn 90°</text>
          <text x="120" y="${H - 36}" >② drive</text>
          <text x="200" y="${H - 36}" >③ turn back</text>
        </g>
      `;
    }

    const r = c.result;
    let resultDraw = "";
    if (c.ghostStrafe) {
      resultDraw = `
        <g opacity="0.35" stroke-dasharray="6 5">
          ${arrowPath(cx - 20, cy, cx + 70, cy, resultColor, 2.5)}
          <text x="${cx + 78}" y="${cy - 8}" fill="${resultColor}" font-size="11" font-family="DM Sans, sans-serif">wanted strafe</text>
        </g>
        <text x="${cx}" y="${cy + 52}" text-anchor="middle" fill="${cancelColor}" font-size="13" font-weight="700" font-family="Space Grotesk, sans-serif">resultant = 0</text>
      `;
    } else if (Math.abs(r.spin) > 0.2 && Math.hypot(r.fx, r.fy) < 0.25) {
      const sweep = r.spin > 0 ? 1 : 0;
      resultDraw = `
        <path d="M ${cx + 42} ${cy - 28} A 48 48 0 1 ${sweep} ${cx + 42} ${cy + 28}" fill="none" stroke="${resultColor}" stroke-width="4" stroke-linecap="round" marker-end="url(#${uid}-head)"/>
        <text x="${cx}" y="${cy + 5}" text-anchor="middle" fill="${resultColor}" font-size="13" font-weight="700" font-family="Space Grotesk, sans-serif">${r.label}</text>
      `;
    } else {
      const rx2 = cx + r.fx * 70;
      const ry2 = cy - r.fy * 70;
      const labelY = c.showComponents ? cy - 8 : cy + (c.layout === "tank" ? 42 : 58);
      resultDraw = `
        ${arrowPath(cx, cy, rx2, ry2, resultColor, 5)}
        <text x="${cx}" y="${labelY}" text-anchor="middle" fill="${resultColor}" font-size="13" font-weight="700" font-family="Space Grotesk, sans-serif">resultant · ${r.label}</text>
      `;
      if (Math.abs(r.spin) > 0.2) {
        resultDraw += `
          <path d="M ${cx + 28} ${cy - 18} A 22 22 0 0 ${r.spin > 0 ? 1 : 0} ${cx + 28} ${cy + 18}" fill="none" stroke="${resultColor}" stroke-width="2.5" opacity="0.85" marker-end="url(#${uid}-head)"/>
        `;
      }
    }

    const bodyH = c.layout === "tank" ? 130 : 116;
    const bodyY = cy - bodyH / 2;

    const chassisBadge = c.layout === "tank" ? "goBILDA 6-wheel" : "mecanum 4";
    const legendBlock = c.forces45
      ? `
        <g font-family="DM Sans, sans-serif" font-size="10" fill="#4a5f5a">
          <line x1="14" y1="16" x2="28" y2="16" stroke="${wheelColor}" stroke-width="3"/>
          <text x="32" y="19">spin</text>
          <line x1="70" y1="16" x2="84" y2="16" stroke="${forceColor}" stroke-width="3"/>
          <text x="88" y="19">45° force</text>
          <line x1="160" y1="16" x2="174" y2="16" stroke="${resultColor}" stroke-width="4"/>
          <text x="178" y="19">resultant</text>
          <rect x="${W - 88}" y="8" width="76" height="18" rx="5" fill="rgba(255,255,255,0.55)"/>
          <text x="${W - 50}" y="20" text-anchor="middle" fill="#0a524a" font-size="10" font-weight="700">${chassisBadge}</text>
        </g>
      `
      : `
        <g font-family="DM Sans, sans-serif" font-size="11" fill="#4a5f5a">
          <line x1="18" y1="22" x2="36" y2="22" stroke="${wheelColor}" stroke-width="3"/>
          <text x="42" y="26">wheel spin</text>
          <line x1="130" y1="22" x2="148" y2="22" stroke="${resultColor}" stroke-width="4"/>
          <text x="154" y="26">resultant</text>
          <rect x="${W - 96}" y="10" width="84" height="20" rx="5" fill="rgba(255,255,255,0.55)"/>
          <text x="${W - 54}" y="24" text-anchor="middle" fill="#0a524a" font-size="11" font-weight="700">${chassisBadge}</text>
        </g>
      `;

    return `
      <svg class="vg-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${c.title}">
        <defs>
          <linearGradient id="${uid}-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#c5ddd6"/>
            <stop offset="100%" stop-color="#9fbfb6"/>
          </linearGradient>
          <marker id="${uid}-head" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="${resultColor}"/>
          </marker>
        </defs>
        <rect x="0" y="0" width="${W}" height="${H}" rx="16" fill="url(#${uid}-bg)"/>
        <rect x="${cx - 52}" y="${bodyY}" width="104" height="${bodyH}" rx="14" fill="#1a322e" stroke="#0d1816" stroke-width="2"/>
        <polygon points="${cx},${bodyY + 10} ${cx - 10},${bodyY + 26} ${cx + 10},${bodyY + 26}" fill="#f0b429"/>
        <text x="${cx}" y="${bodyY + 42}" text-anchor="middle" fill="#d7efe9" font-size="10" letter-spacing="0.12em" font-family="Space Grotesk, sans-serif">FRONT</text>
        ${sideBands}
        ${wheelArrows}
        ${rollerTicks}
        ${forceArrows}
        ${componentArrows}
        ${cancelMarks}
        ${resultDraw}
        ${pathHint}
        ${legendBlock}
      </svg>
    `;
  }

  function updateGalleryCopy() {
    if (!galleryLede) return;
    if (chassis === "tank") {
      galleryLede.innerHTML =
        "goBILDA-style <strong>6-wheel</strong> snapshots: LEFT trio vs RIGHT trio. Orange arrow = resultant. Strafe cannot appear — only drive, turn, and multi-step paths.";
    } else {
      galleryLede.innerHTML =
        "Wheel <strong>spin</strong> (teal) + rollers at <strong>45°</strong> (yellow) → purple force on the diagonal. Side pieces add; fore/aft cancel → orange strafe.";
    }
  }

  function render() {
    cases = visibleCases();
    if (!cases.length) return;
    if (index >= cases.length) index = 0;
    const c = cases[index];
    wrap.innerHTML = drawCase(c);
    title.textContent = c.title;
    caption.textContent = c.caption;
    bullets.innerHTML = c.bullets.map((b) => `<li>${b}</li>`).join("");
    updateGalleryCopy();
    dots.innerHTML = cases
      .map(
        (_, i) =>
          `<button type="button" role="tab" class="vg-dot${i === index ? " on" : ""}" data-i="${i}" aria-label="Snapshot ${i + 1}" aria-selected="${i === index}"></button>`
      )
      .join("");
  }

  function go(i) {
    if (!cases.length) return;
    index = ((i % cases.length) + cases.length) % cases.length;
    render();
    restartTimer();
  }

  function next() {
    go(index + 1);
  }
  function prev() {
    go(index - 1);
  }

  function restartTimer() {
    clearInterval(timer);
    if (!paused) timer = setInterval(next, INTERVAL_MS);
  }

  function setPaused(p) {
    paused = p;
    btnPause.textContent = paused ? "Play" : "Pause";
    btnPause.setAttribute("aria-pressed", String(paused));
    restartTimer();
  }

  btnNext.addEventListener("click", next);
  btnPrev.addEventListener("click", prev);
  btnPause.addEventListener("click", () => setPaused(!paused));
  dots.addEventListener("click", (e) => {
    const t = e.target.closest("[data-i]");
    if (!t) return;
    go(Number(t.getAttribute("data-i")));
  });

  wrap.addEventListener("mouseenter", () => {
    if (!paused) clearInterval(timer);
  });
  wrap.addEventListener("mouseleave", () => {
    if (!paused) restartTimer();
  });

  window.addEventListener("chassischange", (e) => {
    chassis = e.detail?.chassis || "mecanum";
    index = 0;
    render();
    restartTimer();
  });

  window.addEventListener("patternchange", (e) => {
    if (chassis !== "mecanum") return;
    const p = e.detail?.pattern;
    const map = { x: "m-pat-x", o: "m-pat-o", "flip-fr": "m-pat-flip" };
    const id = map[p];
    if (!id) return;
    cases = visibleCases();
    const i = cases.findIndex((c) => c.id === id);
    if (i >= 0) {
      index = i;
      render();
      restartTimer();
    }
  });

  // Pick up chassis if app already set it
  const bot = document.getElementById("robot");
  if (bot?.dataset.chassis) chassis = bot.dataset.chassis;

  render();
  restartTimer();
})();
