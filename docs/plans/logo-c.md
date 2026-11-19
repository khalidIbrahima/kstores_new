# Plan — Nouveau logo « C » sur tout le site

> Fichier de suivi : tout agent/compte peut reprendre le travail à partir d'ici.
> Dernière mise à jour : 2026-11-19. Branche : `claude/pwa-admin-mobile` (PR #4).

## Décision (Khalidou, 2026-11-19)

La piste « C — badge vert » (K sombre plein sur fond vert `#22c55e`, éclair blanc) devient le logo de
**toute la boutique**, pas seulement de l'application admin : « Oui toute ».

## Où le logo apparaît

| Endroit | Fichier | Action |
|---|---|---|
| En-tête et pied de page de la boutique, barre et menu de l'admin | `public/logo.svg` (chargé par `Navbar`, `Footer`, `AdminShell`) | remplacé |
| Logo horizontal (non référencé dans `src`) | `public/logo-horizontal.svg` | remplacé, pour cohérence |
| Onglet du navigateur | `public/favicon.ico`, `public/icons/favicon-*.png`, `favicon.svg` | régénérés (16 px : K seul, l'éclair est illisible à cette taille) |
| Icône d'application | `public/icons/icon-*.png`, `apple-touch-icon.png` | déjà fait (commit fc8664e) |
| Facture | `LOGO_MARK` dans `src/lib/invoice.ts` | remplacé |
| E-mails | `src/lib/email-layout.ts` | rien à faire : l'en-tête des e-mails est du texte (« KAPITAL STORES »), sans image |
| Ancien logo e-mail en SVG | `src/lib/email-logo.ts` (importé nulle part) | marque remplacée, pour ne pas laisser l'ancien logo traîner |

## Point d'attention : `DynamicFavicon`

`src/components/DynamicFavicon.tsx` remplaçait l'icône d'onglet par `store_settings.favicon_url`. En base, ce champ
pointe vers un ancien `favicon.ico` déposé dans Supabase Storage : sans changement, l'ancien logo reviendrait dans
l'onglet après le chargement de la page. Aucun écran de l'admin ne permet de modifier ce champ.
→ Le composant est retiré ; la base n'est pas modifiée (les valeurs `logo_url` / `favicon_url` restent, inutilisées).

## Génération

`python3 scripts/pwa-icons/generate.py` produit toutes les icônes, les favicons et les deux logos SVG.

## Avancement

- [x] Script de génération (toutes les sorties en piste C)
- [x] `logo.svg`, `logo-horizontal.svg`, favicons
- [x] Facture, ancien logo e-mail
- [x] Retrait de `DynamicFavicon`
- [x] Vérification visuelle (en-tête / pied de page mobile et desktop, admin, facture, favicons)
