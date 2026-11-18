# Plan — Édition des commandes sur mobile (admin)

> Fichier de suivi : tout agent/compte peut reprendre le travail à partir d'ici.
> Dernière mise à jour : 2026-11-18

## Signalement

Khalidou : « sur mobile je peux pas éditer une commande ».

## Constat en production (2026-11-18)

- Projet Vercel `kstores-new` (équipe `khalids-projects-0e815e32`), prod = commit `6cf35d9` (main).
- Aucune erreur runtime sur 7 jours → pas une panne d'API, c'est un problème d'interface.

## Cause principale (reproduite le 2026-11-18)

Khalidou a précisé : « le design mobile ne donne pas accès à toute la page ».
Reproduit en local (code de prod + données simulées, écran 390 px) : la page détail fait **869 px de large**.
`globals.css` met `overflow-x: hidden` sur `html, body`, donc tout ce qui dépasse est coupé et inaccessible
(prix, « Ajouter un article », boutons).

Origine : `<div className="grid lg:grid-cols-3">` sans `grid-cols-1`. Sous `lg` la colonne implicite est en
`auto` et s'élargit à la largeur du plus long texte en `truncate` (nom de produit, e-mail).
Correctif : `grid-cols-1` + `min-w-0` sur les deux colonnes. Après correctif : 390 px, aucun débordement.

## Autres causes trouvées dans le code


1. `src/app/admin/orders/page.tsx` — la liste est un tableau `min-w-[760px]` en défilement horizontal.
   Le seul lien vers une commande est le chevron de la dernière colonne, hors écran sur téléphone.
2. `src/app/admin/orders/[id]/page.tsx` — le bouton « supprimer un article » est en
   `opacity-0 group-hover:opacity-100`. Tailwind 4 n'applique `hover` que sur les appareils
   `(hover: hover)` : sur écran tactile le bouton reste invisible en permanence.
3. Même page — les modales (client, ajout d'article) n'ont pas de hauteur max ni de défilement interne :
   sur petit écran les boutons Annuler/Enregistrer peuvent sortir de l'écran.
4. Même page — en-tête : le bouton « Supprimer » avec texte comprime le titre et les badges ;
   champs en `text-sm` (14 px) → zoom automatique d'iOS au focus.

## Corrections

- [x] Liste : cartes cliquables sous `md`, tableau conservé à partir de `md`.
- [x] Détail : bouton de suppression d'article toujours visible.
- [x] Détail : modales en `max-h-[calc(100dvh-2rem)]` + corps défilant.
- [x] Détail : en-tête compact sur mobile (bouton Supprimer en icône), champs en 16 px sur mobile.
- [x] `tsc` + `eslint`.

- [x] Détail : `grid-cols-1` + `min-w-0` (page coupée).
- [x] Édition quantité / prix d'un article : `EditItemModal` + `PATCH /api/admin/orders/[orderId]/items/[itemId]`.
- [x] Actions visibles seulement au survol : `pointer-coarse:opacity-100` ajouté dans catégories, newsletter,
  fournisseurs, commandes fournisseurs (liste + détail) et `ProductForm`.

## Bug corrigé au passage — total inchangé après suppression d'un article

Dans `DELETE .../items/[itemId]`, l'« ajustement de base » était calculé APRÈS la suppression
(`total − sous-total restant + remise`), ce qui réabsorbait le montant supprimé : le total de la commande
ne bougeait pas et la ligne « Ajustement » gonflait. L'instantané est maintenant pris AVANT la modification
(`readOrderTotals` puis `writeOrderTotals`), pour DELETE comme pour PATCH. La remise plafonnée est aussi persistée.

## Vérification

- Harnais local : `next dev` + Playwright (Chrome), Supabase et API admin simulés, 360 / 390 / 1440 px.
  Vérifié : aucun débordement, modale d'édition dans l'écran, édition d'article et « Marquer comme payée »
  (appels API corrects, interface mise à jour), bouton de suppression visible au tactile.
- Non vérifié : les routes API contre la vraie base (calcul du total côté serveur relu, pas exécuté).
  À valider sur la preview Vercel avec une commande de test.

## Points ouverts

- D'autres pages admin peuvent avoir le même défaut de grille (`grid lg:grid-cols-N` sans `grid-cols-1`) : non audité.
