import { Category, Discount, Product } from "../types";

export const categories: Category[] = [
  {
    id: "starters",
    name: { fr: "Entrées", en: "Starters" },
    description: {
      fr: "Petites bouchées pour bien commencer",
      en: "Small plates to start your journey",
    },
    sortOrder: 1,
  },
  {
    id: "mains",
    name: { fr: "Plats", en: "Mains" },
    description: {
      fr: "Recettes signature Bulpan",
      en: "Bulpan signature dishes",
    },
    sortOrder: 2,
  },
  {
    id: "desserts",
    name: { fr: "Desserts", en: "Desserts" },
    description: {
      fr: "Final sucré", en: "Sweet endings",
    },
    sortOrder: 3,
  },
  {
    id: "drinks",
    name: { fr: "Boissons", en: "Drinks" },
    sortOrder: 4,
  },
];

export const products: Product[] = [
  {
    id: "gyoza",
    name: { fr: "Gyozas légumes", en: "Veggie Gyoza" },
    description: {
      fr: "Raviolis grillés au chou et shiitaké",
      en: "Pan-fried dumplings with cabbage and shiitake",
    },
    price: 650,
    categoryId: "starters",
    photo: "/images/gyoza.svg",
    badges: ["vegan", "bestseller"],
    allergens: ["gluten", "soja"],
    calories: 320,
    modifierGroups: [
      {
        id: "sauce",
        name: "Sauce",
        maxSelectable: 1,
        required: true,
        options: [
          { id: "soy", label: "Sauce soja", priceDelta: 0 },
          { id: "spicy", label: "Sauce piquante", priceDelta: 50 },
        ],
      },
    ],
    isAvailable: true,
    lowStock: false,
  },
  {
    id: "ramen",
    name: { fr: "Ramen miso Bulpan", en: "Bulpan Miso Ramen" },
    description: {
      fr: "Bouillon maison, porc confit, œuf bio",
      en: "House broth, confit pork, marinated egg",
    },
    price: 1450,
    categoryId: "mains",
    photo: "/images/ramen.svg",
    badges: ["bestseller"],
    allergens: ["gluten", "soja", "oeuf"],
    calories: 860,
    modifierGroups: [
      {
        id: "spice",
        name: "Piquant",
        maxSelectable: 1,
        options: [
          { id: "mild", label: "Doux", priceDelta: 0 },
          { id: "medium", label: "Moyen", priceDelta: 0 },
          { id: "hot", label: "Très piquant", priceDelta: 0 },
        ],
      },
      {
        id: "extras",
        name: "Suppléments",
        maxSelectable: 3,
        options: [
          { id: "egg", label: "Oeuf mariné", priceDelta: 150 },
          { id: "chashu", label: "Tranche de porc", priceDelta: 250 },
          { id: "bamboo", label: "Pousses de bambou", priceDelta: 120 },
        ],
      },
    ],
    isAvailable: true,
  },
  {
    id: "bao",
    name: { fr: "Bao croustillant", en: "Crispy Bao" },
    description: {
      fr: "Bao farci au poulet frit et pickles",
      en: "Bao stuffed with fried chicken and pickles",
    },
    price: 890,
    categoryId: "mains",
    photo: "/images/bao.svg",
    badges: ["spicy"],
    allergens: ["gluten", "soja"],
    calories: 540,
    isAvailable: true,
  },
  {
    id: "mochi",
    name: { fr: "Mochi duo", en: "Mochi Duo" },
    description: {
      fr: "Deux mochis maison saveurs saison",
      en: "Two house mochi seasonal flavors",
    },
    price: 590,
    categoryId: "desserts",
    photo: "/images/mochi.svg",
    badges: [],
    allergens: ["soja"],
    calories: 260,
    isAvailable: true,
  },
  {
    id: "tea",
    name: { fr: "Thé glacé yuzu", en: "Yuzu Iced Tea" },
    description: {
      fr: "Infusion fraîchement brassée",
      en: "Freshly brewed infusion",
    },
    price: 450,
    categoryId: "drinks",
    photo: "/images/yuzu-tea.svg",
    badges: [],
    allergens: [],
    isAvailable: true,
  },
];

export const discounts: Discount[] = [
  {
    id: "launch10",
    code: "BULPAN10",
    label: "10% de bienvenue",
    type: "percentage",
    value: 10,
    isActive: true,
  },
  {
    id: "dessert",
    code: "SWEET5",
    label: "-5€ pour un menu complet",
    type: "amount",
    value: 500,
    isActive: false,
  },
];
