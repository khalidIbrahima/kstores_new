# Notifications Telegram

Notifications business en temps réel dans le groupe Telegram admin « Kapital Stores » :
nouvelles commandes, paiements (reçus / échoués / expirés), stock bas, erreurs critiques.

## Architecture

Deux canaux d'envoi, selon l'événement :

| Événement | Où | Mécanisme |
|---|---|---|
| 🛒 Nouvelle commande | [src/app/api/order-confirmation/route.ts](src/app/api/order-confirmation/route.ts) | [src/lib/telegram.ts](src/lib/telegram.ts) (fetch API Bot, fire-and-forget) |
| 💰 Paiement reçu / ⚠️ échoué / ⚠️ expiré | Trigger Postgres sur `orders.payment_status` | [db/telegram-notifications.sql](db/telegram-notifications.sql) (pg_net + Vault) |
| 📦 Stock bas (seuil ≤ 10, au franchissement) | Trigger Postgres sur `products` | [db/telegram-notifications.sql](db/telegram-notifications.sql) |
| 🔴 Erreur critique (order-confirmation, webhook Wave) | catch des routes API | [src/lib/telegram.ts](src/lib/telegram.ts) |

Les notifs de paiement sont en **trigger base de données** (pas dans la route du webhook
Wave) : la notif part sur la **transition** de `payment_status` (`IS DISTINCT FROM`),
quel que soit le chemin d'écriture (webhook Wave, admin…), sans doublon en cas de
relivraison du webhook.

Principes communs :
- Une notif ratée ne casse **jamais** un flux métier (jamais de throw, exceptions avalées).
- Secrets absents → no-op silencieux (activable/désactivable par environnement).
- `parse_mode: HTML` avec échappement systématique des valeurs saisies par l'utilisateur.
- Pas de PII dans le texte des messages (montant + référence courte uniquement) ; le
  téléphone du client n'apparaît que dans l'URL du bouton `wa.me`.

## Setup

### 1. Variables d'environnement (côté serveur — jamais `NEXT_PUBLIC_*`)

Dans `.env.local` (et sur l'hébergeur en production) :

```
TELEGRAM_BOT_TOKEN=<token du bot @kapitalstoresbot>
TELEGRAM_CHAT_ID_INFO=<chat_id du groupe admin>
```

### 2. Triggers base de données (paiements + stock)

Dans le SQL Editor Supabase :

1. Activer les extensions **pg_net** et **vault** (Database → Extensions).
2. Exécuter [db/telegram-notifications.sql](db/telegram-notifications.sql).
3. Créer les secrets Vault (mêmes valeurs que `.env.local`) :

```sql
select vault.create_secret('<TELEGRAM_BOT_TOKEN>', 'telegram_bot_token');
select vault.create_secret('<TELEGRAM_CHAT_ID_INFO>', 'telegram_chat_id_info');
```

## Test

```
node scripts/test-telegram.mjs
```

Lit `.env.local`, envoie un message de test avec boutons dans le groupe, affiche la
réponse de l'API Telegram et sort en erreur si l'envoi échoue.

Pour tester le trigger paiement en base (après le setup SQL), faire passer une commande
de test à `paid` :

```sql
update orders set payment_status = 'paid' where id = '<order_id>';
```

## Boutons (CTA)

- Commande / paiement reçu : `💬 WhatsApp client` (message prérempli, numéro normalisé
  — indicatif 221 ajouté aux numéros locaux sénégalais ; bouton omis si numéro
  inexploitable) + `🧾 Voir la commande` (page admin).
- Stock bas : `📦 Voir l'inventaire`.
