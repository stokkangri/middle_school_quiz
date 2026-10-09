#!/usr/bin/env python3
"""Turn Botany2027StarterPack.pdf into upright page images and OCR text.

The PDF is a deck of full-page slide images stored sideways. This script
rotates each page upright, saves a PNG, and runs Tesseract so later tools
can find diagrams and build practice questions.

Usage:
  python3 tools/extract_starter_pack.py
  python3 tools/extract_starter_pack.py --pages 10-20
  python3 tools/extract_starter_pack.py --ocr-only
"""

from __future__ import annotations

import argparse
import re
import subprocess
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PDF = ROOT / "Botany2027StarterPack.pdf"
WORK = ROOT / "tools" / "work"
PAGE_DIR = WORK / "pages"
OCR_DIR = WORK / "ocr"

# Slides are portrait pixels placed on their side. +90 degrees makes titles readable.
ROTATION = 90


def parse_pages(spec: str, count: int) -> list[int]:
    if not spec:
        return list(range(count))
    chosen: list[int] = []
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            chosen.extend(range(int(start) - 1, int(end)))
        else:
            chosen.append(int(part) - 1)
    return [n for n in chosen if 0 <= n < count]


def render_page(page: fitz.Page, dest: Path, scale: float, rotation: int) -> None:
    matrix = fitz.Matrix(scale, scale).prerotate(rotation)
    pix = page.get_pixmap(matrix=matrix, alpha=False)
    dest.parent.mkdir(parents=True, exist_ok=True)
    pix.save(dest)


def ocr_image(image: Path, text_path: Path) -> str:
    text_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "tesseract",
            str(image),
            str(text_path.with_suffix("")),
            "--psm",
            "6",
            "-l",
            "eng",
        ],
        check=True,
        capture_output=True,
    )
    return text_path.read_text(encoding="utf-8", errors="replace")


def heading_line(text: str) -> str:
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
    lines = [line for line in lines if len(line) > 2]
    skip = ("BOTANY B/C", "STARTER PACK", "KEY TERMS", "DIVISION")
    for line in lines[:8]:
        upper = line.upper()
        if any(flag in upper for flag in skip):
            continue
        if len(line) < 60:
            return line
    return lines[0][:80] if lines else "(no text)"


def division_flag(text: str) -> str:
    upper = text.upper()
    has_b = "DIVISION B" in upper
    has_c = "DIVISION C" in upper
    if has_b and has_c:
        return "B+C"
    if has_c and not has_b:
        return "C"
    if has_b:
        return "B"
    return ""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path, default=DEFAULT_PDF)
    parser.add_argument("--pages", default="", help="1-based pages, e.g. 4-12,20")
    parser.add_argument("--scale", type=float, default=1.6)
    parser.add_argument("--rotation", type=int, default=ROTATION, help="Degrees clockwise. Slides need 90; exam pages need 0.")
    parser.add_argument("--ocr-only", action="store_true", help="OCR PNGs already in tools/work/pages")
    args = parser.parse_args()

    doc = fitz.open(args.pdf)
    page_numbers = parse_pages(args.pages, doc.page_count)
    index_rows = ["page\tdivision\theading\timage"]

    for number in page_numbers:
        image = PAGE_DIR / f"page_{number + 1:03d}.png"
        text_path = OCR_DIR / f"page_{number + 1:03d}.txt"
        if not args.ocr_only or not image.exists():
            render_page(doc[number], image, args.scale, args.rotation)
        text = ocr_image(image, text_path)
        division = division_flag(text)
        title = heading_line(text)
        index_rows.append(f"{number + 1}\t{division}\t{title}\t{image.name}")
        print(f"{number + 1:3d}  {division or '-':3s}  {title}")

    index_path = WORK / f"page_index_rot{args.rotation}.tsv"
    index_path.write_text("\n".join(index_rows) + "\n", encoding="utf-8")
    print(f"Wrote {index_path}")


if __name__ == "__main__":
    main()
