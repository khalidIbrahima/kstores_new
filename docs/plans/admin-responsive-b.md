# Chantier B — Admin mobile 1 (journal)

> Branche `claude/admin-mobile-b`. Harnais : `/tmp/harness-b/harness.py <tag> [pages]` (Playwright, port 3102,
> données factices longues : 24 produits, 40 commandes, 12 catégories, 16 paiements, 900 visites, variantes).
> Captures : `/tmp/harness-b/shots/<tag>-<page>-<état>-<largeur>.png`, mesures : `/tmp/harness-b/<tag>.json`.

## Mesures AVANT (2026-11-18)

`document.body.scrollWidth` = largeur de l'écran sur toutes les pages (360 et 390) : aucun débordement de page,
car toutes les tables sont déjà dans un `overflow-x-auto`. Mais le contenu est caché DANS ces défileurs :

| Page | Problème constaté (360/390) |
|---|---|
| dashboard | KPI en 1 colonne (4 grandes cartes), résumé stock en 1 colonne, tableau « Commandes récentes » à 4 colonnes serré (noms sur 4 lignes), boutons de période ~30 px de haut |
| analytics | OK globalement ; chemins des pages coupés à 150 px alors qu'il reste de la place ; boutons de période petits |
| products (liste) | table `min-w-[1120px]` : sur 360 px on ne voit que la case à cocher + le début du nom ; prix, stock, statut, actions hors écran (il faut faire défiler la table) ; champs en 14 px ; 4 cartes de stats en 1 colonne |
| products/new, [id] (formulaire) | En-tête de variante : 451 px dans une carte de 300 px (bouton supprimer + chevron coupés, `overflow-hidden`) ; lignes d'options : nom écrasé (« Rouge borc »), URL d'image + bouton X coupés ; 4 vignettes d'images secondaires en pleine largeur (≈ 300 px chacune) ; tous les champs en 14 px (zoom iOS) |
| products/[id] (aperçu) | Titre tronqué à 250 px ; 4 cartes (prix/stock/avis/ventes) en 1 colonne ; lignes « Détails » collées (« CategorieÉlectronique ») |
| inventory | table `min-w-[560px]` : colonnes Stock et Statut invisibles sans défilement horizontal — l'info principale de la page ! |
| categories | Modale sans `max-h` ; champs 14 px ; titre `text-3xl` fixe |
| payments | table `min-w-[600px]` : Fournisseur et Statut hors écran ; dates sur 3 lignes |
| reports | Graphique « Revenus par mois » : barres toutes à 4 px (hauteur en % d'un parent sans hauteur — bug aussi sur desktop) ; montant visible seulement au survol |

## Corrections et mesures APRÈS

Mesures après : `body.scrollWidth` = 360 / 390 sur toutes les pages et tous les états testés, 0 élément dépassant
l'écran hors défileur volontaire, 0 champ < 16 px (avant : jusqu'à 8 par page), aucune action cachée derrière un survol.

| Page | Avant 360/390 | Après 360/390 | Corrections | États testés |
|---|---|---|---|---|
| dashboard | 360/390 (rien de débordant, mais tableau serré) | 360/390 | KPI en 2 colonnes (devise peut passer à la ligne), stock 3 colonnes, « Commandes récentes » en lignes cliquables sous md, boutons de période plus grands | 30 j, 7 j |
| analytics | 360/390 | 360/390 | chemins des pages sur toute la largeur, boutons de période plus grands | 30 j, 7 j |
| products (liste) | 360/390, table 1120 px dans un défileur | 360/390 | cartes sous md (case, image, nom 2 lignes, catégorie, prix/promo, stock, bascule Actif, menu « … » en feuille du bas), tri en liste déroulante, en-tête en grille, stats 2 colonnes, modale import bornée | liste, modale import, menu d'actions, sélection (barre groupée) |
| products/new | 360/390 | 360/390 | (via ProductForm) | vide, rempli (promo + 2 variantes + options) |
| products/[id] | 360/390 ; en-tête de variante 451 px coupé | 360/390 | titre complet sur mobile, cartes 2 colonnes, détails avec écart label/valeur, vignettes défilables ; formulaire : lignes d'options sur 2 lignes, puces d'options cachées < sm, 4 petites vignettes, champs 16 px | aperçu, onglet Modifier, variantes dépliées |
| inventory | 360/390, Stock/Statut hors écran | 360/390 | liste sous md avec stock + statut visibles | liste |
| categories | 360/390 | 360/390 | modale `max-h` + corps défilant, champs 16 px, noms/slugs qui passent à la ligne | grille, modale nouvelle, modale modifier |
| payments | 360/390, Fournisseur/Statut hors écran | 360/390 | lignes cliquables vers la commande sous md | liste |
| reports | 360/390, barres à 4 px | 360/390 | barres du graphique avec une vraie hauteur, montant abrégé affiché sur écran tactile, marges réduites | Ventes, Clients, Inventaire |

### Desktop 1440 (comparaison pixel avant/après)
- Identiques : products (liste + modale), products/new (vide + rempli), inventory, payments.
- Différences voulues / neutres :
  - reports : les barres « Revenus par mois » ont désormais leur hauteur (bug corrigé, il touchait aussi le desktop).
  - products/[id] aperçu : écart entre libellé et valeur dans « Détails » (avant « CategorieÉlectronique » collés).
  - categories : un slug très long passe à la ligne un mot plus tôt (les boutons d'action ne rétrécissent plus).
  - dashboard / analytics / products/[id] onglet Modifier : seules diffèrent des données factices liées à l'heure (une barre, des dates).

### Non vérifié / limites
- Pas de vrai téléphone : Chrome en émulation mobile (is_mobile, has_touch). Les éléments `pointer-coarse:` ne
  s'affichent pas dans les captures pleine page de Playwright (vérifié en capture d'écran simple : ils s'affichent).
- En émulation le voile des modales s'arrête 24 px avant le bas (bloc conteneur 776 px pour innerHeight 800) — vu aussi
  sur les autres modales ; probablement propre à l'émulation, à confirmer sur appareil.
- Non testé : téléversement réel d'image, actions serveur (clone, suppression, import), largeurs 640–1023 px (sm/md)
  à part la correction des marges de la barre d'actions collante (`sm:-mx-8` débordait de 8 px avec le `sm:px-6` du layout).
- Cibles encore < 32 px : petits boutons ✕ sur les vignettes d'images (22–24 px), bouton copie d'ID (28 px).
