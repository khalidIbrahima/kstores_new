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

### suppliers, supplier-orders (liste) — commit 2
- Cartes sous `md` avec actions visibles (lien, modifier, supprimer ; cibles ~40 px) ; tableau inchangé dès `md`.
- supplier-orders : carte = lien vers le détail + bouton de dépliage ; les articles dépliés s'affichent en liste
  (quantité × prix = total) avec modifier/supprimer toujours visibles.
- Modales : `max-h-[calc(100dvh-2rem)]`, corps qui défile, pied (Annuler / Enregistrer) toujours visible, boutons pleine largeur sous `sm`.
  Correction d'un défaut existant : `w-full mx-4` dans un conteneur flex collait la modale aux bords de l'écran
  → `w-[calc(100%-2rem)] sm:w-full`.
- Champs en `text-base sm:text-sm` (pas de zoom iOS).
- APRÈS : 360/390 sans débordement, 0 champ < 16 px. Desktop 1440 (liste, dépliage, 2 modales) : identique au pixel.

### supplier-orders/[id] — commit 3
- AVANT : page à **747 px** (360 et 390) — piège `grid lg:grid-cols-3` sans `grid-cols-1` + tableau des articles sans `min-w`.
- `grid-cols-1` + `min-w-0` sur les colonnes ; titre/numéro de commande qui passent à la ligne ou se tronquent.
- Articles : liste sous `md` (quantité × prix, Ads, total USD et XOF, poids, CBM, modifier/supprimer visibles, ligne de total) ;
  tableau inchangé dès `md`.
- Livraisons : nom d'agence et n° de suivi qui passent à la ligne ; boutons modifier/supprimer en 40 px empilés sous `sm`.
- Carte « Total (XOF) » sur 2 colonnes sous `sm` (le montant ne se coupe plus en « F C / FA »).
- Modales article et livraison : hauteur bornée au viewport, pied fixe, largeur avec marges.
- APRÈS : 360/390 sans débordement. Desktop 1440 (page, 2 modales) : identique au pixel.
- Vu hors périmètre : le bouton vert « remonter en haut » (composant global) passe au-dessus du pied des modales sur mobile.

### shipping, newsletter — commit 4
- shipping AVANT : **471 px** à 360/390, et **1500 px à 1440** (email long sans césure dans la grille de cartes).
  Cartes `min-w-0`, email `break-all`, nom/adresse `break-words`, icônes `shrink-0`, actions 40 px sur mobile ;
  titre `text-2xl sm:text-3xl` ; modale bornée au viewport avec pied fixe.
  Desktop : la page ne déborde plus (1440 au lieu de 1500) — seule différence voulue.
- newsletter : cartes sous `md` (email tronqué, source, date, bascule Actif/Désinscrit en 40 px, supprimer toujours visible) ;
  boutons d'en-tête en grille (Exporter | Campagne, puis Ajouter pleine largeur) ; filtres pleine largeur ;
  modales Ajouter/Campagne avec marges et hauteur bornée.
  Desktop : liste et modale Ajouter identiques au pixel ; modale Campagne : différence pixel limitée au rendu
  des champs (comparaison visuelle identique — probablement le curseur/antialiasing).
- APRÈS : 360/390 sans débordement, 0 champ < 16 px.

### support — commit 5
- AVANT : **440 px** à 360/390 (piège `grid lg:grid-cols-2` sans `grid-cols-1` ; montants et date des messages coupés).
- `grid-cols-1` + `min-w-0` ; noms/emails/messages en `[overflow-wrap:anywhere]` (ne change rien quand le texte tient → desktop identique) ;
  montants `whitespace-nowrap` ; libellés WhatsApp / Email visibles aussi sur mobile, boutons 40 px.
- APRÈS : 360/390 sans débordement. Desktop 1440 identique au pixel.
