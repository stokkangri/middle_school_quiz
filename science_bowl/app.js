/* Middle school Science Bowl practice. Questions live in questions.json. */
(function () {
  const TYPES = new Set(["multiple_choice", "free_response"]);
  const LETTERS = ["W", "X", "Y", "Z"];
  const SUB = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };
  const SUP = { "⁰": "^0", "¹": "^1", "²": "^2", "³": "^3", "⁴": "^4", "⁵": "^5", "⁶": "^6", "⁷": "^7", "⁸": "^8", "⁹": "^9" };

  const state = {
    bank: null,
    loadNote: "",
    quiz: null
  };

  const $ = (id) => document.getElementById(id);

  function fold(s) {
    return String(s)
      .toLowerCase()
      .replace(/[–—−]/g, "-")
      .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (ch) => SUB[ch] || ch)
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => SUP[ch] || ch)
      .replace(/π/g, "pi")
      .replace(/√/g, "sqrt");
  }

  function norm(s) {
    return fold(s)
      .trim()
      .replace(/^the /, "")
      .replace(/^an /, "")
      .replace(/^a /, "")
      .replace(/[.,;:]+$/g, "")
      .replace(/(\d),(\d)/g, "$1$2")
      .replace(/\s+/g, " ");
  }

  function mathKey(s) {
    return norm(s).replace(/\s+/g, "").replace(/\*/g, "").replace(/[()]/g, "");
  }

  function looseKey(s) {
    return mathKey(s).replace(/([a-z])\^(\d+)/g, "$1$2");
  }

  function numericValue(s) {
    const t = norm(s).replace(/%$/, "").replace(/\s+/g, "");
    if (/^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t);
    const frac = t.match(/^(-?\d+)\/(-?\d+)$/);
    if (frac) {
      const den = parseFloat(frac[2]);
      return den === 0 ? null : parseFloat(frac[1]) / den;
    }
    const mixed = norm(s).replace(/%$/, "").match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) {
      const den = parseFloat(mixed[3]);
      if (den === 0) return null;
      const sign = mixed[1].startsWith("-") ? -1 : 1;
      return sign * (Math.abs(parseFloat(mixed[1])) + parseFloat(mixed[2]) / den);
    }
    return null;
  }

  function answersMatch(given, accepted) {
    const list = (Array.isArray(accepted) ? accepted : [accepted]).filter((v) => v != null && String(v).trim());
    const g = norm(given);
    if (!g) return false;
    if (list.some((a) => norm(a) === g)) return true;
    const gk = mathKey(given);
    if (list.some((a) => mathKey(a) === gk)) return true;
    const gl = looseKey(given);
    if (list.some((a) => looseKey(a) === gl)) return true;
    const gn = numericValue(given);
    if (gn == null) return false;
    return list.some((a) => {
      const an = numericValue(a);
      return an != null && Math.abs(an - gn) < 0.011;
    });
  }

  function acceptedList(q) {
    if (q.accept && q.accept.length) return q.accept;
    return [q.answer];
  }

  function isCorrect(q, value) {
    if (q.reject && q.reject.some((item) => answersMatch(value, [item]))) return false;
    return answersMatch(value, acceptedList(q));
  }

  function hasAttempt(q, rec) {
    return !!(rec && rec.value != null && String(rec.value).trim());
  }

  function scoreQuestion(q, rec) {
    if (rec && rec.revealed) return { earned: 0, possible: 1, status: "revealed" };
    if (!hasAttempt(q, rec)) return { earned: 0, possible: 1, status: "skipped" };
    const ok = isCorrect(q, rec.value);
    return { earned: ok ? 1 : 0, possible: 1, status: ok ? "correct" : "incorrect" };
  }

  function formatAnswer(q) {
    if (q.type === "multiple_choice" && q.choice) return `${q.choice}) ${q.answer}`;
    const extras = (q.accept || []).filter((item) => norm(item) !== norm(q.answer)).slice(0, 5);
    if (!extras.length) return String(q.answer);
    return `${q.answer} (also accepted: ${extras.join("; ")})`;
  }

  function formatResponse(q, rec) {
    if (!rec || !hasAttempt(q, rec)) return "Blank";
    return String(rec.value);
  }

  function titleFromId(id) {
    return String(id).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function topicLabel(id) {
    const found = (state.bank?.topics || []).find((t) => t.id === id);
    return found ? found.label : titleFromId(id);
  }

  function roleLabel(role) {
    return role === "bonus" ? "Bonus" : "Toss-up";
  }

  function typeLabel(q) {
    return q.type === "free_response" ? "Short answer" : "Multiple choice";
  }

  function sourceLabel(q) {
    if (q.source) return q.source;
    if (q.year && q.round) return `${q.year} round ${q.round}`;
    return "";
  }

  function validate(q) {
    if (!q || typeof q !== "object") return "not an object";
    if (!q.id || typeof q.id !== "string") return "missing id";
    if (!TYPES.has(q.type)) return "type must be multiple_choice or free_response";
    if (!q.topic) return "missing topic";
    if (!q.question) return "missing question";
    if (q.type === "multiple_choice" && (!Array.isArray(q.options) || q.options.length < 2)) return "needs at least two options";
    if (q.answer == null || q.answer === "") return "missing answer";
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
    const type = $("type-select").value;
    const role = $("role-select").value;
    const year = $("year-select").value;
    const round = $("round-select").value;
    return state.bank.questions.filter((q) => {
      if (topic && q.topic !== topic) return false;
      if (type && q.type !== type) return false;
      if (role && q.role !== role) return false;
      if (year && String(q.year) !== year) return false;
      if (round && `${q.set}-${q.round}` !== round) return false;
      return true;
    });
  }

  function officialOrder(list) {
    return list.slice().sort((a, b) => {
      if (a.number !== b.number) return (a.number || 0) - (b.number || 0);
      if (a.role === b.role) return 0;
      return a.role === "tossup" ? -1 : 1;
    });
  }

  function plannedCount(pool) {
    if ($("round-select").value || $("use-all").checked) return pool.length;
    const n = Math.floor(Number($("count-input").value));
    if (!Number.isFinite(n) || n < 1) return Math.min(10, pool.length);
    return Math.min(n, pool.length);
  }

  function updatePlan() {
    const el = $("plan-text");
    if (!state.bank) return;
    const roundPicked = Boolean($("round-select").value);
    $("count-input").disabled = roundPicked;
    $("use-all").disabled = roundPicked;
    const pool = matchingQuestions();
    const n = plannedCount(pool);
    if (!pool.length) {
      el.textContent = "No questions match these filters.";
      $("start-btn").disabled = true;
      return;
    }
    $("start-btn").disabled = false;
    const noun = pool.length === 1 ? "1 question matches" : `${pool.length} questions match`;
    if (roundPicked) {
      el.textContent = `${noun}. This round will play in official order, toss-up then bonus.`;
      return;
    }
    const asked = $("use-all").checked ? pool.length : Math.floor(Number($("count-input").value));
    let round = `${n} chosen at random`;
    if (n === pool.length && $("use-all").checked) round = pool.length === 1 ? "that question" : `all ${pool.length}`;
    else if (n === pool.length) round = pool.length === 1 ? "that question" : `all ${pool.length}, since that is the whole match`;
    else if (Number.isFinite(asked) && asked > pool.length) round = `all ${pool.length}`;
    el.textContent = `${noun}. This round will use ${round}.`;
  }

  function fillYears() {
    const select = $("year-select");
    const current = select.value;
    const years = [...new Set(state.bank.questions.map((q) => q.year).filter(Boolean))].sort();
    select.innerHTML = '<option value="">All years</option>';
    years.forEach((year) => {
      const opt = document.createElement("option");
      opt.value = String(year);
      const count = state.bank.questions.filter((q) => q.year === year).length;
      opt.textContent = `${year} (${count})`;
      select.appendChild(opt);
    });
    select.value = current;
  }

  function fillRounds() {
    const select = $("round-select");
    const current = select.value;
    const year = $("year-select").value;
    select.innerHTML = "";
    const randomOpt = document.createElement("option");
    randomOpt.value = "";
    randomOpt.textContent = "Random mix";
    select.appendChild(randomOpt);
    const rounds = new Map();
    state.bank.questions.forEach((q) => {
      if (!q.set || !q.round) return;
      if (year && String(q.year) !== year) return;
      const key = `${q.set}-${q.round}`;
      if (!rounds.has(key)) rounds.set(key, { year: q.year, round: q.round, count: 0 });
      rounds.get(key).count += 1;
    });
    const grouped = new Map();
    [...rounds.entries()]
      .sort((a, b) => a[1].year - b[1].year || a[1].round - b[1].round)
      .forEach(([key, info]) => {
        if (!grouped.has(info.year)) grouped.set(info.year, []);
        grouped.get(info.year).push([key, info]);
      });
    grouped.forEach((items, groupYear) => {
      const group = document.createElement("optgroup");
      group.label = String(groupYear);
      items.forEach(([key, info]) => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = `Round ${info.round} (${info.count})`;
        group.appendChild(opt);
      });
      select.appendChild(group);
    });
    select.value = [...select.options].some((opt) => opt.value === current) ? current : "";
  }

  function fillSetup() {
    const topicSelect = $("topic-select");
    const current = topicSelect.value;
    topicSelect.innerHTML = '<option value="">All categories</option>';
    state.bank.topics.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      const count = state.bank.questions.filter((q) => q.topic === t.id).length;
      opt.textContent = `${t.label} (${count})`;
      topicSelect.appendChild(opt);
    });
    topicSelect.value = current;
    fillYears();
    fillRounds();
    const mc = state.bank.questions.filter((q) => q.type === "multiple_choice").length;
    const short = state.bank.questions.length - mc;
    $("bank-stats").textContent = `${state.bank.questions.length} questions in the bank · ${mc} multiple choice · ${short} short answer`;
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

  function instruction(q) {
    if (q.type === "free_response") return "Type the short answer. Capitalization does not matter.";
    return "Choose one answer. The letters are the official W, X, Y, Z order.";
  }

  function readDom() {
    const card = $("quiz-card");
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
    rec.value = readDom();
  }

  function lockNote(q, rec) {
    if (rec.revealed) return `Answer revealed, so this question scores 0. ${formatAnswer(q)}`;
    if (!rec.checked) return "";
    const result = scoreQuestion(q, rec);
    return result.status === "correct" ? "Correct." : `Not quite. Correct answer: ${formatAnswer(q)}`;
  }

  function noteLine(q) {
    if (q.answerNote && /must/i.test(q.answerNote)) return `Sample note: ${q.answerNote}.`;
    return "";
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
    const roleClass = q.role === "bonus" ? "chip-bonus" : "chip-tossup";
    meta.innerHTML = `<span class="chip">${quiz.index + 1} of ${quiz.items.length}</span><span class="chip">${escapeXml(topicLabel(q.topic))}</span><span class="chip ${roleClass}">${escapeXml(roleLabel(q.role))}</span><span class="chip">${escapeXml(typeLabel(q))}</span><span class="chip">${escapeXml(sourceLabel(q))}</span>`;
    card.appendChild(meta);

    const stem = document.createElement("p");
    stem.className = "stem";
    stem.textContent = q.question;
    card.appendChild(stem);

    const help = document.createElement("p");
    help.className = "help";
    help.textContent = instruction(q);
    card.appendChild(help);

    const box = document.createElement("div");
    if (q.type === "multiple_choice") {
      q.options.forEach((opt, i) => {
        const label = document.createElement("label");
        label.className = "option";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "answer";
        input.value = opt;
        input.disabled = locked;
        input.checked = rec.value === opt;
        const letter = document.createElement("span");
        letter.className = "letter";
        letter.textContent = LETTERS[i] || String(i + 1);
        const span = document.createElement("span");
        span.textContent = opt;
        label.appendChild(input);
        label.appendChild(letter);
        label.appendChild(span);
        if (locked) {
          const chosen = rec.value === opt;
          const should = norm(opt) === norm(q.answer);
          if (should && chosen) label.classList.add("mark-right");
          else if (should) label.classList.add("mark-key");
          else if (chosen) label.classList.add("mark-wrong");
        }
        box.appendChild(label);
      });
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.dataset.textAnswer = "1";
      input.disabled = locked;
      input.value = rec.value || "";
      input.placeholder = "Type your answer";
      input.autocomplete = "off";
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        if (quiz.mode === "immediate" && !rec.checked && !rec.revealed) checkCurrent();
        else nextCurrent();
      });
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
      const extra = noteLine(q);
      if (q.explanation || extra) {
        const ex = document.createElement("p");
        ex.textContent = [q.explanation, extra].filter(Boolean).join(" ");
        fb.appendChild(ex);
      }
      card.appendChild(fb);
    }

    renderJump();
    renderNav();
    if (!locked && q.type === "free_response") {
      const field = card.querySelector("[data-text-answer]");
      if (field) field.focus();
    }
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

  function flash(message) {
    let el = $("flash");
    if (!el) {
      el = document.createElement("p");
      el.id = "flash";
      el.className = "warn";
    }
    el.textContent = message;
    $("nav").prepend(el);
  }

  function startQuiz() {
    const pool = matchingQuestions();
    const n = plannedCount(pool);
    if (!pool.length || !n) return;
    const ordered = $("round-select").value ? officialOrder(pool) : shuffle(pool);
    const items = ordered.slice(0, n);
    const records = {};
    items.forEach((q) => {
      records[q.id] = { value: "", revealed: false, checked: false };
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
    rec.value = readDom();
    if (!hasAttempt(q, rec)) {
      flash("Choose or type an answer first, or press Skip.");
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
    rec.value = readDom();
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
    rec.value = "";
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
    if (state.quiz.mode === "end") {
      state.quiz.items.forEach((q) => {
        const rec = state.quiz.records[q.id];
        if (!rec.revealed) rec.checked = true;
      });
    }
    renderResults();
    show("results");
  }

  function percent(earned, possible) {
    if (!possible) return "0%";
    return `${Math.round((100 * earned) / possible)}%`;
  }

  function fillScoreTable(body, rows) {
    body.innerHTML = "";
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeXml(row.label)}</td><td>${row.earned} / ${row.possible}</td><td>${percent(row.earned, row.possible)}</td>`;
      body.appendChild(tr);
    });
  }

  function groupScores(keyFn, labelFn) {
    const map = new Map();
    state.quiz.items.forEach((q) => {
      const key = keyFn(q);
      if (!map.has(key)) map.set(key, { label: labelFn(q), earned: 0, possible: 0 });
      const row = map.get(key);
      const score = scoreQuestion(q, state.quiz.records[q.id]);
      row.earned += score.earned;
      row.possible += score.possible;
    });
    return [...map.values()];
  }

  function renderResults() {
    const quiz = state.quiz;
    let earned = 0;
    let possible = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    let revealed = 0;
    quiz.items.forEach((q) => {
      const score = scoreQuestion(q, quiz.records[q.id]);
      earned += score.earned;
      possible += score.possible;
      if (score.status === "correct") correct += 1;
      else if (score.status === "incorrect") wrong += 1;
      else if (score.status === "revealed") revealed += 1;
      else skipped += 1;
    });
    $("score-number").textContent = `${earned} / ${possible}`;
    $("score-pct").textContent = percent(earned, possible);
    $("score-breakdown").textContent = `${correct} correct · ${wrong} wrong · ${skipped} blank · ${revealed} revealed`;
    const topics = groupScores((q) => q.topic, (q) => topicLabel(q.topic));
    const weak = topics.filter((row) => row.possible >= 1).sort((a, b) => a.earned / a.possible - b.earned / b.possible)[0];
    if (weak && weak.earned < weak.possible) {
      $("advice").textContent = `${weak.label} was the lowest category in this round, at ${percent(weak.earned, weak.possible)}.`;
    } else {
      $("advice").textContent = possible ? "Every answered category in this round was perfect." : "";
    }
    fillScoreTable($("topic-body"), topics);
    fillScoreTable($("type-body"), groupScores((q) => q.type, (q) => typeLabel(q)));
    fillScoreTable($("role-body"), groupScores((q) => q.role || "question", (q) => roleLabel(q.role)));

    const list = $("review-list");
    list.innerHTML = "";
    quiz.items.forEach((q, i) => {
      const rec = quiz.records[q.id];
      const score = scoreQuestion(q, rec);
      const block = document.createElement("div");
      block.className = "review";
      const title = document.createElement("h3");
      title.textContent = `${i + 1}. ${topicLabel(q.topic)} · ${roleLabel(q.role)} · ${score.status}`;
      const stem = document.createElement("p");
      stem.textContent = q.question;
      const yours = document.createElement("p");
      yours.textContent = `Your answer: ${formatResponse(q, rec)}`;
      const key = document.createElement("p");
      key.textContent = `Correct answer: ${formatAnswer(q)}`;
      block.appendChild(title);
      block.appendChild(stem);
      block.appendChild(yours);
      block.appendChild(key);
      list.appendChild(block);
    });
  }

  function downloadBank() {
    const blob = new Blob([JSON.stringify(state.bank, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "questions.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function useBank(data, note) {
    if (!data || !Array.isArray(data.questions)) throw new Error("This file has no questions array.");
    state.bank = data;
    state.loadNote = note || "";
    $("load-error").classList.add("hidden");
    $("setup-fields").classList.remove("hidden");
    fillSetup();
  }

  async function loadBank() {
    try {
      const response = await fetch("questions.json");
      if (!response.ok) throw new Error(`Could not load questions.json (${response.status})`);
      useBank(await response.json(), "");
    } catch (error) {
      $("setup-fields").classList.add("hidden");
      $("load-error").classList.remove("hidden");
      $("load-error-text").textContent = "The quiz could not read questions.json. If you opened this file directly, start a local server in this folder, or choose the questions.json file.";
    }
  }

  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn || btn.disabled) return;
    const action = btn.dataset.action;
    if (action === "goto") goto(Number(btn.dataset.index));
    else if (action === "back") goto(Math.max(0, state.quiz.index - 1));
    else if (action === "next") nextCurrent();
    else if (action === "check") checkCurrent();
    else if (action === "skip") skipCurrent();
    else if (action === "reveal") revealCurrent();
    else if (action === "finish") finish();
  });

  $("start-btn").addEventListener("click", startQuiz);
  $("again-btn").addEventListener("click", () => show("setup"));
  $("download-btn").addEventListener("click", downloadBank);
  ["topic-select", "type-select", "role-select", "year-select", "round-select", "count-input", "use-all"].forEach((id) => {
    $(id).addEventListener("change", () => {
      if (id === "year-select") fillRounds();
      updatePlan();
    });
    $(id).addEventListener("input", updatePlan);
  });
  $("add-extra").addEventListener("click", () => {
    const msg = $("extra-msg");
    try {
      const list = parseIncoming($("extra-json").value);
      const result = addQuestions(list);
      fillSetup();
      msg.textContent = result.added.length
        ? `Added ${result.added.length}. ${result.skipped.join(" ")}`
        : `Nothing added. ${result.skipped.join(" ")}`;
    } catch (error) {
      msg.textContent = error.message;
    }
  });
  $("bank-file").addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      useBank(JSON.parse(await file.text()), `Loaded ${file.name}.`);
    } catch (error) {
      $("load-error-text").textContent = "That file could not be read as a question bank.";
    }
  });

  loadBank();
})();
