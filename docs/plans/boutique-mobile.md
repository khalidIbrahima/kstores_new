# Boutique : toutes les pages adaptées mobile

## Audit (harnais /tmp/harness-shop, 20 pages × 360/390/1440, données fictives)
- **/checkout** : contenu large de 866 px sur un écran de 390 px (`grid lg:grid-cols-3` sans `grid-cols-1` + nom produit `truncate`). Moitié droite coupée : bouton « Confirmer », totaux et bouton de localisation invisibles. Le récapitulatif arrive après le bouton : on confirme sans voir le total.
- **/products** (360) : barre d'en-tête (tri + bouton filtres) dépasse de 6 px.
- **/products/[slug]** (360) : titre long dépasse de 10 px.
- **/checkout/confirmation/[id]** : numéro de commande dépasse (413 px).
- **/cart** : boutons +/− de 24–28 px, trop petits au doigt.
- Zoom iOS sur les champs : déjà traité globalement (`@supports (-webkit-touch-callout: none)` dans globals.css). Faux positif du harnais Chrome.
- Autres pages : pas de débordement.

## Correctifs
1. /checkout : `grid-cols-1` + `min-w-0`, récapitulatif avec le total et le bouton « Confirmer » (colonne droite collante sur ordinateur, sous le formulaire sur mobile), `autocomplete` / `inputMode`, prix `whitespace-nowrap`.
2. Les autres points ci-dessus.

## État
- [x] checkout : bouton « Confirmer » déplacé sous le total dans le récapitulatif (collant à droite sur ordinateur)
- [x] panier (grille, boutons +/− 40 px, « Prix unitaire » corrigé en « X / unité »), produits, fiche produit, confirmation
- [x] 20 pages × 360/390/1440 = 60 mesures, 0 débordement ; captures checkout 390/1440 et panier 360 vérifiées à l'œil
- Non vérifié : vrai iPhone.
- À trancher par Khalidou : le panier affiche « Livraison : Gratuite » mais la commande « À déterminer ».
