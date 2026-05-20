#!/usr/bin/env python3
"""Resize + quantize all decorative PNGs in public/graphics/.

Resizes anything > MAX_DIM down to MAX_DIM (long edge), then runs pngquant
for palette compression. Keeps the otter logo PNGs at higher res because
they're the brand identity and appear larger.

Run from project root:
  python3 scripts/compress-graphics.py
"""

import os
import subprocess
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
GFX = ROOT / "public/graphics"

# Files where we keep higher resolution (brand identity, used at larger sizes)
HIGH_RES = {"otter-logo.png", "otter-only-logo.png", "twosome-text-logo.png"}
HIGH_RES_MAX = 700
DEFAULT_MAX = 560  # ~280pt @ 2x — enough for retina at the sizes these are used

PNGQUANT_QUALITY = "65-90"


def resize_inplace(p: Path, max_dim: int) -> bool:
    img = Image.open(p).convert("RGBA")
    w, h = img.size
    if max(w, h) <= max_dim:
        return False
    img.thumbnail((max_dim, max_dim), Image.LANCZOS)
    img.save(p, "PNG", optimize=True)
    return True


def pngquant_inplace(p: Path) -> int:
    """Run pngquant on the file in-place. Returns new size or -1 on skip."""
    before = p.stat().st_size
    tmp = p.with_suffix(".pngquant.tmp")
    try:
        subprocess.run(
            ["pngquant", "--quality", PNGQUANT_QUALITY, "--strip", "--force",
             "--output", str(tmp), str(p)],
            check=True, capture_output=True
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        return -1
    after = tmp.stat().st_size
    if after < before:
        tmp.replace(p)
        return after
    tmp.unlink(missing_ok=True)
    return before


def main():
    if not GFX.exists():
        print("Missing", GFX); sys.exit(1)

    total_before = 0
    total_after = 0
    files = sorted(p for p in GFX.iterdir() if p.suffix.lower() == ".png")

    for p in files:
        before = p.stat().st_size
        total_before += before
        max_dim = HIGH_RES_MAX if p.name in HIGH_RES else DEFAULT_MAX
        resized = resize_inplace(p, max_dim)
        new_size = pngquant_inplace(p)
        if new_size < 0:
            new_size = p.stat().st_size
        total_after += new_size
        pct = 100 * (before - new_size) / before if before else 0
        note = " (resized)" if resized else ""
        print(f"  {p.name:<32} {before//1024:>4}KB -> {new_size//1024:>4}KB  -{pct:4.1f}%{note}")

    saved_kb = (total_before - total_after) // 1024
    pct = 100 * (total_before - total_after) / total_before if total_before else 0
    print(f"\nTotal: {total_before//1024}KB -> {total_after//1024}KB  saved {saved_kb}KB ({pct:.1f}%)")


if __name__ == "__main__":
    main()
