#!/usr/bin/env python3
"""Download DOE middle school Science Bowl sample rounds and build questions.json.

Source page:
https://science.osti.gov/wdts/nsb/Regional-Competitions/Resources/MS-Sample-Questions

These PDFs are U.S. Department of Energy publications released as study samples.
"""

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "source_pdfs"
OUT = ROOT / "questions.json"
BASE = "https://science.osti.gov/-/media/wdts/nsb/pdf/MS-Sample-Questions"

SUPER = str.maketrans("0123456789+-=()", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾")
SUB = str.maketrans("0123456789+-=()", "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎")

CATEGORIES = {
    "biology": ("life_science", "Life Science"),
    "life science": ("life_science", "Life Science"),
    "chemistry": ("chemistry", "Chemistry"),
    "physics": ("physics", "Physics"),
    "physical science": ("physical_science", "Physical Science"),
    "earth and space": ("earth_space", "Earth and Space"),
    "earth & space": ("earth_space", "Earth and Space"),
    "earth science": ("earth_space", "Earth and Space"),
    "energy": ("energy", "Energy"),
    "math": ("math", "Math"),
    "mathematics": ("math", "Math"),
    "general science": ("general_science", "General Science"),
}

KEEP_UPPER = {
    "DNA", "RNA", "ATP", "ADP", "NADH", "NADPH", "CO2", "H2O", "HIV", "AIDS",
    "UV", "IR", "MRI", "PCR", "GMO", "GPS", "SI", "TB", "RNA", "RNAP", "mRNA",
    "tRNA", "rRNA", "NaCl", "HCl", "NaOH", "NH3", "LED", "LCD", "CPU", "AC",
    "DC", "pH", "II", "III", "IV", "Au", "Fe", "Na", "Cl", "Hz", "NMR",
}

SETS = []
for n in range(1, 18):
    SETS.append((13, 2019, n, f"{BASE}/Sample-Set-13/2019-NSB-MSR-Round-{n}A.pdf"))
for n in range(1, 18):
    SETS.append((14, 2020, n, f"{BASE}/Sample-Set-14/2020-MS-Rd{n}.pdf"))
for n in range(1, 11):
    SETS.append((15, 2021, n, f"{BASE}/Sample-Set-15/Set-{n}-MS-2021.pdf"))
for n in range(1, 10):
    SETS.append((16, 2022, n, f"{BASE}/Sample-Set-16/2022-MS-{n}.pdf"))

TOPICS = [
    {"id": "life_science", "label": "Life Science"},
    {"id": "physical_science", "label": "Physical Science"},
    {"id": "chemistry", "label": "Chemistry"},
    {"id": "physics", "label": "Physics"},
    {"id": "earth_space", "label": "Earth and Space"},
    {"id": "energy", "label": "Energy"},
    {"id": "math", "label": "Math"},
    {"id": "general_science", "label": "General Science"},
]


def download(url, dest: Path):
    if dest.exists() and dest.stat().st_size > 1000:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        ["curl", "-fsSL", "-A", "Mozilla/5.0", "--retry", "2", "-o", str(dest), url],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0 or not dest.exists() or dest.stat().st_size < 1000:
        if dest.exists():
            dest.unlink()
        print(f"SKIP download {url} ({result.stderr.strip()[:180]})")
        return
    if dest.read_bytes()[:4] != b"%PDF":
        dest.unlink()
        print(f"SKIP not pdf {url}")
        return
    print(f"saved {dest.name} ({dest.stat().st_size} bytes)")


def super_text(text):
    return text.translate(SUPER)


def sub_text(text):
    return text.translate(SUB)


def line_from_spans(line):
    sizes = [span["size"] for span in line["spans"] if span["text"].strip()]
    main_size = max(sizes) if sizes else 12
    main_ys = [
        span["origin"][1]
        for span in line["spans"]
        if span["text"].strip() and span["size"] > main_size * 0.8
    ]
    base_y = max(main_ys) if main_ys else 0
    parts = []
    for span in line["spans"]:
        text = span["text"]
        if not text:
            continue
        small = span["size"] <= main_size * 0.8
        if span["flags"] & 1 or small:
            if span["origin"][1] > base_y + 0.25:
                text = sub_text(text)
            else:
                text = super_text(text)
        parts.append(text)
    return "".join(parts).strip()


def extract_text(path: Path):
    import fitz

    doc = fitz.open(path)
    lines = []
    for page in doc:
        data = page.get_text("dict")
        for block in data["blocks"]:
            if block.get("type") != 0:
                continue
            for line in block["lines"]:
                text = line_from_spans(line)
                if not text:
                    continue
                if re.fullmatch(r"Page \d+", text):
                    continue
                if re.fullmatch(r"\*+", text):
                    continue
                if text.upper().startswith("ROUND ROBIN"):
                    continue
                if text in {"Middle School"} or re.fullmatch(r"Set \d+", text):
                    continue
                lines.append(text)
    joined = []
    for line in lines:
        if not joined:
            joined.append(line)
            continue
        prev = joined[-1]
        if prev.endswith("-") and line[:1].islower():
            fragment = re.match(r"[a-z]+", line)
            piece = fragment.group(0) if fragment else ""
            suffixes = {
                "ing", "ed", "tion", "sion", "ment", "ness", "ly", "ous", "ive",
                "able", "ible", "ence", "ance", "ity", "ies", "ied", "es", "y",
                "er", "est", "al",
            }
            if piece in suffixes:
                joined[-1] = prev[:-1] + line
            else:
                joined[-1] = prev + line
        elif prev in {"TOSS-UP", "BONUS"} or line in {"TOSS-UP", "BONUS"}:
            joined.append(line)
        else:
            joined[-1] = prev + " " + line
    text = " ".join(joined)
    text = text.split("Before we leave")[0]
    text = text.split("I would like to remind")[0]
    text = text.split("I’d like to remind")[0]
    text = re.sub(r"\s+", " ", text).strip()
    return text


def strip_pronunciation(text):
    return re.sub(r"\s*\[[^\[\]]{1,80}\]", "", text).strip()


def collapse(text, drop_brackets=False):
    if drop_brackets:
        text = strip_pronunciation(text)
    else:
        text = re.sub(r"\[([^\[\]]*)\]", r"(\1)", text)
    text = re.sub(r"\s+", " ", text).strip(" ;,")
    return text


def pretty_answer(text):
    text = collapse(text)
    text = text.strip(" .")
    if not text:
        return text
    upper = text.upper()
    if upper in {"ALL", "NONE", "BOTH", "NEITHER"}:
        return upper
    letters = [c for c in text if c.isalpha()]
    if letters and sum(c.isupper() for c in letters) / len(letters) >= 0.75:
        words = []
        for word in text.split():
            core = re.sub(r"[^A-Za-z0-9]", "", word)
            if core in KEEP_UPPER or (core.isupper() and core.isalpha() and len(core) <= 2):
                words.append(word.upper() if core.isupper() else word)
            elif word.isupper():
                words.append(word.capitalize())
            else:
                words.append(word)
        text = " ".join(words)
    text = re.sub(r"\bAnd\b", "and", text)
    text = re.sub(r"\b(Or|OR)\b", "or", text)
    text = re.sub(r"\b(Of|The|To|For)\b", lambda m: m.group(1).lower(), text)
    return text


def split_commas(text):
    parts = []
    buf = []
    depth = 0
    for ch in text:
        if ch == "(":
            depth += 1
            buf.append(ch)
        elif ch == ")":
            depth = max(0, depth - 1)
            buf.append(ch)
        elif ch == "," and depth == 0:
            parts.append("".join(buf).strip())
            buf = []
        else:
            buf.append(ch)
    tail = "".join(buf).strip()
    if tail:
        parts.append(tail)
    return [p for p in parts if p]


def list_variants(text):
    if re.fullmatch(r"-?\d{1,3}(,\d{3})+(\.\d+)?", text.strip()):
        return []
    nums = re.findall(r"\d+", text)
    if not nums or not re.fullmatch(r"[\d\s,andAND&]+", text):
        return []
    if len(nums) < 2:
        return []
    variants = [
        ", ".join(nums),
        ",".join(nums),
        " and ".join(nums),
        " & ".join(nums),
    ]
    if len(nums) > 2:
        variants.append(", ".join(nums[:-1]) + ", and " + nums[-1])
        variants.append(", ".join(nums[:-1]) + " and " + nums[-1])
    return variants


def following_count(question):
    words = {
        "two": 2,
        "three": 3,
        "four": 4,
        "five": 5,
        "six": 6,
    }
    match = re.search(r"following\s+(two|three|four|five|six)\b", question, re.I)
    if not match:
        return None
    return words[match.group(1).lower()]


def pop_trailing_paren(raw):
    raw = raw.rstrip()
    if not raw.endswith(")"):
        return None, raw
    depth = 0
    for i in range(len(raw) - 1, -1, -1):
        if raw[i] == ")":
            depth += 1
        elif raw[i] == "(":
            depth -= 1
            if depth == 0:
                return raw[i + 1 : -1].strip(), raw[:i].rstrip()
    return None, raw


def should_peel(inside):
    low = inside.lower()
    if "accept" in low or "must" in low or "order" in low or "either" in low:
        return True
    return re.fullmatch(r"[A-Za-z][A-Za-z \-]{1,40}", inside) is not None


def parse_short_answer(raw, question):
    raw = collapse(raw, drop_brackets=False)
    if raw.count("(") > raw.count(")"):
        raw += ")" * (raw.count("(") - raw.count(")"))
    reject = []
    extras = []
    note_bits = []

    while True:
        inside, rest = pop_trailing_paren(raw)
        if inside is None or not rest.strip() or not should_peel(inside):
            break
        raw = rest
        do_split = re.split(r"do not accept\s*:?\s*", inside, maxsplit=1, flags=re.I)
        main = do_split[0].strip(" ;")
        if len(do_split) > 1:
            reject.extend(split_commas(do_split[1]))
        accept_match = re.search(r"accept\s*:\s*(.*)", main, re.I)
        if accept_match:
            extras.extend(split_commas(accept_match.group(1)))
        elif re.fullmatch(r"[A-Za-z][A-Za-z \-]{1,40}", main) and not re.search(r"accept|must|order|either", main, re.I):
            extras.append(main)
        elif main and not re.search(r"accept|must|order|either", main, re.I):
            note_bits.append(main)
        elif main:
            note_bits.append(main)

    primary = pretty_answer(raw)
    accepted = []
    for item in [primary, *extras]:
        cleaned = pretty_answer(item)
        if cleaned:
            accepted.append(cleaned)
            accepted.extend(pretty_answer(v) for v in list_variants(cleaned))
    if primary.upper() == "ALL":
        accepted.extend(["all", "all of them"])
        count = following_count(question)
        if count:
            nums = [str(i) for i in range(1, count + 1)]
            accepted.append(", ".join(nums))
            accepted.append(" and ".join(nums))
            if count > 2:
                accepted.append(", ".join(nums[:-1]) + ", and " + nums[-1])
    elif primary.upper() == "NONE":
        accepted.extend(["none", "none of them"])
    if re.search(r"\bpercent\b", question, re.I) and re.fullmatch(r"-?\d+(\.\d+)?", primary):
        accepted.extend([f"{primary}%", f"{primary} percent"])
    note_text = " ".join(note_bits).lower()
    if re.search(r"\bor\b", primary, re.I) and ("at least one" in note_text or "either one" in note_text):
        accepted.extend(part.strip() for part in re.split(r"\s+or\s+", primary, flags=re.I))
    if "any order" in note_text or "either order" in note_text or "must give both" in note_text:
        chunks = re.split(r"\s+(?:and|or)\s+", primary, flags=re.I)
        if len(chunks) == 2:
            joiner = " or " if re.search(r"\bor\b", primary, re.I) else " and "
            accepted.append(joiner.join(reversed([c.strip() for c in chunks])))
    # unique, keep order
    seen = set()
    reject_clean = []
    reject_keys = set()
    for item in reject:
        cleaned = pretty_answer(item)
        if not cleaned:
            continue
        key = cleaned.lower()
        if key in reject_keys:
            continue
        reject_keys.add(key)
        reject_clean.append(cleaned)
    unique = []
    for item in accepted:
        key = item.lower()
        if key in seen or key in reject_keys:
            continue
        seen.add(key)
        unique.append(item)
    return primary, unique, reject_clean, note_bits


OPT_RE = re.compile(
    r"^(?P<stem>.*)\s+W\)\s*(?P<w>.*?)\s+X\)\s*(?P<x>.*?)\s+Y\)\s*(?P<y>.*?)\s+Z\)\s*(?P<z>.*?)\s*$",
    re.I | re.S,
)
HEAD_RE = re.compile(
    r"^\s*(\d+)\)\s+(.+?)\s+[—–\-]+\s+(Multiple Choice|Short Answer)\s+(.*?)\s*ANSWER:\s*(.+?)\s*$",
    re.I | re.S,
)


def parse_round(text, set_no, year, round_no, failures):
    questions = []
    parts = re.split(r"\b(TOSS-UP|BONUS)\b", text)
    if len(parts) < 3:
        failures.append(f"set {set_no} round {round_no}: no toss-up markers")
        return questions
    index = 1
    while index < len(parts) - 1:
        role_word = parts[index]
        body = parts[index + 1]
        index += 2
        body = re.split(
            r"~{3,}|20\d{2}\s+Regional Science Bowl|Sample Questions",
            body,
            maxsplit=1,
        )[0]
        match = HEAD_RE.match(body.strip())
        if not match:
            failures.append(f"set {set_no} round {round_no} {role_word}: {body[:140]!r}")
            continue
        number = int(match.group(1))
        category_raw = collapse(match.group(2), drop_brackets=True)
        kind = match.group(3).lower()
        payload = collapse(match.group(4), drop_brackets=True)
        answer_raw = match.group(5).strip()
        cat_key = category_raw.lower().replace("  ", " ")
        if cat_key not in CATEGORIES:
            failures.append(f"set {set_no} round {round_no} unknown category {category_raw!r}")
            topic, topic_label = ("general_science", category_raw)
        else:
            topic, topic_label = CATEGORIES[cat_key]
        role = "tossup" if role_word.upper().startswith("TOSS") else "bonus"
        qid = f"s{set_no}-r{round_no:02d}-{('tu' if role == 'tossup' else 'b')}-{number:02d}"
        base = {
            "id": qid,
            "topic": topic,
            "topicLabel": topic_label,
            "role": role,
            "set": set_no,
            "year": year,
            "round": round_no,
            "number": number,
            "source": f"{year} sample set, round {round_no}, {'toss-up' if role == 'tossup' else 'bonus'} {number}",
        }
        if kind.startswith("multiple"):
            opt = OPT_RE.match(payload)
            if not opt:
                failures.append(f"{qid}: multiple choice options not found :: {payload[:160]!r}")
                continue
            options = [collapse(opt.group(k), drop_brackets=True) for k in ("w", "x", "y", "z")]
            if any(not item for item in options):
                failures.append(f"{qid}: blank option")
                continue
            letter_match = re.match(r"^([WXYZ])\)\s*(.*)$", answer_raw, re.I)
            if not letter_match:
                failures.append(f"{qid}: choice answer {answer_raw!r}")
                continue
            letter = letter_match.group(1).upper()
            answer = options["WXYZ".index(letter)]
            stem = collapse(opt.group("stem"), drop_brackets=True)
            if not stem:
                failures.append(f"{qid}: empty stem")
                continue
            base.update({
                "type": "multiple_choice",
                "question": stem,
                "options": options,
                "choice": letter,
                "answer": answer,
                "explanation": f"Official sample choice {letter}. {base['source']}.",
            })
        else:
            primary, accepted, reject, notes = parse_short_answer(answer_raw, payload)
            if not primary:
                failures.append(f"{qid}: empty short answer from {answer_raw!r}")
                continue
            base.update({
                "type": "free_response",
                "question": payload,
                "answer": primary,
                "accept": accepted,
                "explanation": f"Published sample answer. {base['source']}.",
            })
            if reject:
                base["reject"] = reject
            if notes:
                base["answerNote"] = "; ".join(notes)
        questions.append(base)
    return questions


def is_high_school(text):
    head = text[:400].lower()
    return "high school" in head and "middle school" not in head


def main():
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    questions = []
    failures = []
    used_topics = set()
    for set_no, year, round_no, url in SETS:
        dest = PDF_DIR / f"set{set_no}_r{round_no:02d}.pdf"
        download(url, dest)
        if not dest.exists():
            failures.append(f"missing pdf set {set_no} round {round_no}")
            continue
        text = extract_text(dest)
        if is_high_school(text):
            print(f"skip high school file set {set_no} round {round_no}")
            continue
        found = parse_round(text, set_no, year, round_no, failures)
        print(f"set {set_no} round {round_no}: {len(found)} questions")
        if len(found) < 20:
            failures.append(f"set {set_no} round {round_no}: only {len(found)} questions")
        for q in found:
            used_topics.add(q["topic"])
        questions.append(found)

    flat = []
    seen = set()
    for group in questions:
        for q in group:
            if q["id"] in seen:
                failures.append(f"duplicate id {q['id']}")
                continue
            seen.add(q["id"])
            flat.append(q)

    topics = [t for t in TOPICS if t["id"] in used_topics]
    bank = {
        "schemaVersion": 1,
        "event": "National Science Bowl",
        "division": "Middle school",
        "note": "Practice questions are the U.S. Department of Energy National Science Bowl middle school regional sample sets from 2019 through 2022. DOE says to use them as sample questions, because some answers change as science advances.",
        "source": "https://science.osti.gov/wdts/nsb/Regional-Competitions/Resources/MS-Sample-Questions",
        "topics": topics,
        "questions": flat,
    }
    OUT.write_text(json.dumps(bank, indent=2, ensure_ascii=False) + "\n")
    print(f"\nWrote {len(flat)} questions to {OUT}")
    print(f"Failures and warnings: {len(failures)}")
    for item in failures[:80]:
        print(" -", item)


if __name__ == "__main__":
    main()
