#!/usr/bin/env python3
"""Generate Twosome app icons & splash screens from source otter art.

Run from project root:
  python3 scripts/generate-icons.py

Source assets:
  public/graphics/otter-only-logo.png  — two hugging otters (no text)
  public/graphics/otter-logo.png       — otters + hearts + "Twosome" text

Outputs:
  ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png
  ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732{,-1,-2}.png
  android/app/src/main/res/mipmap-*/ic_launcher.png + ic_launcher_round.png
  android/app/src/main/res/drawable/splash.png
  public/icon-192.png + public/icon-512.png
"""

import os
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OTTER = ROOT / "public/graphics/otter-only-logo.png"
OTTER_FULL = ROOT / "public/graphics/otter-logo.png"

CREAM = (250, 245, 240)      # --bg-cream
WARM  = (245, 240, 235)      # --bg-warm
BLUSH = (242, 221, 224)      # --accent-rose-light

if not OTTER.exists():
    print("ERROR: missing", OTTER)
    sys.exit(1)


def make_icon(size: int, padding_ratio: float = 0.16) -> Image.Image:
    """Square icon: cream bg + centered otters, no transparency (App Store reqd)."""
    canvas = Image.new("RGB", (size, size), CREAM)
    src = Image.open(OTTER).convert("RGBA")

    target = int(size * (1 - 2 * padding_ratio))
    src.thumbnail((target, target), Image.LANCZOS)

    x = (size - src.width) // 2
    y = (size - src.height) // 2

    canvas.paste(src, (x, y), src)
    return canvas


def make_splash(size: int) -> Image.Image:
    """Square splash: cream bg + larger otter+text logo centered."""
    canvas = Image.new("RGB", (size, size), CREAM)
    src = Image.open(OTTER_FULL).convert("RGBA")
    target = int(size * 0.42)
    src.thumbnail((target, target), Image.LANCZOS)
    x = (size - src.width) // 2
    y = (size - src.height) // 2
    canvas.paste(src, (x, y), src)
    return canvas


def write(img: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print(f"  wrote {path.relative_to(ROOT)}  ({img.size[0]}x{img.size[1]})")


def main():
    print("Generating iOS App Icon ...")
    ios_icon_dir = ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset"
    # Modern App Icon (single 1024x1024 universal)
    icon_1024 = make_icon(1024)
    write(icon_1024, ios_icon_dir / "AppIcon-1024.png")
    # Keep legacy name for back-compat
    write(icon_1024, ios_icon_dir / "AppIcon-512@2x.png")

    contents = ios_icon_dir / "Contents.json"
    contents.write_text('''{
  "images" : [
    {
      "filename" : "AppIcon-1024.png",
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
''')

    print("\nGenerating iOS Splash ...")
    splash_dir = ROOT / "ios/App/App/Assets.xcassets/Splash.imageset"
    splash = make_splash(2732)
    for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
        write(splash, splash_dir / name)

    print("\nGenerating PWA icons ...")
    write(make_icon(192), ROOT / "public/icon-192.png")
    write(make_icon(512), ROOT / "public/icon-512.png")
    write(make_icon(1024), ROOT / "public/icon-1024.png")
    write(make_icon(180), ROOT / "public/apple-touch-icon.png")  # iOS Safari add-to-home

    print("\nGenerating Android icons ...")
    android_res = ROOT / "android/app/src/main/res"
    if android_res.exists():
        # Android mipmap densities: mdpi=48, hdpi=72, xhdpi=96, xxhdpi=144, xxxhdpi=192
        for density, px in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]:
            icon = make_icon(px, padding_ratio=0.10)
            write(icon, android_res / f"mipmap-{density}/ic_launcher.png")
            write(icon, android_res / f"mipmap-{density}/ic_launcher_round.png")
            # Foreground for adaptive icon (transparent bg version)
            fg = Image.new("RGBA", (px, px), (0, 0, 0, 0))
            src = Image.open(OTTER).convert("RGBA")
            src.thumbnail((int(px * 0.66), int(px * 0.66)), Image.LANCZOS)
            fg.paste(src, ((px - src.width) // 2, (px - src.height) // 2), src)
            write(fg, android_res / f"mipmap-{density}/ic_launcher_foreground.png")

        write(make_splash(2732), android_res / "drawable/splash.png")
    else:
        print("  (android dir not present, skipping)")

    print("\nDone. Don't forget: npx cap sync ios && npx cap sync android")


if __name__ == "__main__":
    main()
