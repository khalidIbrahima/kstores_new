# Plan — PWA + toutes les pages admin en responsive mobile

> Fichier de suivi : tout agent/compte peut reprendre le travail à partir d'ici.
> Dernière mise à jour : 2026-11-18. Branche d'intégration : `claude/pwa-admin-mobile` (partie de `main` @ 2c7bbda).

## Demande (Khalidou, 2026-11-18)

1. « L'app doit être en PWA, avec le logo bien visible. »
2. « Toutes les pages admin responsive mobile. »
3. À faire après la fusion de la partie Wave (PR #3 fusionnée, main @ 2c7bbda).

## État de départ

### PWA
- `public/manifest.json` existe mais ne décrit que l'admin (`name: "Kapital Stores Admin"`, `start_url: /admin`).
- Icônes `icon-192.png` / `icon-512.png` : PNG **sans transparence, coins blancs**, pas de version `maskable`
  → sur Android le logo apparaît petit dans un carré blanc. C'est le « logo pas bien visible ».
- `public/sw.js` : cache « network first » de toutes les requêtes GET, y compris les pages admin ; pas de page hors-ligne.
- `src/app/layout.tsx` : viewport écrit à la main avec `user-scalable=no`.
- Aucun bouton / invite d'installation.

### Admin mobile
- Déjà corrigées (PR #1) : `admin/orders` (liste) et `admin/orders/[id]`.
- `globals.css` a `html, body { overflow-x: hidden }` : un débordement horizontal ne se voit pas, il est coupé.
  Il faut le mesurer (`document.body.scrollWidth > clientWidth`).
- Piège rencontré : `grid lg:grid-cols-N` sans `grid-cols-1` + enfants en `truncate` → la page s'élargit.
- Tailwind 4 : `hover:` / `group-hover:` ne s'appliquent pas sur écran tactile → actions invisibles
  (`pointer-coarse:opacity-100` déjà ajouté à plusieurs endroits).

## Décisions

- **Deux applications installables** : la boutique (`/manifest.webmanifest`, départ `/`) et l'admin
  (`/admin` avec son propre manifeste, départ `/admin`). Ainsi les clients installent la boutique et Khalidou l'admin.
  À confirmer par Khalidou ; réversible.
- Aucune nouvelle dépendance npm sans nécessité.
- Ne pas changer le comportement ni la mise en page desktop (≥ 1024 px) : corrections mobile-first.

## Découpage (un agent par chantier, chacun dans son propre worktree et sa propre branche)

| Chantier | Périmètre | Suivi |
|---|---|---|
| A — PWA | manifestes, icônes, service worker, invite d'installation, méta iOS | `docs/plans/pwa.md` |
| B — Admin mobile 1 | `admin/page.tsx` (dashboard), `analytics`, `products` (liste, new, [id]), `components/admin/*`, `inventory`, `categories`, `payments`, `reports` | `docs/plans/admin-responsive-b.md` |
| C — Admin mobile 2 | `customers`, `guest-customers`, `users`, `suppliers`, `supplier-orders` (liste, [id]), `shipping`, `newsletter`, `support`, `ai`, `settings`, `orders/new` | `docs/plans/admin-responsive-c.md` |

L'orchestrateur relit chaque branche, la vérifie avec le harnais (ci-dessous), puis intègre dans `claude/pwa-admin-mobile`.

## Harnais de test (sans vraie base ni session)

- `.env.local` factice : `NEXT_PUBLIC_SUPABASE_URL=http://supabase.test`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-test-key`,
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID=test` (fichier ignoré par git — ne jamais le committer).
- `npx next dev -p <port>` puis Playwright Python (`channel="chrome"`), contexte mobile 360 et 390 px + desktop 1440 px.
- Session admin simulée : `localStorage` `ks-google-credential` (faux JWT avec `exp` futur) et `ks-google-user`,
  et `context.route("http://supabase.test/**")` qui renvoie un profil `is_admin: true` et des données factices
  (objet si l'en-tête `Accept` contient `vnd.pgrst.object`, tableau sinon).
- Modèle de script : `/tmp/harness/run.py` (présent seulement dans la session d'origine).

## Avancement

- [ ] A — PWA
- [ ] B — Admin mobile 1
- [ ] C — Admin mobile 2
- [ ] Intégration, vérification croisée, PR
