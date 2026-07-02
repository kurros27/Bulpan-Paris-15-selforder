# API d'intégration QRServe

API REST sécurisée pour connecter vos outils : Google Sheets, Microsoft Excel
(Power Query), Power BI, Looker Studio, Microsoft Power Automate, Zapier,
Make (Integromat)…

## Authentification

1. Dashboard → **Paramètres → Intégrations** → générer une clé d'API.
2. La clé (`qrs_…`) n'est affichée qu'une fois ; elle est stockée hachée.
3. Chaque requête doit porter l'en-tête :

```
Authorization: Bearer qrs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Toutes les réponses sont en JSON UTF-8. Les erreurs suivent le format
`{ "error": "message" }` avec un code HTTP approprié (401, 403, 422, 500).

## Endpoints

### `GET /api/v1/orders`

Liste paginée des commandes du restaurant.

| Paramètre | Type | Description |
|---|---|---|
| `from` | ISO 8601 | date de début (incluse) |
| `to` | ISO 8601 | date de fin (incluse) |
| `status` | enum | `NEW, ACCEPTED, PREPARING, READY, SERVED, COMPLETED, CANCELLED` |
| `page` | entier | page (défaut 1) |
| `pageSize` | entier | taille (défaut 50, max 200) |

Réponse : `{ data: Order[], total, page, pageSize }` — chaque commande inclut
ses lignes (`items`) avec options, quantités, prix TTC et taux de TVA.

### `GET /api/v1/products`

Carte complète : catégories ordonnées, produits, groupes d'options et
suppléments avec prix.

### `GET /api/v1/summary?days=30`

Synthèse pour tableaux de bord : KPI temps réel (CA jour/semaine/mois,
panier moyen, taux d'annulation…) + séries journalières, ventes par heure,
par catégorie et répartition sur place / à emporter.

## Recettes

**Excel / Power BI (Power Query)** — Données → Obtenir des données → Web →
URL `https://votre-domaine/api/v1/summary?days=90`, en-tête HTTP
`Authorization: Bearer <clé>`. Actualisation planifiée = synchronisation
automatique de votre classeur existant.

**Google Sheets (Apps Script)**

```js
function importOrders() {
  const res = UrlFetchApp.fetch("https://votre-domaine/api/v1/orders?pageSize=200", {
    headers: { Authorization: "Bearer " + CLE_API },
  });
  const { data } = JSON.parse(res.getContentText());
  const sheet = SpreadsheetApp.getActiveSheet();
  sheet.clearContents();
  sheet.appendRow(["N°", "Date", "Client", "Table", "Statut", "Total"]);
  data.forEach((o) =>
    sheet.appendRow([o.number, o.createdAt, o.customerName, o.tableName, o.status, o.totalAmount])
  );
}
```

Déclencheur horaire = export automatique quotidien.

**Zapier / Make / Power Automate** — module HTTP « GET » avec l'en-tête
d'autorisation ; interroger `/api/v1/orders?from=<dernier passage>` pour un
déclencheur par sondage sur les nouvelles commandes.

## Exports Excel intégrés

Sans API, deux exports sont disponibles depuis le dashboard (session requise) :

- `GET /api/export` — classeur complet 7 feuilles (Commandes, Produits, Carte,
  Chiffre d'affaires, KPI, Meilleures ventes, Statistiques), mis en forme
  (en-têtes colorés, filtres automatiques, totaux, formats monétaires).
- `GET /api/menu/export` — la carte seule, au format accepté par l'import.
