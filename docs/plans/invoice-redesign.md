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
