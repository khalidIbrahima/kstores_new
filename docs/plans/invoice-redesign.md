# Plan — Redesign de la facture (Kapital Stores)

> Fichier de suivi : tout agent/compte peut reprendre le travail à partir d'ici.
> Dernière mise à jour : 2026-11-18

## Contexte

- La facture est une page HTML générée par `generateInvoiceHtml()` dans `src/lib/invoice.ts`.
- Elle est ouverte dans une nouvelle fenêtre (`window.open` + `document.write`) depuis :
  - `src/app/orders/track/[id]/page.tsx` (client, bouton « Télécharger ma facture », sans impression auto)
  - `src/app/admin/orders/[id]/page.tsx` (admin, `handleDownloadInvoice`, lance `win.print()`)
- Pas de génération PDF côté serveur : le PDF vient de l'impression navigateur.

## Problèmes de l'ancienne version

- Styles inline, aucune adaptation mobile (en-tête flex + tableau 4 colonnes serrés sur téléphone).
- Pas de logo (simple texte), pas de bouton imprimer côté client.
- Textes sans accents (« Qte », « a »), e-mail de contact codé en dur.
- Aucune info de paiement alors que `orders.payment_status` / `payment_method` existent
  (voir `db/orders-payment-columns.sql`).
- Aucune mention légale (NINEA / RCCM).

## Décisions de design

- Feuille blanche (économe en encre), accents de marque : `#111827` (encre) et `#22c55e` (vert).
  Vert foncé `#15803d` pour le texte vert sur blanc (contraste).
- Logo : monogramme K en SVG inline (repris de `src/lib/email-logo.ts`) + nom de la boutique.
- Mobile-first : sous 640 px les lignes d'articles passent sur deux lignes (nom, puis `qté × PU` et montant),
  blocs empilés, barre d'action collante. Desktop : feuille centrée 820 px avec ombre.
- Impression : `@page A4`, marges 14 mm, barre d'action masquée, lignes insécables, en-tête de tableau répété.
- Classes CSS dans un `<style>` unique (plus de styles inline).

## API

`generateInvoiceHtml(order, store?)` — rétro-compatible (2e argument optionnel).

- `InvoiceOrder` : nouveaux champs optionnels `country`, `paymentStatus`, `paymentMethod`.
- `InvoiceStore` (optionnel) : `name`, `url`, `email`, `phone`, `address`, `ninea`, `rccm`.
  Les pages passent les réglages de `useStoreSettings()` (table `store_settings`).
- États du document (décision de Khalidou, 2026-11-18) :
  - `payment_status = 'paid'` → « Facture », badge « Payée [le …] », « Total payé », mode de paiement.
  - commande `cancelled` → « Facture annulée », badge « Annulée ».
  - tout le reste (pending / failed / expired / vide) → « Facture proforma », badge « À payer »,
    « Total à payer » et encart « Comment payer » (moyens activés dans `store_settings.payment_methods`
    + référence de commande).
  - Le statut « Livrée » n'est jamais utilisé pour déduire le paiement.
- Paiement manuel : carte « Paiement » dans l'admin de la commande (« Marquer comme payée » + mode).
  Écrit `orders.payment_status`, `orders.payment_method` et `shipping_address._meta.paid_at`
  via `PATCH /api/admin/orders/[orderId]` (champs ajoutés à la liste blanche, avec validation).

## Étapes

- [x] 1. Analyse de l'existant
- [x] 2. Réécriture de `src/lib/invoice.ts`
- [x] 3. Branchement des deux pages (réglages boutique + champs paiement)
- [x] 4. Vérification : rendu desktop / mobile / PDF A4, `tsc`, `eslint`
- [x] 5. États payée / à payer / annulée + bouton « Marquer comme payée »

## Points ouverts (décision de Khalidou)

- Numéro Wave / Orange Money à afficher dans « Comment payer » : `InvoiceStore.paymentInstructions` existe
  mais n'est alimenté par aucun réglage. À fournir, ou ajouter un champ dans les réglages.
- Les anciennes commandes réglées en espèces n'ont pas de `payment_status` : leur facture sort en
  « proforma / à payer » tant qu'elles ne sont pas marquées payées dans l'admin.
- NINEA / RCCM : les champs existent dans `InvoiceStore` mais `store_settings` n'a pas de colonnes
  pour eux. À décider : ajouter `ninea`, `rccm`, `address` dans `store_settings` + page admin Réglages.
- Montant en toutes lettres (« Arrêtée la présente facture à la somme de… ») : non fait, à confirmer.
- TVA : `store_settings.tax_rate` existe mais n'est pas appliqué aux commandes ; la facture n'affiche pas de TVA.

## Notes de développement

- Aperçu local : script hors dépôt qui importe `src/lib/invoice.ts` avec Node 22 (types retirés nativement)
  et capture avec Chrome headless.
- Dépôt cloné en lecture seule dans cette session : rien n'est poussé tant que Khalidou ne le demande pas.

## Partage WhatsApp (2026-11-18)

