# Plan — Sécurisation du paiement Wave

> Fichier de suivi : tout agent/compte peut reprendre le travail à partir d'ici.
> Dernière mise à jour : 2026-11-18

## Constat (code de prod, commit 6cf35d9)

1. `POST /api/wave/webhook` ne vérifie rien : ni signature, ni appel à Wave. N'importe qui connaissant l'identifiant
   d'une commande peut envoyer un faux `checkout.session.completed` et la faire passer en « payée / processing ».
2. `POST /api/wave` n'est pas authentifié et crée la session avec le **montant envoyé par le navigateur**.
3. Le webhook ne compare pas le montant payé au total de la commande.
4. Un événement « expired » / « failed » écrase `payment_status`, même sur une commande déjà payée.
5. Le webhook retombe sur la clé anonyme Supabase si la clé service manque.

## État de la production (Vercel, 2026-11-18)

- **`WAVE_API_KEY` n'existe pas** dans les variables d'environnement du projet `kstores-new`
  (ni `WAVE_WEBHOOK_SECRET`, ni `NEXT_PUBLIC_SITE_URL`). Donc aujourd'hui `/api/wave` répond 503 : le paiement Wave
  en ligne ne fonctionne pas en production. Le webhook, lui, reste ouvert (constat 1).

## Référence Wave (docs.wave.com, lue le 2026-11-18)

- Webhook : secret partagé (`Authorization: Bearer <secret>`) ou secret de signature
  (`Wave-Signature: t=<ts>,v1=<hmac>`; HMAC-SHA256 hexadécimal de `ts + corps brut`; rejeter au-delà de 5 min).
- `GET /v1/checkout/sessions/:id` (id `cos-…`) : `checkout_status` open | complete | expired,
  `payment_status` processing | cancelled | succeeded, `amount` (chaîne), `client_reference`, `when_expires`.
- Une session expire **30 minutes** après sa création.

## Correctifs

- [x] `src/lib/wave.ts` : création de session, lecture de session, vérification d'authenticité du webhook,
      et fonction pure `decideWaveWebhook` (testable sans réseau).
- [x] `/api/wave` : ne lit plus que `orderId` ; le montant vient de la commande en base ; refuse une commande
      payée, annulée ou introuvable.
- [x] Webhook : ne fait plus confiance au contenu reçu. Relit la session chez Wave avec la clé API, puis exige
      session complète + paiement réussi + XOF + montant = total de la commande. Sinon : pas de mise à jour,
      alerte Telegram. Sans `WAVE_API_KEY` ou sans clé service : refus (503).
- [x] Si `WAVE_WEBHOOK_SECRET` est défini, la signature (ou le secret partagé) est exigée en plus.
- [x] « expired » / « failed » ne touchent plus une commande déjà payée ; le statut ne repasse en `processing`
      que depuis `pending`.
- [x] Lien Wave dans l'admin : date d'expiration enregistrée (`_meta.payment_link_expires_at`), lien retiré de la
      facture et du message une fois expiré.

## À faire par Khalidou (hors code)

- Ajouter `WAVE_API_KEY` dans Vercel pour activer le paiement Wave, et `WAVE_WEBHOOK_SECRET` (secret de signature
  du webhook dans le portail Wave Business).

## Autre risque repéré, non corrigé

- `NEXT_PUBLIC_TWILIO_AUTH_TOKEN` : un secret avec le préfixe `NEXT_PUBLIC_` peut être embarqué dans le JavaScript
  envoyé aux navigateurs. Voir la chaîne d'import de `src/lib/whatsapp.ts`.

## Vérification (2026-11-18)

- 23 tests unitaires sur `decideWaveWebhook`, `verifyWaveWebhookAuth`, `isWaveSessionId` (script hors dépôt) : tous passent.
  Cas couverts : paiement exact, sous-paiement (100 F sur 84 000 F → alerte, pas « payée »), sur-paiement, mauvaise
  devise, faux « completed » alors que Wave dit « open », commande déjà payée, « expired » sur commande payée,
  signature valide / falsifiée / rejouée après 6 min / rotation de clé, secret partagé.
- Routes appelées sur un serveur local avec une base simulée :
  - sans `WAVE_API_KEY` (config actuelle de la prod) : faux webhook → 503, aucune écriture en base ;
  - avec clé + secret : sans signature → 401, mauvaise signature → 401, signature valide → appel à Wave (502 ici,
    Wave étant injoignable depuis l'environnement de test) ; `/api/wave` : id invalide → 400, commande inconnue → 404,
    déjà payée → 409.
- Non vérifié : un vrai paiement Wave de bout en bout (pas de clé API disponible).

## Clés Wave depuis l'admin (2026-11-18)

Demande : « comment ajouter mes clés depuis l'admin ? »

- Même mécanisme que les clés IA (Supabase Vault, `db/ai-vault.sql`).
- `db/wave-vault.sql` (**à exécuter une fois**) : ajoute `wave_api_key` et `wave_webhook_secret` à la liste blanche
  de `set_ai_secret`.
- `src/app/api/admin/payment-keys` : GET = statut (jamais la valeur), POST = enregistrement.
- `src/lib/wave.ts` : chaque secret vient de la variable d'environnement si elle existe, sinon du Vault (cache 60 s).
- Admin > Paramètres > Paiements : panneau « Clés Wave » + adresse du webhook à déclarer chez Wave.
- Vérifié en local : sans variable d'environnement, clé absente du Vault → 503 ; clé + secret dans le Vault →
  signature exigée (401) puis appel à Wave. Panneau testé sur 390 px avec API simulée.
- Non vérifié : la route admin avec une vraie session, et le vrai Vault.
