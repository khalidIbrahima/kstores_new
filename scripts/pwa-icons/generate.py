"""Génère le logo et les icônes de Kapital Stores.

Usage (depuis la racine du dépôt) :
    python3 scripts/pwa-icons/generate.py

Dépendances : Playwright pour Python avec Google Chrome (rendu SVG -> PNG), Pillow (favicon.ico).

Logo « C — badge vert », retenu par Khalidou le 2026-11-19 pour tout le site : K sombre plein sur fond
vert, éclair blanc. Aplats uniquement, sans dégradé ni lueur.

Sorties : public/logo.svg, public/logo-horizontal.svg, public/favicon.ico et public/icons/*.
"""
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
OUT = PUBLIC / "icons"

GREEN, INK, WHITE = "#22c55e", "#0b1220", "#ffffff"
# Boîte englobante du K + éclair dans le repère 512 : x 124..434, y 104..408.
C_CX, C_CY = 279, 256
C_H = 304
C_RADIUS = 217  # distance max centre -> point le plus éloigné (coin haut-gauche de la barre)
# Sans l'éclair (favicon 16 px), le K seul occupe x 124..428.
K_CX = 276

# Les trois tracés du K se chevauchent de 8 px : pas de liseré à leurs jonctions.
K_PATHS = f"""
  <g fill="{INK}">
    <path d="M124 104h92v304h-92z"/>
    <path d="M208 232 320 104h104L208 352z"/>
    <path d="M230 313 294 241 428 408H322z"/>
  </g>"""
BOLT_PATH = f"""
  <path fill="{WHITE}" stroke="{GREEN}" stroke-width="16" stroke-linejoin="round" paint-order="stroke"
        d="M412 168 338 272h42l-30 86 84-116h-44l32-74z"/>"""


def svg(kind: str, bolt: bool = True) -> str:
    """kind: 'any' (carré arrondi, coins transparents), 'maskable' (plein cadre, marque dans la zone sûre),
    'apple' (plein cadre opaque, iOS arrondit lui-même), 'favicon' (carré arrondi, marque plus grande)."""
    V = 512
    rounded = f'<rect width="{V}" height="{V}" rx="{0.22 * V}" fill="{GREEN}"/>'
    full = f'<rect width="{V}" height="{V}" fill="{GREEN}"/>'
    if kind == "any":
        scale, bg = 0.64 * V / C_H, rounded
    elif kind == "favicon":
        scale, bg = 0.74 * V / C_H, rounded
    elif kind == "maskable":
        # Zone sûre : cercle de rayon 0,4 × taille. La marque entière tient dans un rayon de 0,37.
        scale, bg = 0.37 * V / C_RADIUS, full
    elif kind == "apple":
        scale, bg = 0.6 * V / C_H, full
    else:
        raise ValueError(kind)
    cx = C_CX if bolt else K_CX
    mark = K_PATHS + (BOLT_PATH if bolt else "")
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {V} {V}" width="{V}" height="{V}">
{bg}
<g transform="translate({V/2} {V/2}) scale({scale:.4f}) translate({-cx} {-C_CY})">{mark}</g>
</svg>"""


def horizontal_svg() -> str:
    """Badge + nom, pour fond sombre."""
    badge = svg("any").split("\n", 1)[1].rsplit("</svg>", 1)[0]
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 48" role="img" aria-label="Kapital Stores">
<svg x="0" y="0" width="48" height="48" viewBox="0 0 512 512">{badge}</svg>
<text x="60" y="33" font-family="Arial,Helvetica,sans-serif" font-size="25" font-weight="900" font-style="italic" letter-spacing="-0.5" fill="{WHITE}">KAPITAL<tspan fill="{GREEN}">STORES</tspan></text>
</svg>"""


TARGETS = [
    # (fichier, type, taille, éclair)
    ("icon-192.png", "any", 192, True),
    ("icon-512.png", "any", 512, True),
    ("icon-maskable-192.png", "maskable", 192, True),
    ("icon-maskable-512.png", "maskable", 512, True),
    ("apple-touch-icon.png", "apple", 180, True),
    ("favicon-16.png", "favicon", 16, False),  # à 16 px l'éclair n'est qu'une tache : K seul
    ("favicon-32.png", "favicon", 32, True),
    ("favicon-48.png", "favicon", 48, True),
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    # Sources SVG : logo du site et icônes vectorielles.
    (PUBLIC / "logo.svg").write_text(svg("any"))
    (PUBLIC / "logo-horizontal.svg").write_text(horizontal_svg())
    (OUT / "icon.svg").write_text(svg("any"))
    (OUT / "icon-maskable.svg").write_text(svg("maskable"))
    (OUT / "favicon.svg").write_text(svg("favicon"))
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        for name, kind, size, bolt in TARGETS:
            page = b.new_page(viewport={"width": size, "height": size}, device_scale_factor=1)
            content = svg(kind, bolt).replace('width="512" height="512"', f'width="{size}" height="{size}"', 1)
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
