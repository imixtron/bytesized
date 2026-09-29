"""Builds the final Bytesized logo SVGs (text outlined, no font dependency).
Geometry matches the approved logo concept 1 "The Bite".
Wordmark renamed bitesized → bytesized on 2026-09-29 (spelling only, same design).
Glyph outlines: Unbounded ExtraBold (SIL OFL), cached in .glyphs-unbounded-800.json.
Run: python3 build_assets.py"""
import json, pathlib

HERE = pathlib.Path(__file__).parent
G = json.loads((HERE / ".glyphs-unbounded-800.json").read_text())
ORANGE, CREAM, CHAR = "#C84A27", "#F4F0E6", "#222222"


def badge(w, h, r, fill, ink, glyph, name):
    bx, by, br = w - 2, 2, h * 0.30
    x1, y1, x2, y2 = G[glyph]["bb"]
    # centre at (0.47w, 0.5h) on the ascender-to-baseline band, so descenders (the "y") don't lift the word;
    # 1.326 is the round-letter overshoot below the baseline, keeping the approved position exactly
    bottom = min(y2, 1.326)
    tx, ty = w * 0.47 - (x1 + x2) / 2, h * 0.5 - (y1 + bottom) / 2
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
  <title>{name}</title>
  <defs><mask id="bite">
    <rect width="{w}" height="{h}" fill="#fff"/>
    <circle cx="{bx}" cy="{by + br*0.9:.2f}" r="{br:.2f}" fill="#000"/>
    <circle cx="{bx - br*0.95:.2f}" cy="{by}" r="{br*0.85:.2f}" fill="#000"/>
    <circle cx="{bx - br*0.2:.2f}" cy="{by - br*0.1:.2f}" r="{br*0.95:.2f}" fill="#000"/>
  </mask></defs>
  <rect width="{w}" height="{h}" rx="{r}" fill="{fill}" mask="url(#bite)"/>
  <path transform="translate({tx:.2f} {ty:.2f})" fill="{ink}" d="{G[glyph]["d"]}"/>
</svg>
'''
    (HERE / "svg" / f"{name}.svg").write_text(svg)
    return name


made = [
    badge(640, 170, 36, CHAR, CREAM, "word", "bytesized-logo-on-orange"),
    badge(640, 170, 36, CREAM, CHAR, "word", "bytesized-logo-on-charcoal"),
    badge(150, 150, 34, CREAM, CHAR, "b", "bytesized-mark-on-charcoal"),
    badge(150, 150, 34, CHAR, CREAM, "b", "bytesized-mark-on-orange"),
]
print("\n".join(made))
