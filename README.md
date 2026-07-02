# QRServe — Plateforme SaaS de commande par QR Code

Application web multi-restaurants : menu digital par QR Code, commandes en temps
réel, tableaux de bord KPI, exports Excel et API d'intégration.

## Fonctionnalités

**Expérience client (sans compte)**
- Scan du QR Code → menu mobile-first (`/menu/{slug}`, `?table=` pré-rempli)
- Photos, catégories, allergènes, étiquettes (Nouveau, Épicé, Vegan…)
- Options (choix unique) et suppléments payants (multi-choix), commentaires
- Panier, sur place / à emporter, écran de confirmation et suivi de commande

**Restaurateur (`/dashboard`)**
- Tableau de bord temps réel : CA jour/semaine/mois avec évolution, commandes
  par statut, panier moyen, clients, temps moyen de préparation, taux d'annulation
- Graphiques interactifs : évolution du CA, commandes par heure, ventes par
  catégorie, sur place / à emporter, carte thermique jour × heure (+ vue tableau)
- Commandes en direct (SSE) avec notification sonore et changement de statut
  (Nouvelle → Acceptée → En préparation → Prête → Servie → Terminée / Annulée)
- Gestion de la carte : catégories et produits illimités, options/suppléments,
  disponibilité, réorganisation par glisser-déposer, import/export Excel (.xlsx)
- Meilleures ventes par période (+ moins vendus, plus rentables, en rupture,
  jamais commandés), historique filtrable, export Excel multi-feuilles mis en forme
- QR Codes multiples (salle, terrasse, table…) : téléchargement, impression, partage
- Rapports quotidiens/hebdomadaires/mensuels avec recommandations, planification e-mail
- Équipe multi-rôles (Administrateur, Manager, Serveur), notifications, paramètres
  (logo, horaires, réseaux sociaux, devise, TVA, couleur de marque, mode sombre)
- Clés d'API pour Google Sheets, Power BI, Looker Studio, Zapier, Make… (voir `docs/API.md`)

**Super administrateur (`/admin`)**
- Gestion des restaurants (suspension, suppression, abonnements FREE/STARTER/PRO)
- Statistiques globales (GMV, MRR), utilisateurs, journal d'activité complet

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Recharts ·
API REST via route handlers (architecture modulaire) · PostgreSQL · Prisma 7 ·
SSE pour le temps réel · ExcelJS · JWT (jose) + bcrypt · Zod

## Démarrage

```bash
cp .env.example .env          # renseigner DATABASE_URL et JWT_SECRET
npm install
npx prisma migrate deploy     # ou migrate dev en développement
npm run db:seed               # données de démo (facultatif)
npm run dev                   # http://localhost:3000
```

Ou avec Docker : `docker compose up --build` (PostgreSQL inclus).

### Comptes de démonstration (après `npm run db:seed`)

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Super admin | `admin@qrserve.fr` | `admin1234` |
| Restaurateur | `demo@bulpan.fr` | `demo1234` |
| Manager | `manager@bulpan.fr` | `demo1234` |

Menu de démo : [`/menu/bulpan-paris-15`](http://localhost:3000/menu/bulpan-paris-15)

## Import Excel de la carte

Fichier `.xlsx`, feuille « Carte » (ou première feuille), colonnes :
`Catégorie · Nom · Description · Prix · Disponibilité · Allergènes ·
Temps de préparation · URL de la photo`. Les catégories et produits sont créés
automatiquement ; l'export (`Carte → Exporter`) produit exactement ce format.

## Sécurité

JWT httpOnly (SameSite=Lax, protection CSRF), permissions par rôle vérifiées
côté API, validation Zod de toutes les entrées, prix recalculés côté serveur,
mots de passe bcrypt (12 rounds), clés d'API hachées (SHA-256), journal
d'activité, réinitialisation de mot de passe par jeton à expiration.

## Architecture

```
app/
  (auth)/            connexion, inscription, mot de passe oublié
  menu/[slug]/       menu public client + suivi de commande
  dashboard/         espace restaurateur
  admin/             espace super administrateur
  api/               API REST modulaire (auth, public, carte, commandes,
                     stats, exports, v1 intégrations, admin)
components/          UI, graphiques (Recharts), coquilles dashboard/admin
lib/                 prisma, auth JWT, validation Zod, stats SQL, ExcelJS,
                     bus d'événements SSE, journalisation
prisma/              schéma (16 modèles), migrations, seed de démo
docs/API.md          documentation de l'API d'intégration
```

Le temps réel utilise un bus d'événements en mémoire (un seul processus).
Pour un déploiement multi-instances, brancher Redis Pub/Sub dans
`lib/events.ts` (l'API publish/subscribe est déjà isolée).

## Évolutions prévues par le schéma

Paiement en ligne (modèle `Payment` prêt pour Stripe/PayPal), fidélité,
réservations, click & collect, multi-devises (champ `currency`), stocks.
