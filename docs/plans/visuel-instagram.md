# Visuel Instagram d'un produit (admin)

Demande (25/11/2026) : générer depuis la boutique une fiche produit pour Instagram. Choix validé : bouton « Visuel Instagram » sur la fiche produit de l'admin, post 1080×1350 + story 1080×1920, style des visuels de marque (canvas « Kapital Stores — visuels Instagram »), photo + nom + prix (+ ancien prix barré si promo) + lien boutique ; partage depuis le téléphone ou téléchargement.

## Conception
- `src/lib/instagram-visual.ts` : dessin Canvas 2D (pas html2canvas : plus fiable, texte net). Police Archivo (OFL) servie depuis `public/fonts/`, chargée par FontFace.
- Photo chargée via `/_next/image` (même origine) pour ne pas « salir » le canvas avec une image d'un autre domaine ; à défaut, logo.
- `src/components/admin/InstagramVisualModal.tsx` : génère les deux images à l'ouverture, aperçu, « Partager » (navigator.share avec fichiers, le geste de l'utilisateur est frais car les fichiers sont déjà prêts) et « Télécharger ».
- Bouton dans la barre d'actions de `src/app/admin/products/[id]/page.tsx`.
- Promo : même règle que ProductCard (`promotion_active && promotion_percentage && old_price > price`).

## État
- [x] code
- [x] rendu vérifié en local (post/story, nom long, promo, sans photo) ; ancien prix barré à côté du prix (taille du prix réduite au besoin)
- [ ] PR
