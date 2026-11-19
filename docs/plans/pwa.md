# Chantier A — PWA (journal de bord)

> Branche `claude/pwa` (partie de `claude/pwa-admin-mobile`). Worktree : `/home/claude/wt/pwa`.
> Plan général : `docs/plans/pwa-admin-mobile.md`. Dernière mise à jour : 2026-11-18 (chantier terminé, à relire).

## Changement de périmètre (2026-11-18, réponse de Khalidou)

« **Admin only for now.** » — remplace la décision « deux applications installables » du plan général :
- **une seule application installable : l'admin** (`/admin`) ;
- la boutique publique n'est **pas** installable : pas de `<link rel="manifest">`, pas de service worker, pas d'invite
  d'installation. Elle garde un favicon et une `apple-touch-icon` normaux ;
- service worker enregistré **seulement depuis l'admin**, portée `/admin` ;
- les anciennes inscriptions du worker à la portée `/` (site en production actuel) doivent être neutralisées.

Les éléments « boutique » commencés avant ce changement (manifeste boutique `app/manifest.ts`, bandeau d'installation
boutique) ont été supprimés, pas laissés inutilisés.

## Constat de départ

- `public/icon-192.png`, `icon-512.png`, `favicon.png` : PNG RGB, coin (0,0) = blanc → carré blanc autour du logo,
  marque petite (53 % du carré dans `logo.svg`, lui-même en retrait de 16 px pour l'ombre).
- `public/manifest.json` : admin, `scope: "/"`, `theme_color` vert, pas d'`id`, pas d'icône maskable, lié depuis
  le layout racine → **toutes** les pages (boutique comprise) annonçaient l'app admin.
- `public/sw.js` (`ks-admin-v1`) : précache `/admin`, met en cache **toutes** les GET de même origine, pages admin et
  réponses RSC comprises (vérifié : 50+ entrées `/admin/...?_rsc=...` dans Cache Storage) → données privées stockées.
- `src/app/layout.tsx` : `<meta name="viewport">` à la main avec `maximum-scale=1, user-scalable=no`.
- `src/app/admin/layout.tsx` : composant client → ne peut pas exporter `metadata`.
- `src/app/icon.svg` existe mais n'est pas lié : Next 16 n'ajoute les icônes « fichier » que si `metadata.icons`
  n'est pas défini (`node_modules/next/dist/lib/metadata/resolve-metadata.js`, l. 795-807). Laissé tel quel.
- Next 16.1.6, pas de `node_modules/next/dist/docs`. Lu à la place : `lib/metadata/types/metadata-interface.d.ts`
  (export `viewport` séparé ; `themeColor`/`viewport` dans `metadata` dépréciés), `manifest-types.d.ts`,
  `build/webpack/loaders/metadata/discover.js` (`app/manifest.ts` reconnu **seulement à la racine**),
  `lib/metadata/generate/basic.js` (`appleWebApp.capable` n'émet que `mobile-web-app-capable`).

## Ce qui a été fait

### Icônes (`public/icons/`, générateur `scripts/pwa-icons/generate.py`)
- Même marque que `logo.svg` (barre du K, deux bras, éclair blanc, point « S », mêmes tracés et couleurs), rendue
  avec Chrome headless (Playwright) puis Pillow. Trame « circuit » et lueur gardées pour ≥ 180 px, retirées des favicons.
- `icon-192/512.png` (`any`) : carré arrondi plein cadre, coins transparents, marque à 62 % de la hauteur.
- `icon-maskable-192/512.png` : fond sombre plein cadre opaque, marque entière dans un rayon de **0,367 × taille**
  (mesuré sur les pixels) < 0,40 (zone sûre) ; hauteur de la marque 54 %.
- `apple-touch-icon.png` 180×180 opaque, marque à 58 %.
- `favicon.svg` (simplifié, sans filtres), `public/favicon.ico` (16/32/48), `favicon-16/32/48.png`.
- Supprimés : `public/icon-192.png`, `public/icon-512.png`, `public/favicon.png` (plus référencés).
- Aperçus : `/tmp/harness-pwa/icons-preview-light.png`, `icons-preview-dark.png` (taille réelle + masques cercle,
  carré arrondi, cercle 80 %), `favicons-x8.png`.

### Manifeste admin (`public/manifest.json`)
- Gardé à la **même URL** que l'ancien : les installations existantes (WebAPK Android) retrouvent leur manifeste.
- `id: "/admin"` = l'identifiant que Chrome avait déjà calculé pour l'ancien manifeste (sans `id`, id = start_url)
  → mise à jour des installations existantes au lieu d'un doublon (CDP `Page.getAppId` : appId `…/admin`).
- `name` « Kapital Stores Admin », `short_name` « KS Admin », `start_url`/`scope` `/admin`, `display: standalone`,
  `lang: fr`, `background_color #060a13`, `theme_color #111827` (barre du haut admin), icônes any + maskable,
  raccourcis Commandes (`/admin/orders`) et Produits (`/admin/products`).

### Métadonnées
- `src/app/layout.tsx` : plus de manifeste, plus d'`appleWebApp` ni de `mobile-web-app-capable` (la boutique ne
  s'annonce plus comme app) ; icônes `favicon.ico` + `icons/favicon.svg` + `apple-touch-icon` ; export `viewport`
  (`width=device-width, initial-scale=1, viewport-fit=cover`, `themeColor #0a0f1a`, `colorScheme dark`).
- Zoom : `maximum-scale=1, user-scalable=no` retirés. Seule raison concrète trouvée de les garder : éviter le zoom
  automatique d'iOS sur les champs < 16 px (beaucoup de `text-sm` dans l'admin). Remplacé par une règle CSS limitée
  à iOS (`@supports (-webkit-touch-callout: none)`) dans `globals.css` : champs à 16 px sur iOS uniquement.
  **À confirmer par Khalidou** : sur iPhone, les champs de saisie sont légèrement plus grands (14 → 16 px).
- `src/app/admin/layout.tsx` devient un **composant serveur** : `metadata` (manifeste, `appleWebApp` titre
  « KS Admin », barre d'état `black`, + `apple-mobile-web-app-capable` pour iOS < 16.4) et `viewport.themeColor
  #111827`. L'ancien contenu client est déplacé tel quel dans `src/app/admin/AdminShell.tsx` (renommage git).
- Barre d'état iOS `black` (et non `black-translucent`) : le contenu commence sous la barre d'état, pas de
  chevauchement. Par sécurité, la barre du haut admin a `pt-[max(0.75rem,env(safe-area-inset-top))]` et le menu
  latéral `pt/pb-[env(safe-area-inset-*)]` (0 quand inutile).

### Service worker (`public/sw.js`, `src/components/ServiceWorkerRegister.tsx`)
- Enregistré par `ServiceWorkerRegister`, monté **uniquement** dans `src/app/admin/layout.tsx` (hors garde
  d'authentification), `register('/sw.js', { scope: '/admin', updateViaCache: 'none' })`. Production seulement ;
  en dev il désinscrit le worker admin (le cache des chunks gênerait le rechargement à chaud).
- Cache versionné `ks-admin-static-v2` ; précache `/admin-offline.html` + 3 icônes.
- Jamais en cache : navigations (réseau seul, page hors-ligne si échec), requêtes RSC (`RSC: 1` / `?_rsc=`),
  tout `/admin…`, `/api/…`, tout autre domaine (Supabase, Google…). Cache-first seulement pour `/_next/static/`,
  `/icons/`, `/logo.svg`, polices ; plafond 200 entrées.
- `skipWaiting` + `clients.claim` ; à l'activation suppression de tous les autres caches (dont `ks-admin-v1`).
  Le HTML n'étant jamais mis en cache, une mise à jour ne peut pas bloquer sur une ancienne page.
- **Neutralisation de l'ancien worker (portée `/`)** : quand le navigateur met à jour l'ancienne inscription vers ce
  fichier, le worker détecte que sa portée n'est pas `/admin`, supprime tous les caches et se désinscrit, sans rien
  intercepter. Côté page, l'admin désinscrit aussi toute inscription `/` et supprime `ks-admin-v1` à chaque chargement
  (l'ancien worker peut le recréer pendant qu'il contrôle encore l'onglet).
- Page hors-ligne `public/admin-offline.html` : française, thème sombre, bouton « Réessayer », rechargement auto
  à l'évènement `online`.

### Invite d'installation (`src/lib/pwa/install.ts`, `src/components/pwa/InstallPrompt.tsx`)
- Store `useSyncExternalStore` (pas de setState dans un effet) ; `beforeinstallprompt` capté dès le chargement du
  module (importé par `ServiceWorkerRegister`).
- Admin seulement : bouton icône vert dans la barre du haut mobile (à gauche de « Sortir ») + ligne « Installer
  l'app » avec bouton × (masquer) en bas du menu latéral (visible aussi sur desktop).
- iOS : pas d'évènement → la même entrée ouvre une fenêtre « Partager → Sur l'écran d'accueil » (rendue par portail
  dans `<body>` : le `backdrop-blur` de la barre du haut piégeait les éléments `fixed`).
- Jamais affichée en mode standalone ; masquage mémorisé dans `localStorage` `ks-install-dismissed-admin`
  (try/catch).

## Vérifications (Playwright, `next build` + `next start -p 3101`, harnais `/tmp/harness-pwa/pwa_test.py`)

Fait sur un build de production (le service worker n'est enregistré qu'en production). Résultats bruts :
`/tmp/harness-pwa/results.json`.

- Manifeste : JSON valide, 4 icônes + apple-touch + favicon.svg + favicon.ico → 200, tailles réelles = déclarées.
  Raccourcis `/admin/orders`, `/admin/products` → 200.
- Liens de manifeste (après chargement complet) : `/`, `/products`, `/orders/track`, `/cart` → aucun ;
  `/admin`, `/admin/orders`, `/admin/products` → `HEAD /manifest.json` ; navigation client admin → `/` : lien retiré.
- Visiteur boutique neuf (`/`, `/products`, `/orders/track`) : 0 inscription de service worker.
- Ancien worker (`git show 401b996:public/sw.js`) inscrit à `/` :
  - visiteur boutique seul : avant 1 inscription `/` + `ks-admin-v1` (49-90 entrées) ; après 1 navigation boutique
    avec le nouveau `sw.js` : 0 inscription, 0 cache ; à la navigation suivante plus aucun contrôleur ;
  - visiteur admin : après la 1re visite `/admin` : inscription `/admin` seule, `ks-admin-v1` réduit à 2-5 entrées
    (recréées par l'ancien worker encore actif dans l'onglet) ; à la visite admin suivante : seul `ks-admin-static-v2`.
- Nouveau worker : inscription `…/admin` activée ; contrôle `/admin/orders` ; `/` non contrôlé.
  Après `/admin`, `/admin/orders` et navigation client vers `/admin/products` : 33 entrées, **0** sous `/admin`,
  `/api` ou `_rsc` ; seules entrées hors `/_next/static/` et `/icons/` : `/logo.svg`, `/admin-offline.html`.
- Hors ligne (`context.set_offline`) : navigation `/admin/customers` → « Vous êtes hors ligne ».
- Invite : 0 bouton avant l'évènement, 1 après un faux `beforeinstallprompt` (360 et 390 px) ; clic sur la ligne
  du menu → `prompt()` appelé ; masquage → 0 bouton, toujours 0 après rechargement + nouvel évènement ;
  UA iPhone → bouton présent, fenêtre d'aide visible ; standalone simulé → 0 bouton ; boutique → 0 élément.
- Débordement horizontal (`body.scrollWidth > clientWidth`) : faux partout (admin 360/390 menu fermé et ouvert,
  aide iOS 390, admin 1440, boutique 390).
- Installabilité Chrome via CDP (contexte persistant, non privé) : `Page.getInstallabilityErrors` sur `/admin` →
  `[]` ; sur `/` → `no-manifest` (voulu). `Page.getAppManifest` : aucune erreur.
- `npx tsc --noEmit` : OK. ESLint sur les fichiers touchés : 0 erreur (2 avertissements `<img>` déjà présents).
- Captures : `/tmp/harness-pwa/admin-topbar-360.png`, `admin-topbar-390.png`, `admin-menu-360.png`,
  `admin-menu-390.png`, `admin-ios-hint-390.png`, `admin-1440.png`, `offline-390.png`, `offline-1440.png`,
  `shop-390.png`.

## Non vérifié

- Installation réelle sur un Android (rendu de l'icône maskable par le lanceur, WebAPK) et sur un iPhone
  (écran d'accueil, barre d'état, zoom des champs) : impossible dans ce bac à sable.
- Mise à jour d'une installation Android existante (même `id`, même URL de manifeste) : raisonnement, pas testé.
- Rendu dans Safari (WebKit) : non testé (Chrome uniquement).

## Points à faire confirmer par Khalidou

1. Champs de saisie à 16 px sur iPhone (contrepartie de la réactivation du zoom).
2. Barre d'état iOS opaque noire (`black`) dans l'app admin installée.
3. Hors ligne, l'admin n'affiche qu'une page « Vous êtes hors ligne » (aucune donnée en cache, par choix de sécurité).

## Notes pour la suite

- Changer une icône sans changer son nom : incrémenter `VERSION` dans `public/sw.js` (les icônes sont en cache-first).
- Régénérer les icônes : `python3 scripts/pwa-icons/generate.py` (Playwright + Chrome + Pillow).

## Avancement

- [x] Icônes
- [x] Manifeste admin (boutique non installable)
- [x] Layout admin serveur + metadata
- [x] viewport
- [x] Service worker + nettoyage de l'ancien
- [x] Invite d'installation (admin)
- [x] Vérifications Playwright

## Nouvelle icône d'application — piste C (2026-11-19)

- Khalidou a choisi la piste « C — badge vert » (planche de pistes : artefact « Kapital Stores — pistes de logo »).
- `scripts/pwa-icons/generate.py` : les icônes `any`, `maskable` et `apple-touch` utilisent le K sombre plein sur
  fond vert `#22c55e` avec éclair blanc, en aplats. Marque dans un rayon de 0,37 × la taille pour la version maskable.
- Les favicons (onglet du navigateur, **tout le site**) gardent l'ancienne marque : le changement de logo pour
  la boutique (en-tête, pied de page, e-mails, facture, favicon) est une décision de marque à part, non prise.
- Noms de fichiers inchangés, donc `manifest.json` n'a pas bougé.
