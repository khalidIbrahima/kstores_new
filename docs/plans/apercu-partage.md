# Plan — Aperçu d'image au partage d'un lien produit

> Fichier de suivi : tout agent/compte peut reprendre le travail à partir d'ici.
> Dernière mise à jour : 2026-11-19. Branche : `claude/apercu-partage`.

## Signalement (Khalidou, 2026-11-19)

« Quand je partage un lien produit, l'image n'est jamais en aperçu. »

## Constat en production (déploiement du commit 11a0225)

Page testée : `/products/chaise-bureau-avec-led`.

1. `og:image` = `…/_next/image?url=…&w=1200&q=80` → **400 `INVALID_IMAGE_OPTIMIZE_REQUEST`**.
   La même adresse avec `q=75` → 200, `image/jpeg`, 118 Ko. La qualité 80 n'est pas autorisée par l'optimiseur.
2. `og:url` et `og:image` commencent par **`https://kapital-stores.shop`** : valeur de la variable Vercel
   `NEXT_PUBLIC_PRODUCTION_URL`. Seul `kapitalstores.com` est rattaché au projet Vercel, et Khalidou confirme
   que la production est `kapitalstores.com`.
3. `og:image:width/height` annoncent 1200×630 et `type` `image/jpeg` quelle que soit l'image (les photos sont
   souvent carrées, parfois en PNG).

`src/lib/telegram.ts` lit la même variable : les liens des notifications Telegram partent aussi vers l'ancien domaine.

## Correctif

- `src/lib/site.ts` : une seule source pour l'adresse du site (`NEXT_PUBLIC_SITE_URL`, sinon `https://kapitalstores.com`).
  `NEXT_PUBLIC_PRODUCTION_URL` n'est plus lue par le code.
- Page produit : image d'aperçu en `q=75`, adresse du site correcte, dimensions et type retirés.
- `telegram.ts` et `wave.ts` utilisent `SITE_URL`.
- Vercel : `NEXT_PUBLIC_PRODUCTION_URL` corrigée en `https://kapitalstores.com` (plus utilisée par le code, mais
  ne doit pas rester fausse).

## Vérification

- Sur le déploiement de prévisualisation Vercel de la branche : balises de la page produit, puis réponse de l'adresse
  `og:image`.
- Non vérifiable d'ici : le rendu réel dans WhatsApp / Facebook (ils gardent en cache l'aperçu des liens déjà partagés).
