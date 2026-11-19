# Plan — En-tête de la boutique coupé sur iPhone

> Fichier de suivi : tout agent/compte peut reprendre le travail à partir d'ici.
> Dernière mise à jour : 2026-11-19. Branche : `claude/entete-mobile`.

## Signalement (Khalidou, 2026-11-19, capture d'écran iPhone)

« L'en-tête est coupé sur mobile » : sur `/products`, le logo et les icônes de la barre du haut se trouvent
sous l'heure et la batterie du téléphone. La capture ne montre aucune barre de navigateur : la page est affichée en
plein écran (site ouvert depuis l'écran d'accueil).

## Constat en production (commit a4502d9)

- Toutes les pages envoient `viewport-fit=cover` : la page peut s'étendre sous la barre d'état du téléphone.
- `<nav class="sticky top-0 …">` de la boutique n'a aucune marge de zone sûre (`env(safe-area-inset-top)`).
  L'admin, lui, l'a déjà (`AdminShell`, ajouté avec la PWA).
- Ce défaut existait avant les PR de cette semaine (`viewport-fit=cover` était déjà dans l'ancien `<meta>`).

## Correctif

Marges de zone sûre sur les éléments fixes ou collants de la boutique. `env(safe-area-inset-*)` vaut 0 quand le
navigateur réserve lui-même la barre d'état, donc rien ne change dans Safari ou sur ordinateur.

- `Navbar` : `padding-top` = zone sûre du haut (le fond de la barre passe sous l'heure, le contenu reste dessous).
- Tiroir des filtres (`ProductsClient`), notifications (`ToastProvider`), bouton « haut de page », pied de page :
  marges haut / bas correspondantes.

## Vérification

Chrome avec zones sûres simulées (CDP `Emulation.setSafeAreaInsetsOverride`, haut 59 px, bas 34 px) à 390 px,
et contrôle sans zone sûre à 390 et 1440 px (aucun changement attendu).
Non vérifié : un vrai iPhone.

## Deuxième défaut trouvé pendant le test : les barres « collantes » ne collaient pas

En faisant défiler la page dans le test, l'en-tête partait avec le contenu alors qu'il est déclaré `sticky top-0`.
Cause : `html, body { overflow-x: hidden }` dans `globals.css` transforme `html`/`body` en conteneurs de défilement,
ce qui neutralise `position: sticky`. Étaient touchés : l'en-tête de la boutique, la barre du haut de l'admin, la barre
d'actions du formulaire produit (`sticky bottom-0`) et les récapitulatifs du panier, du paiement et de « Nouvelle commande ».

Correctif : `overflow-x: clip` (même masquage du débordement horizontal, sans créer de conteneur de défilement),
avec `hidden` conservé en repli pour les navigateurs qui ne connaissent pas `clip`.

## Résultats (2026-11-19)

- Zone sûre simulée (haut 59 px) à 390 px : `padding-top` de l'en-tête = 59 px, logo à 73 px du haut (14 px sans zone sûre).
- Sans zone sûre, mobile 390 px et desktop 1440 px : en-tête inchangé (65 px de haut).
- Après défilement de 400 px : l'en-tête reste en haut dans les trois cas (avant : il remontait de 400 px).
- Admin : la barre du haut reste collée ; aucun défilement horizontal possible (`scrollX` reste à 0).
- Suites admin B et C relancées après le changement global : 121 mesures, 0 débordement.
- Non vérifié : un vrai iPhone ; l'aspect de la barre d'actions du formulaire produit maintenant qu'elle colle en bas.
