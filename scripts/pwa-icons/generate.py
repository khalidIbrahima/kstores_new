"""Génère les icônes de Kapital Stores.

Icônes de l'application (any, maskable, apple-touch) : piste « C — badge vert » retenue par Khalidou le
2026-11-19 — K sombre plein sur fond vert, éclair blanc. Aplats uniquement, sans dégradé ni lueur.
Favicons (onglet du navigateur, tout le site) : encore l'ancienne marque de public/logo.svg, tant que
le changement de logo pour l'ensemble du site n'est pas décidé.

Usage (depuis la racine du dépôt) :
    python3 scripts/pwa-icons/generate.py

Dépendances : Playwright pour Python avec Google Chrome (rendu SVG -> PNG), Pillow (favicon.ico).
La marque (barre du K, deux bras, éclair blanc, point « S ») reprend exactement les tracés de
public/logo.svg ; seuls l'échelle, le fond (plein cadre ou carré arrondi) et les effets
(lueur, trame « circuit ») changent selon la taille et l'usage.
"""
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "icons"

# Boîte englobante de la marque dans le repère 512 de logo.svg : x 138..386, y 128..384.
MARK_CX, MARK_CY = 262, 256
MARK_H = 256
MARK_RADIUS = 176  # distance max centre -> point le plus éloigné de la marque (coin haut-gauche de la barre)

DEFS = """
  <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#22c55e"/><stop offset="100%" stop-color="#16a34a"/>
  </linearGradient>
  <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#111827"/><stop offset="100%" stop-color="#060a13"/>
  </linearGradient>
  <linearGradient id="g3" x1="50%" y1="0%" x2="50%" y2="100%">
    <stop offset="0%" stop-color="#22c55e" stop-opacity="0.9"/><stop offset="100%" stop-color="#15803d" stop-opacity="0.9"/>
  </linearGradient>
  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="5" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
"""


# --- Piste C : badge vert -------------------------------------------------------------------------
GREEN, INK, WHITE = "#22c55e", "#0b1220", "#ffffff"
# Boîte englobante du K + éclair dans le repère 512 : x 124..434, y 104..408.
C_CX, C_CY = 279, 256
C_H = 304
C_RADIUS = 217  # distance max centre -> point le plus éloigné (coin haut-gauche de la barre)
C_MARK = f"""
  <g fill="{INK}">
    <path d="M124 104h92v304h-92z"/>  <!-- 8 px sous le bras : pas de liseré -->
    <path d="M208 232 320 104h104L208 352z"/>
    <path d="M230 313 294 241 428 408H322z"/>  <!-- chevauche le bras de 8 px : pas de liseré à la jonction -->
  </g>
  <path fill="{WHITE}" stroke="{GREEN}" stroke-width="16" stroke-linejoin="round" paint-order="stroke"
        d="M412 168 338 272h42l-30 86 84-116h-44l32-74z"/>"""


