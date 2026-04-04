# Technova

Application e-commerce construite avec Next.js App Router pour la boutique `Kapital Stores`.

Le dépôt contient deux surfaces principales :

- une boutique publique avec catalogue, panier, checkout et espace client
- un back-office admin avec produits, commandes, clients, analytics, fournisseurs et achats fournisseurs

## Stack

- Next.js 16
- React 19
- TypeScript
- Supabase pour l'authentification et les données
- PostHog pour l'analytics
- Resend pour les emails transactionnels
- Wave et Twilio/WhatsApp pour les paiements et notifications

## Démarrage local

1. Installer les dépendances :

```bash
npm install
```

2. Créer un fichier `.env.local` à partir de `.env.example`.

3. Lancer le serveur de développement :

```bash
npm run dev
```

4. Ouvrir `http://localhost:3000`.

## Variables d'environnement

Le projet attend au minimum les variables suivantes :

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_SUPABASE_CALLBACK_URL=
NEXT_PUBLIC_GOOGLE_REDIRECT_URL=

NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
POSTHOG_PERSONAL_API_KEY=
POSTHOG_PROJECT_ID=

RESEND_API_KEY=
NEXT_PUBLIC_ADMIN_EMAIL=

WAVE_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_TWILIO_ACCOUNT_SID=
NEXT_PUBLIC_TWILIO_AUTH_TOKEN=
NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER=
NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER=

NEXT_PUBLIC_PRODUCTION_URL=
PROD=
```

## Structure utile

```text
src/app/                 routes App Router
src/app/admin/           back-office
src/app/api/             endpoints serveur
src/components/          UI partagée
src/components/home/     sections de la home
src/components/admin/    composants métier admin
src/context/             auth et panier
src/hooks/               hooks métier
src/lib/                 clients, helpers, types, intégrations
public/                  assets statiques
```

## Routes principales

Boutique :

- `/`
- `/products`
- `/products/[slug]`
- `/categories`
- `/cart`
- `/checkout`
- `/orders`
- `/profile`
- `/login`
- `/register`

Admin :

- `/admin`
- `/admin/products`
- `/admin/inventory`
- `/admin/orders`
- `/admin/customers`
- `/admin/analytics`
- `/admin/suppliers`
- `/admin/supplier-orders`
- `/admin/settings`

API :

- `/api/analytics`
- `/api/contact`
- `/api/newsletter`
- `/api/order-confirmation`
- `/api/order-status`
- `/api/wave`
- `/api/wave/webhook`
- `/api/whatsapp`

## Tables Supabase observées dans le code

- `products`
- `categories`
- `orders`
- `order_items`
- `profiles`
- `reviews`
- `store_settings`
- `deliveries`
- `shipping_agencies`
- `product_variants`
- `product_variant_options`
- `supplier_product`
- `supplier_orders`
- `supplier_order_items`

## Architecture rapide

- Le layout global monte les providers auth, panier, toast, PostHog, maintenance et error boundary.
- La home charge ses données directement depuis Supabase avec `revalidate = 60`.
- Le back-office est principalement en composants client et consomme Supabase depuis le navigateur.
- L'accès admin repose aujourd'hui sur `profile.is_admin` chargé côté client.
- Les intégrations serveur existent déjà pour analytics, email, paiement Wave et WhatsApp.

## Commandes

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Points d'attention

- Le README de base a été remplacé, mais il reste encore de la dette produit et sécurité à traiter.
- Une grosse partie du back-office est actuellement non commitée dans le worktree.
- Certaines intégrations sensibles utilisent encore des variables `NEXT_PUBLIC_*` alors qu'elles devraient rester strictement serveur.
