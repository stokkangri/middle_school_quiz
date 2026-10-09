#!/usr/bin/env python3
"""Crop diagrams out of upright starter-pack page images.

crops.json lists boxes as fractions of the page (0 to 1), so the same
crop works if the render scale changes:

  [
    {
      "page": 16,
      "name": "stomata_open_closed",
      "box": [0.02, 0.12, 0.48, 0.88],
      "note": "Open and closed guard cells"
    }
  ]

box is left, top, right, bottom.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
PAGE_DIR = ROOT / "tools" / "work" / "pages"
OUT_DIR = ROOT / "images" / "pack"


def crop_with_fitz(src: Path, dest: Path, box: list[float]) -> None:
    """Crop by slicing samples. Pixmap(src, clip) fails on PyMuPDF 1.28."""
    pix = fitz.Pixmap(str(src))
    left, top, right, bottom = box
    x0 = max(0, min(pix.width - 1, int(pix.width * left)))
    y0 = max(0, min(pix.height - 1, int(pix.height * top)))
    x1 = max(x0 + 1, min(pix.width, int(pix.width * right)))
    y1 = max(y0 + 1, min(pix.height, int(pix.height * bottom)))
    width, height, n = x1 - x0, y1 - y0, pix.n
    src_mv = pix.samples_mv
    stride = pix.stride
    out = bytearray(width * height * n)
    row_bytes = width * n
    for row in range(height):
        start = (y0 + row) * stride + x0 * n
        out[row * row_bytes : (row + 1) * row_bytes] = src_mv[start : start + row_bytes]
    cropped = fitz.Pixmap(pix.colorspace, width, height, bytes(out), pix.alpha)
    dest.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(dest)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=ROOT / "tools" / "crops.json")
    args = parser.parse_args()
    crops = json.loads(args.manifest.read_text(encoding="utf-8"))
    for item in crops:
        src = PAGE_DIR / f"page_{int(item['page']):03d}.png"
        if not src.exists():
            raise SystemExit(f"Missing {src}. Run extract_starter_pack.py first.")
        dest = OUT_DIR / f"{item['name']}.png"
        crop_with_fitz(src, dest, item["box"])
        print(f"{item['page']}: {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