Demande : « un bouton partager pour WhatsApp qui envoie le PDF et le lien du produit en boutique ».

- V1 livrée (carte « Facture » de l'admin commande) : bouton **WhatsApp** (`wa.me/<numéro client>?text=…`,
  ou choix du contact si le numéro est inexploitable) et bouton **Partager** (`navigator.share`, sinon copie).
  Le message contient le lien `/orders/track/<id>` (où le client télécharge sa facture) et un lien
  `/products/<slug|id>` par article.
- Limite : un lien `wa.me` ne transporte que du texte. Le PDF n'est PAS joint.
- À décider pour joindre un vrai PDF :
  1. générer le PDF dans le navigateur puis `navigator.share({ files })` (mobile uniquement, nouvelle dépendance) ;
  2. envoi automatique via l'API WhatsApp Business (`src/lib/whatsapp.ts`), PDF généré et hébergé côté serveur.

## PDF joint + réglages de facturation (2026-11-18, suite — « continue »)

Décisions prises par défaut (Khalidou a répondu « continue » aux trois questions ouvertes) :

1. **PDF joint** : voie recommandée = PDF fabriqué dans le navigateur + menu Partager du téléphone.
   - `src/lib/invoice-pdf.ts` : rend le HTML de la facture dans un iframe hors écran (largeur A4),
     capture avec `html2canvas-pro`, découpe aux limites de lignes et assemble avec `jspdf` (chargés à la demande).
   - PDF en image (texte non sélectionnable) : choisi pour rester fidèle au gabarit HTML et supporter
     n'importe quel caractère dans les noms de produits (imports Alibaba).
   - Parcours en deux clics (« Préparer le PDF » puis « Envoyer le PDF ») : `navigator.share` exige un geste
     utilisateur récent, que la génération asynchrone ferait expirer (Safari surtout).
   - Sans partage de fichiers (desktop) : le PDF est téléchargé.
2. **Numéro Wave / Orange Money** et 3. **NINEA / RCCM** : nouveaux champs dans les réglages, onglet « Facturation ».
   - Colonnes `ninea`, `rccm`, `business_address`, `payment_instructions` sur `store_settings`
     → **`db/store-settings-invoice-fields.sql` à exécuter une fois dans Supabase** (non exécuté par l'agent).
   - Tant que le SQL n'est pas exécuté, l'onglet est en lecture seule et la facture reste comme avant.

## Lien de paiement (2026-11-18)

Demande : « ajoute un moyen d'y mettre un lien de paiement » + numéro Wave fourni par Khalidou.

- Lien **par commande** : carte « Paiement » de l'admin (champ + « Enregistrer » + « Générer Wave » qui appelle
  `/api/wave` et enregistre le `checkout_url`). Stocké dans `shipping_address._meta.payment_link`.
- Lien **général** : `store_settings.payment_link` (onglet Facturation), remplacé par le lien de la commande s'il existe.
- Affiché dans « Comment payer » de la facture non payée, cliquable dans le PDF (zone de lien ajoutée par `pdf.link`),
  et ajouté au message WhatsApp.
- Le numéro Wave n'est PAS écrit dans le dépôt (dépôt public) : à saisir dans Paramètres > Facturation
  (« Instructions de paiement ») une fois le SQL exécuté.

### Vérifié (harnais local, données simulées, 390 px)

- PDF d'une page et de 3 pages (40 articles, caractères chinois/arabes) : A4, coupures entre les lignes.
- Partage : fichier `application/pdf` + message transmis à `navigator.share` (simulé).
- Génération Wave simulée → lien enregistré, présent sur le PDF (annotation) et dans le message.
- Onglet Facturation : lecture seule + avertissement sans les colonnes, éditable avec.

### Non vérifié

- Vrai téléphone (iOS Safari / Android Chrome) : menu de partage réel, et si WhatsApp garde le texte quand un fichier est joint.
- Vraie API Wave et vraie base.

### Risque existant repéré (non corrigé)

- `/api/wave` n'est pas authentifié et prend le montant envoyé par le client ; le webhook ne semble pas comparer
  le montant payé au total de la commande. À vérifier : un lien créé avec un montant inférieur pourrait marquer
  la commande comme payée.

## Base de production — scripts appliqués (2026-11-18)

Projet Supabase `kstores` (`prszfxibvgjeqxadzbfo`), via le connecteur Supabase :

- `db/store-settings-invoice-fields.sql` appliqué (migration `store_settings_invoice_fields`) : colonnes présentes.
- `db/wave-vault.sql` appliqué (migration `wave_vault_secret_names`) : liste blanche étendue ; `anon` et
  `authenticated` ne peuvent pas exécuter `set_ai_secret` / `get_ai_secret`, `service_role` oui.
- `store_settings.payment_instructions` renseigné (numéro Wave fourni par Khalidou).
- Restent vides, à saisir dans Paramètres > Facturation : NINEA, RCCM, adresse, lien de paiement général.
- Clés Wave : toujours absentes du Vault et de Vercel.
