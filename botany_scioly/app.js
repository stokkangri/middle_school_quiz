/* Botany B practice quiz. Questions live in questions.json. */
(function () {
  const TYPES = new Set([
    "multiple_choice",
    "multi_select",
    "true_false",
    "free_response",
    "label",
    "data_analysis"
  ]);
  const DIFFS = ["easy", "medium", "hard"];
  const SOURCES = [
    "questions.json",
    "https://raw.githubusercontent.com/stokkangri/middle_school_quiz/main/botany_scioly/questions.json"
  ];

  const state = {
    bank: null,
    loadNote: "",
    quiz: null
  };

  const $ = (id) => document.getElementById(id);

  function norm(s) {
    return String(s)
      .toLowerCase()
      .trim()
      .replace(/\./g, "")
      .replace(/^the /, "")
      .replace(/\s+/g, " ");
  }

  function numericValue(s) {
    const t = String(s).trim().replace(/%$/, "");
    if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
    return parseFloat(t);
  }

  function answersMatch(given, accepted) {
    const list = (Array.isArray(accepted) ? accepted : [accepted]).filter((v) => v != null);
    const g = norm(given);
    if (!g) return false;
    if (list.some((a) => norm(a) === g)) return true;
    const gn = numericValue(given);
    if (gn == null) return false;
    return list.some((a) => {
      const an = numericValue(a);
      return an != null && Math.abs(an - gn) < 0.011;
    });
  }

  function sameSet(given, expected) {
    const a = (given || []).map(norm).filter(Boolean).sort();
    const b = (expected || []).map(norm).filter(Boolean).sort();
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }

  function responseKind(q) {
    if (q.type !== "data_analysis") return q.type;
    if (q.responseType) return q.responseType;
    return q.options ? "multiple_choice" : "free_response";
  }

  function acceptedList(q) {
    if (q.accept && q.accept.length) return q.accept;
    return [q.answer];
  }

  function isCorrect(q, value) {
    const kind = responseKind(q);
    if (kind === "multi_select") return sameSet(value, q.answer);
    if (kind === "true_false") return value === (q.answer ? "true" : "false");
    if (kind === "free_response" || kind === "multiple_choice") return answersMatch(value, acceptedList(q));
    return false;
  }

  function hasAttempt(q, rec) {
    if (!rec || rec.value == null) return false;
    const kind = responseKind(q);
    if (kind === "label" || q.type === "label") {
      return Object.values(rec.value).some((v) => String(v || "").trim());
    }
    if (kind === "multi_select") return Array.isArray(rec.value) && rec.value.length > 0;
    return String(rec.value).trim().length > 0;
  }

  function scoreQuestion(q, rec) {
    const possible = q.type === "label" ? q.labels.length : 1;
    if (rec && rec.revealed) return { earned: 0, possible, status: "revealed" };
    if (!hasAttempt(q, rec)) return { earned: 0, possible, status: "skipped" };
    if (q.type === "label") {
      let earned = 0;
      q.labels.forEach((lab) => {
        const given = rec.value?.[lab.key] || "";
        if (given && answersMatch(given, lab.accept || [lab.answer])) earned += 1;
      });
      const status = earned === possible ? "correct" : earned === 0 ? "incorrect" : "partial";
      return { earned, possible, status };
    }
    const ok = isCorrect(q, rec.value);
    return { earned: ok ? 1 : 0, possible: 1, status: ok ? "correct" : "incorrect" };
  }

  function formatAnswer(q) {
    if (q.type === "label") return q.labels.map((l) => `${l.key}: ${l.answer}`).join(" · ");
    if (q.type === "true_false" || responseKind(q) === "true_false") return q.answer ? "True" : "False";
    if (Array.isArray(q.answer)) return q.answer.join(", ");
    return String(q.answer);
  }

  function formatResponse(q, rec) {
    if (!rec || !hasAttempt(q, rec)) return "Blank";
    if (q.type === "label") {
      return q.labels.map((l) => `${l.key}: ${rec.value[l.key] || "blank"}`).join(" · ");
    }
    if (responseKind(q) === "true_false") return rec.value === "true" ? "True" : rec.value === "false" ? "False" : "Blank";
    if (Array.isArray(rec.value)) return rec.value.join(", ") || "Blank";
    return String(rec.value);
  }

  function titleFromId(id) {
    return String(id)
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function topicLabel(id) {
    const topics = state.bank?.topics || [];
    const found = topics.find((t) => t.id === id);
    return found ? found.label : titleFromId(id);
  }

  function diffLabel(d) {
    return d ? d.charAt(0).toUpperCase() + d.slice(1) : "";
  }

  function typeLabel(q) {
    const map = {
      multiple_choice: "Multiple choice",
      multi_select: "Select all that apply",
      true_false: "True or false",
      free_response: "Free response",
      label: "Diagram labeling",
      data_analysis: "Data analysis"
    };
    return map[q.type] || q.type;
  }

  function validate(q) {
    if (!q || typeof q !== "object") return "not an object";
    if (!q.id || typeof q.id !== "string") return "missing id";
    if (!TYPES.has(q.type)) return "type must be multiple_choice, multi_select, true_false, free_response, label, or data_analysis";
    if (!DIFFS.includes(q.difficulty)) return "difficulty must be easy, medium, or hard";
    if (!q.topic) return "missing topic";
    if (!q.question) return "missing question";
    const kind = responseKind(q);
    if ((q.type === "multiple_choice" || q.type === "multi_select" || kind === "multiple_choice" || kind === "multi_select") && (!Array.isArray(q.options) || q.options.length < 2)) {
      return "needs at least two options";
    }
    if (kind === "multi_select" && !Array.isArray(q.answer)) return "select-all answer must be an array of the correct options";
    if (kind === "true_false" && typeof q.answer !== "boolean") return "true/false answer must be true or false";
    if (q.type === "label") {
      if (!Array.isArray(q.labels) || !q.labels.length) return "label question needs a labels array";
      if (!q.diagram && !q.svg) return "label question needs diagram or svg";
    }
    if (q.type === "data_analysis" && !q.chart && !q.table) return "data question needs a chart or a table";
    if ((kind === "free_response" || kind === "multiple_choice") && (q.answer == null || q.answer === "")) return "missing answer";
    return "";
  }

  function ensureTopic(q) {
    if (!state.bank.topics) state.bank.topics = [];
    if (!state.bank.topics.some((t) => t.id === q.topic)) {
      state.bank.topics.push({ id: q.topic, label: q.topicLabel || titleFromId(q.topic) });
    }
  }

  function addQuestions(list) {
    const added = [];
    const skipped = [];
    list.forEach((q) => {
      const problem = validate(q);
      if (problem) {
        skipped.push(`${q && q.id ? q.id : "question"}: ${problem}`);
        return;
      }
      if (state.bank.questions.some((existing) => existing.id === q.id)) {
        skipped.push(`${q.id}: already in the bank`);
        return;
      }
      state.bank.questions.push(q);
      ensureTopic(q);
      added.push(q.id);
    });
    return { added, skipped };
  }

  function parseIncoming(text) {
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.questions)) return data.questions;
    if (data && data.id && data.type) return [data];
    throw new Error("Paste a question object, an array of questions, or a bank with a questions array.");
  }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function matchingQuestions() {
    const topic = $("topic-select").value;
    const difficulty = $("difficulty-select").value;
    return state.bank.questions.filter((q) => {
      if (topic && q.topic !== topic) return false;
      if (difficulty && q.difficulty !== difficulty) return false;
      return true;
    });
  }

  function plannedCount(pool) {
    if ($("use-all").checked) return pool.length;
    const n = Math.floor(Number($("count-input").value));
    if (!Number.isFinite(n) || n < 1) return Math.min(10, pool.length);
    return Math.min(n, pool.length);
  }

  function updatePlan() {
    const el = $("plan-text");
    if (!state.bank) return;
    const pool = matchingQuestions();
    const n = plannedCount(pool);
    if (!pool.length) {
      el.textContent = "No questions match these filters. Add some, or choose All topics and All difficulties.";
      $("start-btn").disabled = true;
      return;
    }
    $("start-btn").disabled = false;
    const noun = pool.length === 1 ? "1 question matches" : `${pool.length} questions match`;
    const asked = $("use-all").checked ? pool.length : Math.floor(Number($("count-input").value));
    let round = `${n} chosen at random`;
    if (n === pool.length && $("use-all").checked) round = pool.length === 1 ? "that question" : `all ${pool.length}`;
    else if (n === pool.length) round = pool.length === 1 ? "that question" : `all ${pool.length}, since that is the whole match`;
    else if (Number.isFinite(asked) && asked > pool.length) round = `all ${pool.length}`;
    el.textContent = `${noun}. This round will use ${round}.`;
  }

  function fillSetup() {
    const topicSelect = $("topic-select");
    const current = topicSelect.value;
    topicSelect.innerHTML = '<option value="">All topics (mixed)</option>';
    state.bank.topics.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      const count = state.bank.questions.filter((q) => q.topic === t.id).length;
      opt.textContent = `${t.label} (${count})`;
      topicSelect.appendChild(opt);
    });
    topicSelect.value = current;

    const counts = { easy: 0, medium: 0, hard: 0 };
    state.bank.questions.forEach((q) => {
      if (counts[q.difficulty] != null) counts[q.difficulty] += 1;
    });
    $("bank-stats").textContent = `${state.bank.questions.length} questions in the bank · ${counts.easy} easy · ${counts.medium} medium · ${counts.hard} hard`;
    $("load-note").textContent = state.loadNote || "";
    updatePlan();
  }

  function show(which) {
    ["setup", "quiz", "results"].forEach((id) => $(id).classList.toggle("hidden", id !== which));
  }

  function escapeXml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function safeSvg(svg) {
    if (!svg || /<script/i.test(svg)) return "";
    return svg;
  }

  function chartSvg(chart) {
    const width = 560;
    const height = 320;
    const pad = { l: 54, r: 16, t: 16, b: 78 };
    const innerW = width - pad.l - pad.r;
    const innerH = height - pad.t - pad.b;
    const colors = ["#1d4e89", "#e07a3d", "#2d6a4f", "#7b2d8e"];

    function niceCeiling(raw) {
      if (raw <= 0) return 1;
      const exp = Math.pow(10, Math.floor(Math.log10(raw)));
      const frac = raw / exp;
      let nice = 10;
      if (frac <= 1) nice = 1;
      else if (frac <= 2) nice = 2;
      else if (frac <= 2.5) nice = 2.5;
      else if (frac <= 5) nice = 5;
      return nice * exp;
    }

    function tickLabel(val) {
      if (Math.abs(val - Math.round(val)) < 1e-6) return String(Math.round(val));
      return String(Math.round(val * 10) / 10);
    }

    function axis(max) {
      const yTicks = 4;
      let marks = "";
      for (let i = 0; i <= yTicks; i += 1) {
        const val = (max * i) / yTicks;
        const y = pad.t + innerH - (innerH * i) / yTicks;
        marks += `<line x1="${pad.l}" y1="${y}" x2="${width - pad.r}" y2="${y}" stroke="#e4ebe4"/>`;
        marks += `<text x="${pad.l - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#405040">${tickLabel(val)}</text>`;
      }
      marks += `<line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + innerH}" stroke="#1b4332"/>`;
      marks += `<line x1="${pad.l}" y1="${pad.t + innerH}" x2="${width - pad.r}" y2="${pad.t + innerH}" stroke="#1b4332"/>`;
      marks += `<text x="${width / 2}" y="${height - 8}" text-anchor="middle" font-size="13" fill="#1b4332">${escapeXml(chart.xLabel || "")}</text>`;
      marks += `<text x="16" y="${pad.t + innerH / 2}" text-anchor="middle" font-size="13" fill="#1b4332" transform="rotate(-90 16 ${pad.t + innerH / 2})">${escapeXml(chart.yLabel || "")}</text>`;
      return marks;
    }

    if (chart.type === "grouped_bar") {
      const groups = chart.groups || [];
      const series = chart.series || [];
      const max = niceCeiling(Math.max(1, ...series.flatMap((s) => s.values || [])));
      const groupW = innerW / Math.max(groups.length, 1);
      const barW = Math.min(28, (groupW - 16) / Math.max(series.length, 1));
      let body = axis(max);
      groups.forEach((g, gi) => {
        const gx = pad.l + gi * groupW;
        series.forEach((s, si) => {
          const val = Number(s.values[gi]) || 0;
          const h = (val / max) * innerH;
          const x = gx + 8 + si * (barW + 4);
          const y = pad.t + innerH - h;
          body += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3" fill="${colors[si % colors.length]}"></rect>`;
          body += `<text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="11" fill="#1b4332">${val}</text>`;
        });
        body += `<text x="${gx + groupW / 2}" y="${pad.t + innerH + 18}" text-anchor="middle" font-size="12" fill="#1b4332">${escapeXml(g)}</text>`;
      });
      const legend = series.map((s, si) => `<span class="legend-item"><i style="background:${colors[si % colors.length]}"></i>${escapeXml(s.name)}</span>`).join("");
      return { svg: `<svg viewBox="0 0 ${width} ${height}" role="img">${body}</svg>`, legend };
    }

    if (chart.type === "line") {
      const series = chart.series || [];
      const labels = (series[0] && series[0].points || []).map((p) => p.label);
      const max = niceCeiling(Math.max(1, ...series.flatMap((s) => (s.points || []).map((p) => Number(p.value) || 0))));
      let body = axis(max);
      const step = labels.length > 1 ? innerW / (labels.length - 1) : innerW;
      labels.forEach((label, i) => {
        const x = pad.l + i * step;
        body += `<text x="${x}" y="${pad.t + innerH + 18}" text-anchor="middle" font-size="12" fill="#1b4332">${escapeXml(label)}</text>`;
      });
      series.forEach((s, si) => {
        const color = colors[si % colors.length];
        const pts = (s.points || []).map((p, i) => {
          const x = pad.l + i * step;
          const y = pad.t + innerH - ((Number(p.value) || 0) / max) * innerH;
          return { x, y, v: p.value };
        });
        if (pts.length) {
          body += `<polyline fill="none" stroke="${color}" stroke-width="3" points="${pts.map((p) => `${p.x},${p.y}`).join(" ")}"/>`;
          pts.forEach((p) => {
            body += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${color}"/>`;
            body += `<text x="${p.x}" y="${p.y - 8}" text-anchor="middle" font-size="11" fill="#1b4332">${p.v}</text>`;
          });
        }
      });
      const legend = series.length > 1
        ? series.map((s, si) => `<span class="legend-item"><i style="background:${colors[si % colors.length]}"></i>${escapeXml(s.name)}</span>`).join("")
        : "";
      return { svg: `<svg viewBox="0 0 ${width} ${height}" role="img">${body}</svg>`, legend };
    }

    const points = chart.points || [];
    const max = niceCeiling(Math.max(1, ...points.map((p) => Number(p.value) || 0)));
    const gap = 10;
    const barW = points.length ? (innerW - gap * (points.length - 1)) / points.length : 20;
    let body = axis(max);
    points.forEach((p, i) => {
      const val = Number(p.value) || 0;
      const h = (val / max) * innerH;
      const x = pad.l + i * (barW + gap);
      const y = pad.t + innerH - h;
      body += `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(h, 0)}" rx="4" fill="#1d4e89"></rect>`;
      body += `<text x="${x + barW / 2}" y="${Math.max(y - 4, 12)}" text-anchor="middle" font-size="11" fill="#1b4332">${val}</text>`;
      body += `<text x="${x + barW / 2}" y="${pad.t + innerH + 18}" text-anchor="middle" font-size="12" fill="#1b4332">${escapeXml(p.label)}</text>`;
    });
    return { svg: `<svg viewBox="0 0 ${width} ${height}" role="img">${body}</svg>`, legend: "" };
  }

  function chartTable(chart) {
    const table = document.createElement("table");
    table.className = "sr-only";
    if (chart.type === "grouped_bar") {
      const head = `<tr><th>${escapeXml(chart.xLabel || "Group")}</th>${(chart.series || []).map((s) => `<th>${escapeXml(s.name)}</th>`).join("")}</tr>`;
      const rows = (chart.groups || []).map((g, i) => `<tr><td>${escapeXml(g)}</td>${(chart.series || []).map((s) => `<td>${s.values[i]}</td>`).join("")}</tr>`).join("");
      table.innerHTML = head + rows;
      return table;
    }
    if (chart.type === "line") {
      const series = chart.series || [];
      const labels = (series[0] && series[0].points) || [];
      table.innerHTML = `<tr><th>${escapeXml(chart.xLabel || "X")}</th>${series.map((s) => `<th>${escapeXml(s.name)}</th>`).join("")}</tr>` +
        labels.map((p, i) => `<tr><td>${escapeXml(p.label)}</td>${series.map((s) => `<td>${s.points[i] ? s.points[i].value : ""}</td>`).join("")}</tr>`).join("");
      return table;
    }
    table.innerHTML = `<tr><th>${escapeXml(chart.xLabel || "Label")}</th><th>${escapeXml(chart.yLabel || "Value")}</th></tr>` +
      (chart.points || []).map((p) => `<tr><td>${escapeXml(p.label)}</td><td>${p.value}</td></tr>`).join("");
    return table;
  }

  function htmlTable(spec) {
    const wrap = document.createElement("figure");
    wrap.className = "data-table";
    if (spec.caption) {
      const cap = document.createElement("figcaption");
      cap.textContent = spec.caption;
      wrap.appendChild(cap);
    }
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    (spec.headers || []).forEach((h) => {
      const th = document.createElement("th");
      th.textContent = h;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    const tb = document.createElement("tbody");
    (spec.rows || []).forEach((row) => {
      const tr = document.createElement("tr");
      row.forEach((cell) => {
        const td = document.createElement("td");
        td.textContent = cell;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    table.appendChild(thead);
    table.appendChild(tb);
    wrap.appendChild(table);
    return wrap;
  }

  function appendSvg(parent, svg) {
    const clean = safeSvg(svg);
    if (!clean) return;
    const wrap = document.createElement("div");
    wrap.className = "diagram";
    wrap.innerHTML = clean;
    parent.appendChild(wrap);
  }

  function renderStimulus(q, parent) {
    if (q.stimulus) {
      const p = document.createElement("p");
      p.className = "stimulus";
      p.textContent = q.stimulus;
      parent.appendChild(p);
    }
    if (q.image) {
      const img = document.createElement("img");
      img.src = q.image;
      img.alt = q.imageAlt || "Question figure";
      img.className = "figure";
      parent.appendChild(img);
    }
    if (q.chart) {
      const drawn = chartSvg(q.chart);
      appendSvg(parent, drawn.svg);
      if (drawn.legend) {
        const legend = document.createElement("div");
        legend.className = "legend";
        legend.innerHTML = drawn.legend;
        parent.appendChild(legend);
      }
      parent.appendChild(chartTable(q.chart));
    }
    if (q.table) parent.appendChild(htmlTable(q.table));
    if (q.svg) appendSvg(parent, q.svg);
    else if (q.diagram && window.DIAGRAMS && window.DIAGRAMS[q.diagram]) appendSvg(parent, window.DIAGRAMS[q.diagram]);
    else if (q.type === "label") {
      const p = document.createElement("p");
      p.className = "warn";
      p.textContent = "This labeling question has no diagram yet.";
      parent.appendChild(p);
    }
  }

  function instruction(q) {
    const kind = responseKind(q);
    if (q.type === "label") return "Match each letter to the correct name. Each blank is worth one point.";
    if (kind === "multi_select") return "Select every answer that fits. The question is correct only if the set matches exactly.";
    if (kind === "true_false") return "True or false.";
    if (kind === "free_response") return "Type the answer. Capital letters do not matter.";
    if (q.type === "data_analysis") return "Use the graph or table, then choose an answer.";
    return "Choose one answer.";
  }

  function emptyValue(q) {
    const kind = responseKind(q);
    if (q.type === "label") return {};
    if (kind === "multi_select") return [];
    return "";
  }

  function readDom(q) {
    const card = $("quiz-card");
    const kind = responseKind(q);
    if (q.type === "label") {
      const value = {};
      card.querySelectorAll("[data-label-key]").forEach((el) => {
        value[el.dataset.labelKey] = el.value;
      });
      return value;
    }
    if (kind === "multi_select") {
      return Array.from(card.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value);
    }
    const picked = card.querySelector('input[type="radio"]:checked');
    if (picked) return picked.value;
    const text = card.querySelector("[data-text-answer]");
    return text ? text.value : "";
  }

  function saveCurrent() {
    const quiz = state.quiz;
    if (!quiz) return;
    const q = quiz.items[quiz.index];
    const rec = quiz.records[q.id];
    if (rec.revealed || rec.checked) return;
    rec.value = readDom(q);
  }

  function lockNote(q, rec) {
    if (rec.revealed) {
      return `Answer revealed, so this question scores 0. ${formatAnswer(q)}`;
    }
    if (!rec.checked) return "";
    const result = scoreQuestion(q, rec);
    if (q.type === "label") {
      return result.status === "correct"
        ? `Correct — ${result.earned} of ${result.possible} labels.`
        : `${result.earned} of ${result.possible} labels correct. ${formatAnswer(q)}`;
    }
    return result.status === "correct" ? "Correct." : `Not quite. Correct answer: ${formatAnswer(q)}`;
  }

  function renderQuestion() {
    const quiz = state.quiz;
    const q = quiz.items[quiz.index];
    const rec = quiz.records[q.id];
    const locked = rec.revealed || rec.checked;
    const card = $("quiz-card");
    card.innerHTML = "";

    const meta = document.createElement("div");
    meta.className = "meta-row";
    meta.innerHTML = `<span class="chip">${quiz.index + 1} of ${quiz.items.length}</span><span class="chip">${escapeXml(topicLabel(q.topic))}</span><span class="chip chip-${q.difficulty}">${diffLabel(q.difficulty)}</span><span class="chip">${escapeXml(typeLabel(q))}</span>`;
    card.appendChild(meta);

    renderStimulus(q, card);

    const stem = document.createElement("p");
    stem.className = "stem";
    stem.textContent = q.question;
    card.appendChild(stem);

    const help = document.createElement("p");
    help.className = "help";
    help.textContent = instruction(q);
    card.appendChild(help);

    const box = document.createElement("div");
    box.className = "answers";
    const kind = responseKind(q);

    if (q.type === "label") {
      q.labels.forEach((lab) => {
        const row = document.createElement("label");
        row.className = "label-row";
        const name = document.createElement("span");
        name.textContent = lab.key;
        row.appendChild(name);
        if (q.wordBank && q.wordBank.length) {
          const select = document.createElement("select");
          select.dataset.labelKey = lab.key;
          select.disabled = locked;
          const blank = document.createElement("option");
          blank.value = "";
          blank.textContent = "Choose…";
          select.appendChild(blank);
          q.wordBank.forEach((word) => {
            const opt = document.createElement("option");
            opt.value = word;
            opt.textContent = word;
            if ((rec.value || {})[lab.key] === word) opt.selected = true;
            select.appendChild(opt);
          });
          row.appendChild(select);
        } else {
          const input = document.createElement("input");
          input.type = "text";
          input.dataset.labelKey = lab.key;
          input.disabled = locked;
          input.value = (rec.value || {})[lab.key] || "";
          input.placeholder = "Type the name";
          row.appendChild(input);
        }
        box.appendChild(row);
      });
    } else if (kind === "multi_select" || kind === "multiple_choice" || kind === "true_false") {
      const options = kind === "true_false" ? ["True", "False"] : q.options;
      options.forEach((opt) => {
        const label = document.createElement("label");
        label.className = "option";
        const input = document.createElement("input");
        input.type = kind === "multi_select" ? "checkbox" : "radio";
        input.name = "answer";
        input.value = kind === "true_false" ? opt.toLowerCase() : opt;
        input.disabled = locked;
        if (kind === "multi_select") input.checked = (rec.value || []).includes(opt);
        else input.checked = rec.value === input.value;
        label.appendChild(input);
        const span = document.createElement("span");
        span.textContent = opt;
        label.appendChild(span);
        if (locked && kind !== "true_false") markOption(q, rec, opt, label);
        if (locked && kind === "true_false") markOption(q, rec, opt.toLowerCase(), label);
        box.appendChild(label);
      });
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.dataset.textAnswer = "1";
      input.disabled = locked;
      input.value = rec.value || "";
      input.placeholder = "Type your answer";
      box.appendChild(input);
    }
    card.appendChild(box);

    const note = lockNote(q, rec);
    if (note || (locked && q.explanation)) {
      const fb = document.createElement("div");
      fb.className = "feedback " + (rec.revealed ? "revealed" : scoreQuestion(q, rec).status);
      const p = document.createElement("p");
      p.textContent = note;
      fb.appendChild(p);
      if (q.explanation) {
        const ex = document.createElement("p");
        ex.textContent = q.explanation;
        fb.appendChild(ex);
      }
      card.appendChild(fb);
    }

    renderJump();
    renderNav();
  }

  function markOption(q, rec, opt, label) {
    const kind = responseKind(q);
    const chosen = kind === "multi_select" ? (rec.value || []).includes(opt) : rec.value === opt;
    const should = kind === "multi_select"
      ? (q.answer || []).some((a) => norm(a) === norm(opt))
      : kind === "true_false"
        ? opt === (q.answer ? "true" : "false")
        : norm(opt) === norm(q.answer);
    if (should && chosen) label.classList.add("mark-right");
    else if (should) label.classList.add("mark-key");
    else if (chosen) label.classList.add("mark-wrong");
  }

  function renderJump() {
    const quiz = state.quiz;
    const row = $("jump");
    row.innerHTML = "";
    quiz.items.forEach((q, i) => {
      const rec = quiz.records[q.id];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "jump";
      btn.textContent = String(i + 1);
      btn.dataset.action = "goto";
      btn.dataset.index = String(i);
      if (i === quiz.index) btn.classList.add("current");
      if (rec.revealed) btn.classList.add("is-revealed");
      else if (rec.checked) btn.classList.add(scoreQuestion(q, rec).status === "correct" ? "is-correct" : "is-wrong");
      else if (hasAttempt(q, rec)) btn.classList.add("is-answered");
      btn.title = `Question ${i + 1}`;
      row.appendChild(btn);
    });
  }

  function renderNav() {
    const quiz = state.quiz;
    const q = quiz.items[quiz.index];
    const rec = quiz.records[q.id];
    const last = quiz.index === quiz.items.length - 1;
    const nav = $("nav");
    nav.innerHTML = "";

    const back = button("Back", "back", "btn-quiet");
    back.disabled = quiz.index === 0;
    nav.appendChild(back);

    if (quiz.mode === "immediate" && !rec.checked && !rec.revealed) {
      nav.appendChild(button("Check answer", "check", "btn-primary"));
    } else if (last && (quiz.mode === "end" || rec.checked || rec.revealed)) {
      nav.appendChild(button("See results", "finish", "btn-primary"));
    } else {
      nav.appendChild(button("Next", "next", "btn-primary"));
    }

    if (!rec.checked && !rec.revealed) {
      nav.appendChild(button("Skip", "skip", "btn-quiet"));
      nav.appendChild(button("Reveal answer (0 points)", "reveal", "btn-warn"));
    }
    const resultsAlreadyShown = last && !(quiz.mode === "immediate" && !rec.checked && !rec.revealed);
    if (!resultsAlreadyShown) nav.appendChild(button("Finish test", "finish", "btn-quiet"));
  }

  function button(text, action, cls) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn ${cls}`;
    btn.textContent = text;
    btn.dataset.action = action;
    return btn;
  }

  function startQuiz() {
    const pool = matchingQuestions();
    const n = plannedCount(pool);
    if (!pool.length || !n) return;
    const items = shuffle(pool).slice(0, n).map((q) => {
      const copy = JSON.parse(JSON.stringify(q));
      if (copy.options) copy.options = shuffle(copy.options);
      if (copy.wordBank) copy.wordBank = shuffle(copy.wordBank);
      return copy;
    });
    const records = {};
    items.forEach((q) => {
      records[q.id] = { value: emptyValue(q), revealed: false, checked: false };
    });
    state.quiz = {
      mode: document.querySelector('input[name="feedback"]:checked').value,
      items,
      index: 0,
      records
    };
    show("quiz");
    renderQuestion();
  }

  function goto(index) {
    saveCurrent();
    state.quiz.index = index;
    renderQuestion();
  }

  function checkCurrent() {
    const quiz = state.quiz;
    const q = quiz.items[quiz.index];
    const rec = quiz.records[q.id];
    rec.value = readDom(q);
    if (!hasAttempt(q, rec)) {
      flash("Choose an answer first, or press Skip.");
      return;
    }
    rec.checked = true;
    renderQuestion();
  }

  function revealCurrent() {
    const quiz = state.quiz;
    const q = quiz.items[quiz.index];
    const rec = quiz.records[q.id];
    if (rec.checked || rec.revealed) return;
    rec.value = readDom(q);
    rec.revealed = true;
    renderQuestion();
  }

  function skipCurrent() {
    const quiz = state.quiz;
    const q = quiz.items[quiz.index];
    const rec = quiz.records[q.id];
    if (rec.checked || rec.revealed) {
      if (quiz.index < quiz.items.length - 1) quiz.index += 1;
      renderQuestion();
      return;
    }
    rec.value = emptyValue(q);
    if (quiz.index < quiz.items.length - 1) quiz.index += 1;
    renderQuestion();
  }

  function nextCurrent() {
    const quiz = state.quiz;
    saveCurrent();
    if (quiz.index < quiz.items.length - 1) {
      quiz.index += 1;
      renderQuestion();
      return;
    }
    finish();
  }

  function finish() {
    saveCurrent();
    renderResults();
    show("results");
  }

  function renderResults() {
    const quiz = state.quiz;
    const rows = quiz.items.map((q) => ({ q, rec: quiz.records[q.id], score: scoreQuestion(q, quiz.records[q.id]) }));
    const earned = rows.reduce((sum, r) => sum + r.score.earned, 0);
    const possible = rows.reduce((sum, r) => sum + r.score.possible, 0);
    const pct = possible ? Math.round((100 * earned) / possible) : 0;
    const counts = { correct: 0, partial: 0, incorrect: 0, skipped: 0, revealed: 0 };
    rows.forEach((r) => { counts[r.score.status] += 1; });

    $("score-number").textContent = `${earned} / ${possible}`;
    $("score-pct").textContent = `${pct}%`;
    $("score-breakdown").textContent = [
      `${counts.correct} correct`,
      counts.partial ? `${counts.partial} partial` : "",
      `${counts.incorrect} incorrect`,
      `${counts.skipped} blank`,
      `${counts.revealed} revealed (0 points)`
    ].filter(Boolean).join(" · ");

    const byTopic = {};
    const byDiff = {};
    rows.forEach((r) => {
      const t = byTopic[r.q.topic] || (byTopic[r.q.topic] = { earned: 0, possible: 0 });
      t.earned += r.score.earned;
      t.possible += r.score.possible;
      const d = byDiff[r.q.difficulty] || (byDiff[r.q.difficulty] = { earned: 0, possible: 0 });
      d.earned += r.score.earned;
      d.possible += r.score.possible;
    });

    const topicBody = $("topic-body");
    topicBody.innerHTML = "";
    const reviewTopics = [];
    const strongTopics = [];
    (state.bank.topics || []).forEach((t) => {
      const row = byTopic[t.id];
      if (!row) return;
      const tr = document.createElement("tr");
      const percent = row.possible ? Math.round((100 * row.earned) / row.possible) : 0;
      tr.innerHTML = `<td>${escapeXml(t.label)}</td><td>${row.earned} / ${row.possible}</td><td>${percent}%</td>`;
      topicBody.appendChild(tr);
      if (percent === 100) strongTopics.push(t.label);
      else reviewTopics.push(t.label);
    });

    const diffBody = $("diff-body");
    diffBody.innerHTML = "";
    DIFFS.forEach((d) => {
      const row = byDiff[d];
      if (!row) return;
      const tr = document.createElement("tr");
      const percent = row.possible ? Math.round((100 * row.earned) / row.possible) : 0;
      tr.innerHTML = `<td>${diffLabel(d)}</td><td>${row.earned} / ${row.possible}</td><td>${percent}%</td>`;
      diffBody.appendChild(tr);
    });

    const advice = $("advice");
    if (!reviewTopics.length) advice.textContent = "Every topic in this round was solid.";
    else if (strongTopics.length) advice.textContent = `Strong: ${strongTopics.join(", ")}. Review next: ${reviewTopics.join(", ")}.`;
    else advice.textContent = `Review next: ${reviewTopics.join(", ")}.`;

    const list = $("review-list");
    list.innerHTML = "";
    rows.forEach((r, i) => {
      const art = document.createElement("article");
      art.className = `review ${r.score.status}`;
      const h = document.createElement("h3");
      h.textContent = `${i + 1}. ${r.q.question}`;
      art.appendChild(h);
      const tags = document.createElement("p");
      tags.className = "help";
      tags.textContent = `${topicLabel(r.q.topic)} · ${diffLabel(r.q.difficulty)} · ${statusText(r.score)} · ${r.score.earned} / ${r.score.possible}`;
      art.appendChild(tags);
      const yours = document.createElement("p");
      yours.innerHTML = `<strong>Your answer:</strong> ${escapeXml(formatResponse(r.q, r.rec))}`;
      art.appendChild(yours);
      const corr = document.createElement("p");
      corr.innerHTML = `<strong>Correct:</strong> ${escapeXml(formatAnswer(r.q))}`;
      art.appendChild(corr);
      if (r.q.explanation) {
        const ex = document.createElement("p");
        ex.textContent = r.q.explanation;
        art.appendChild(ex);
      }
      list.appendChild(art);
    });
  }

  function statusText(score) {
    if (score.status === "revealed") return "Revealed — no points";
    if (score.status === "skipped") return "Left blank";
    if (score.status === "partial") return "Partial credit";
    if (score.status === "correct") return "Correct";
    return "Incorrect";
  }

  function flash(message) {
    let el = $("flash");
    if (!el) {
      el = document.createElement("p");
      el.id = "flash";
      el.className = "warn";
      $("quiz-card").prepend(el);
    }
    el.textContent = message;
  }

  function downloadBank() {
    const blob = new Blob([JSON.stringify(state.bank, null, 2) + "\n"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "questions.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function onAddExtra() {
    const msg = $("extra-msg");
    const text = $("extra-json").value.trim();
    if (!text) {
      msg.textContent = "Paste JSON first.";
      return;
    }
    try {
      const list = parseIncoming(text);
      const { added, skipped } = addQuestions(list);
      fillSetup();
      const bits = [];
      if (added.length) bits.push(`Added ${added.length} for this practice: ${added.join(", ")}.`);
      if (skipped.length) bits.push(`Skipped: ${skipped.join("; ")}.`);
      bits.push("Download the bank if you want to keep them in questions.json.");
      msg.textContent = bits.join(" ");
      if (added.length) $("extra-json").value = "";
    } catch (err) {
      msg.textContent = err.message || "That JSON could not be read.";
    }
  }

  async function loadFromUrl() {
    let lastError = "Could not load questions.json.";
    for (const url of SOURCES) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`${url} returned ${response.status}`);
        const data = await response.json();
        adoptBank(data, url.startsWith("http") ? "Loaded the published question bank." : "Loaded questions.json.");
        return;
      } catch (err) {
        lastError = err.message;
      }
    }
    $("load-error").classList.remove("hidden");
    $("load-error-text").textContent = `${lastError} Choose the questions.json file on this computer.`;
  }

  function adoptBank(data, note) {
    const bank = Array.isArray(data) ? { schemaVersion: 1, topics: [], questions: data } : data;
    if (!bank.questions || !Array.isArray(bank.questions)) throw new Error("The file needs a questions array.");
    bank.topics = bank.topics || [];
    const kept = [];
    const rejected = [];
    bank.questions.forEach((q) => {
      const problem = validate(q);
      if (problem) rejected.push(`${q && q.id ? q.id : "question"}: ${problem}`);
      else if (kept.some((k) => k.id === q.id)) rejected.push(`${q.id}: duplicate id`);
      else kept.push(q);
    });
    bank.questions = kept;
    state.bank = bank;
    state.bank.questions.forEach(ensureTopic);
    state.loadNote = rejected.length ? `${note} ${rejected.length} question(s) were left out: ${rejected.join("; ")}` : note;
    $("load-error").classList.add("hidden");
    $("setup-fields").classList.remove("hidden");
    fillSetup();
    show("setup");
  }

  function onAction(event) {
    const btn = event.target.closest("[data-action]");
    if (!btn || btn.disabled) return;
    const action = btn.dataset.action;
    if (action === "goto") goto(Number(btn.dataset.index));
    else if (action === "back") goto(state.quiz.index - 1);
    else if (action === "next") nextCurrent();
    else if (action === "skip") skipCurrent();
    else if (action === "check") checkCurrent();
    else if (action === "reveal") revealCurrent();
    else if (action === "finish") finish();
  }

  function bind() {
    $("start-btn").addEventListener("click", startQuiz);
    $("topic-select").addEventListener("change", updatePlan);
    $("difficulty-select").addEventListener("change", updatePlan);
    $("count-input").addEventListener("input", updatePlan);
    $("use-all").addEventListener("change", () => {
      $("count-input").disabled = $("use-all").checked;
      updatePlan();
    });
    $("add-extra").addEventListener("click", onAddExtra);
    $("download-btn").addEventListener("click", downloadBank);
    $("again-btn").addEventListener("click", () => show("setup"));
    $("bank-file").addEventListener("change", () => {
      const file = $("bank-file").files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          adoptBank(JSON.parse(reader.result), `Loaded ${file.name}.`);
        } catch (err) {
          $("load-error-text").textContent = err.message || "Could not read that file.";
        }
      };
      reader.readAsText(file);
    });
    document.body.addEventListener("click", onAction);
    document.body.addEventListener("change", (event) => {
      if (state.quiz && event.target.closest("#quiz-card")) saveCurrent();
    });
    document.body.addEventListener("input", (event) => {
      if (state.quiz && event.target.closest("#quiz-card")) saveCurrent();
    });
  }

  function selfTest() {
    const tf = { id: "t", type: "true_false", difficulty: "easy", topic: "x", question: "q", answer: true };
    const multi = { id: "m", type: "multi_select", difficulty: "easy", topic: "x", question: "q", options: ["A", "B"], answer: ["A"] };
    const label = {
      id: "l",
      type: "label",
      difficulty: "easy",
      topic: "x",
      question: "q",
      diagram: "flower",
      labels: [{ key: "A", answer: "petal" }, { key: "B", answer: "sepal" }]
    };
    const checks = [
      scoreQuestion(tf, { value: "true", revealed: false, checked: true }).status === "correct",
      scoreQuestion(tf, { value: "true", revealed: true, checked: false }).earned === 0,
      scoreQuestion(tf, { value: "", revealed: false, checked: false }).status === "skipped",
      scoreQuestion(multi, { value: ["A"], revealed: false }).status === "correct",
      scoreQuestion(multi, { value: ["A", "B"], revealed: false }).status === "incorrect",
      scoreQuestion(label, { value: { A: "petal", B: "" }, revealed: false }).status === "partial",
      answersMatch("25%", ["25"]),
      !answersMatch("1/4", ["1/2"])
    ];
    if (checks.some((ok) => !ok)) {
      console.error("Scoring self-test failed", checks);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    selfTest();
    bind();
    loadFromUrl();
  });
})();