def app_icon_svg(kind: str) -> str:
    """kind: 'any' (carré arrondi, coins transparents), 'maskable' (plein cadre, marque dans la zone sûre),
    'apple' (plein cadre opaque, iOS arrondit lui-même)."""
    V = 512
    if kind == "any":
        scale = 0.64 * V / C_H
        bg = f'<rect width="{V}" height="{V}" rx="{0.22 * V}" fill="{GREEN}"/>'
    elif kind == "maskable":
        # Zone sûre : cercle de rayon 0,4 × taille. La marque entière tient dans un rayon de 0,37.
        scale = 0.37 * V / C_RADIUS
        bg = f'<rect width="{V}" height="{V}" fill="{GREEN}"/>'
    elif kind == "apple":
        scale = 0.6 * V / C_H
        bg = f'<rect width="{V}" height="{V}" fill="{GREEN}"/>'
    else:
        raise ValueError(kind)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {V} {V}" width="{V}" height="{V}">
{bg}
<g transform="translate({V/2} {V/2}) scale({scale:.4f}) translate({-C_CX} {-C_CY})">{C_MARK}</g>
</svg>"""


# --- Ancienne marque (favicons seulement) ---------------------------------------------------------
def mark(glow: bool, dot: bool = True) -> str:
    f = ' filter="url(#glow)"' if glow else ""
    # Sans lueur, les bras sont rendus opaques pour rester nets aux petites tailles.
    arm = "url(#g3)" if glow else "#1fb455"
    dot_svg = (
        f'<circle cx="368" cy="356" r="18" fill="url(#g1)"{f}/>'
        '<circle cx="368" cy="356" r="9" fill="#ffffff" opacity="0.85"/>'
    ) if dot else ""
    return f"""
  <g{f}>
    <rect x="138" y="128" width="42" height="256" rx="8" fill="url(#g1)"/>
    <path d="M180 248 L180 188 L340 128 L340 172 Z" fill="{arm}"/>
    <path d="M180 264 L180 324 L340 384 L340 340 Z" fill="{arm}"/>
    <path d="M280 168 L248 252 L280 244 L252 344 L312 240 L276 248 Z" fill="#ffffff" opacity="0.95"/>
  </g>
  {dot_svg}"""


def circuit(view: int) -> str:
    # Trame « circuit » de logo.svg, rapportée au cadre `view`.
    k = view / 512
    lines = "".join(
        f'<line x1="{60*k}" y1="{y*k}" x2="{452*k}" y2="{y*k}"/>' for y in (140, 200, 312, 372)
    ) + "".join(
        f'<line x1="{x*k}" y1="{60*k}" x2="{x*k}" y2="{452*k}"/>' for x in (120, 256, 392)
    )
    return f'<g stroke="#22c55e" stroke-width="{1.2*k}" opacity="0.08">{lines}</g>'


def svg(kind: str, detail: bool, dot: bool = True) -> str:
    if kind != "favicon":
        return app_icon_svg(kind)
    V = 512
    if kind in ("any", "favicon"):
        # La marque occupe 62 % de la hauteur (53 % dans logo.svg) ; 72 % pour le favicon, minuscule à l'écran.
        scale = (0.72 if kind == "favicon" else 0.62) * V / MARK_H
        rx = 0.2 * V
        bg = (f'<rect width="{V}" height="{V}" rx="{rx}" fill="url(#g2)"/>'
              f'<rect x="3" y="3" width="{V-6}" height="{V-6}" rx="{rx-3}" fill="none" stroke="url(#g1)" stroke-width="5" opacity="0.45"/>')
    elif kind == "maskable":
        # Zone sûre : cercle de rayon 0,4 × taille. On place la marque entière dans un rayon de 0,37.
        scale = 0.37 * V / MARK_RADIUS
        bg = f'<rect width="{V}" height="{V}" fill="url(#g2)"/>'
    elif kind == "apple":
        scale = 0.58 * V / MARK_H
        bg = f'<rect width="{V}" height="{V}" fill="url(#g2)"/>'
    else:
        raise ValueError(kind)
    trace = circuit(V) if detail else ""
    body = mark(glow=detail, dot=dot)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {V} {V}" width="{V}" height="{V}">
<defs>{DEFS}</defs>
{bg}
{trace}
<g transform="translate({V/2} {V/2}) scale({scale:.4f}) translate({-MARK_CX} {-MARK_CY})">{body}</g>
</svg>"""


TARGETS = [
    # (fichier, type, taille, détails)
    ("icon-192.png", "any", 192, True),
    ("icon-512.png", "any", 512, True),
    ("icon-maskable-192.png", "maskable", 192, True),
    ("icon-maskable-512.png", "maskable", 512, True),
    ("apple-touch-icon.png", "apple", 180, True),
    ("favicon-16.png", "favicon", 16, False),
    ("favicon-32.png", "favicon", 32, False),
    ("favicon-48.png", "favicon", 48, False),
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    # Sources SVG conservées pour la relecture / la retouche.
    (OUT / "icon.svg").write_text(svg("any", True))
    (OUT / "icon-maskable.svg").write_text(svg("maskable", True))
    (OUT / "favicon.svg").write_text(svg("favicon", False))
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        for name, kind, size, detail in TARGETS:
            page = b.new_page(viewport={"width": size, "height": size}, device_scale_factor=1)
            content = svg(kind, detail, dot=size > 16).replace(f'width="512" height="512"', f'width="{size}" height="{size}"', 1)
            page.set_content(f'<html><body style="margin:0;background:transparent">{content}</body></html>')
            page.screenshot(path=str(OUT / name), omit_background=(kind in ("any", "favicon")),
                            clip={"x": 0, "y": 0, "width": size, "height": size})
            page.close()
        b.close()
    # Images opaques : on retire le canal alpha pour maskable / apple (exigé par iOS, recommandé pour maskable).
    for name, kind, _, _ in TARGETS:
        im = Image.open(OUT / name)
        if kind not in ("any", "favicon"):
            im.convert("RGB").save(OUT / name, optimize=True)
        else:
            im.convert("RGBA").save(OUT / name, optimize=True)
    icons = [Image.open(OUT / f"favicon-{s}.png").convert("RGBA") for s in (16, 32, 48)]
    icons[2].save(ROOT / "public" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=icons[:2])
    for f in sorted(OUT.iterdir()):
        print(f.relative_to(ROOT), Image.open(f).size if f.suffix == ".png" else "")


if __name__ == "__main__":
    main()
