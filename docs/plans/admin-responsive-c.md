# Chantier C — Admin mobile 2 (suivi)

> Branche `claude/admin-mobile-c`. Plan général : `docs/plans/pwa-admin-mobile.md`.

## Harnais

- Script : `/tmp/harness-c/run.py <tag> [scénarios…] [--desktop]` (Playwright Python, `channel="chrome"`, serveur `next dev -p 3103`).
  Données factices volontairement longues (noms, emails, URL Alibaba, montants à 8 chiffres), 10+ lignes par liste,
  routes `/api/**` simulées (clés IA/Wave, test Wave, `/api/ai`), images `http://img.test/**` et `/_next/image` servies localement.
- Mesures : `document.body.scrollWidth` vs `clientWidth`, éléments dont le bord droit dépasse (hors `overflow-x-auto`),
  nombre de champs de saisie < 16 px.
- Captures : `/tmp/harness-c/shots/{before,after}-<scénario>-<largeur>.png` (+ `-view.png` = écran visible quand une modale est ouverte).
- Comparaison desktop : `/tmp/harness-c/diff.py <scénarios…>` (différence pixel à 1440 px).

## Mesures AVANT (body.scrollWidth à 360 / 390)

| Scénario | 360 | 390 | Problèmes vus |
|---|---|---|---|
| customers / users | 360 | 390 | tableau en défilement horizontal : bouton Admin/Client (seule action) hors écran |
| guest-customers | 360 | 390 | tableau 6 colonnes en défilement horizontal |
| suppliers (+ modale) | 360 | 390 | tableau 6 col. : Modifier/Supprimer hors écran ; champs 14 px |
| supplier-orders (+ dépliage, modales) | 360 | 390 | tableau 8 col. : actions hors écran ; sous-tableau des articles ; modales sans `max-h` dvh |
| supplier-orders/[id] | **747** | **747** | `grid lg:grid-cols-3` sans `grid-cols-1` → page élargie, prix/boutons coupés |
| shipping | **471** | **471** | email long non coupé (aussi 1500 px à 1440 !) |
| newsletter | 361 | 390 | tableau, boutons d'en-tête serrés |
| support | **440** | **440** | `grid lg:grid-cols-2` sans `grid-cols-1` + textes longs |
| ai | 360 | 390 | URL longue coupée dans la bulle ; zone de saisie restait haute après envoi ; hauteur en `100vh` |
| settings (onglet Paiements) | 360 (bouton à 392) | 390 (392) | bouton « Enregistrer » des clés poussé hors écran |
| orders/new | 360 / 361 | 390 | ligne d'article trop serrée à 360 ; champs 14 px |

## Journal par page

### customers, users, guest-customers — commit 1
- Cartes sous `md` (modèle `admin/orders`), tableau inchangé à partir de `md`.
- Bouton Admin/Client : cible de 40 px dans la carte. Recherche en `text-base sm:text-sm`.
- guest-customers : téléphone cliquable (`tel:`) dans la carte mobile ; stats en 2 colonnes sous `sm` (au lieu d'une).
- APRÈS : 360/390 sans débordement. Desktop 1440 : capture identique au pixel.
