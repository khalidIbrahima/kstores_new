# Session admin qui se déconnecte

## Constat en production (19/11/2026)
- Les admins se connectent avec Google (One Tap / GIS). Aucun admin ne s'est connecté par email/mot de passe Supabase depuis février 2026.
- Le site ne garde que le jeton d'identité Google (`ks-google-credential` dans localStorage). Ce jeton expire au bout d'une heure.
- `AuthContext` et `admin-fetch` purgent la session dès qu'il est expiré → déconnexion après ~1 h, donc presque à chaque retour.
- Logs Auth Supabase : des dizaines de 403 « signing method RS256 is invalid » : `requireAdmin` envoie d'abord le jeton Google à Supabase avant Google (bruit + latence).

## Correctif
1. `src/lib/session.ts` : session signée HMAC-SHA256 (clé dérivée de `SUPABASE_SERVICE_ROLE_KEY`, côté serveur seulement), 30 jours glissants, cookie `ks_session` HttpOnly, Secure, SameSite=Lax.
2. `src/app/api/auth/session/route.ts` :
   - POST `{credential}` : vérifie le jeton Google (aud, exp, email vérifié) puis pose le cookie.
   - GET : renvoie l'utilisateur si le cookie est valide, renouvelle le cookie s'il a plus d'un jour.
   - DELETE : efface le cookie.
3. `requireAdmin` : Bearer comme avant (routage par `alg` du jeton : RS256 → Google, sinon Supabase) ; sans Bearer, accepte le cookie. Pour une requête qui modifie (non GET/HEAD) par cookie, exige une origine identique (anti-CSRF).
4. `AuthContext` : à la connexion Google → POST session. Au chargement, si le jeton Google est expiré → GET session au lieu de purger. Les sessions encore valides au déploiement créent leur cookie automatiquement. Déconnexion → DELETE.
5. `admin-fetch` : n'envoie plus un jeton Google expiré et ne purge plus ; le cookie part tout seul (même origine).

## Vérification
- Tests unitaires de `session.ts` (signature, expiration, falsification).
- Harnais : connexion simulée, jeton Google expiré + cookie valide → reste admin ; sans cookie → déconnecté.
- Après déploiement : logs Auth sans nouvelles erreurs RS256.

## État
- [x] Code
- [x] Tests : 6 tests unitaires (signature, 29 j valide, 30 j expirée, falsification, autre clé, déchets) ; API : cookie valide 200 + renouvellement, falsifié 401, PATCH sans origine 401, origine étrangère 401, même origine passe l'auth ; navigateur : jeton Google expiré + cookie → reste sur /admin, sans cookie → renvoyé à l'accueil.
- [x] PR
- Non vérifié : vrai jeton Google (le bac à sable ne joint pas Google), vrai iPhone.
- Après déploiement : chaque admin doit se reconnecter une dernière fois (sauf session Google ouverte depuis moins d'une heure, qui crée le cookie toute seule).
