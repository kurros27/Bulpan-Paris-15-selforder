"use client";

import { useMemo, useRef, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, ChevronLeft, Clock, Info } from "lucide-react";
import { api } from "@/lib/client";
import { cn, formatCurrency } from "@/lib/utils";
import { Button, Textarea, Input, Label, Badge } from "@/components/ui";

export type PublicMenu = {
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  currency: string;
  primaryColor: string;
  darkMode: boolean;
  categories: {
    id: string;
    name: string;
    description: string | null;
    products: Product[];
  }[];
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  prepTimeMinutes: number;
  allergens: string[];
  tags: string[];
  optionGroups: OptionGroup[];
};

type OptionGroup = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  choices: { id: string; name: string; priceDelta: number }[];
};

type CartLine = {
  key: string;
  product: Product;
  quantity: number;
  choiceIds: string[];
  choiceLabels: string[];
  unitPrice: number;
  comment: string;
};

const TAG_VARIANTS: Record<string, "brand" | "good" | "warning" | "default"> = {
  Nouveau: "brand",
  Populaire: "warning",
  Végétarien: "good",
  Vegan: "good",
};

function MenuInner({ menu }: { menu: PublicMenu }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableFromQr = searchParams.get("table") ?? "";

  const [activeCategory, setActiveCategory] = useState(menu.categories[0]?.id);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [view, setView] = useState<"menu" | "cart" | "checkout">("menu");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  const brand = menu.primaryColor;

  function addToCart(line: Omit<CartLine, "key">) {
    const key = `${line.product.id}|${[...line.choiceIds].sort().join(",")}|${line.comment}`;
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + line.quantity } : l));
      }
      return [...prev, { ...line, key }];
    });
    setSelectedProduct(null);
  }

  function updateQuantity(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  async function submitOrder(customerName: string, tableName: string, type: "DINE_IN" | "TAKEAWAY") {
    setSubmitting(true);
    setError(null);
    try {
      const order = await api<{ id: string }>("/api/public/orders", {
        method: "POST",
        json: {
          restaurantSlug: menu.slug,
          customerName: customerName || null,
          type,
          tableName: type === "DINE_IN" ? tableName || null : null,
          items: cart.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
            choiceIds: line.choiceIds,
            comment: line.comment || null,
          })),
        },
      });
      setCart([]);
      router.push(`/menu/${menu.slug}/commande/${order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'envoi");
      setSubmitting(false);
    }
  }

  function scrollToCategory(id: string) {
    setActiveCategory(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={cn("min-h-screen bg-page pb-24", menu.darkMode && "dark")}>
      {/* En-tête restaurant */}
      <header className="bg-surface px-4 pb-3 pt-6 text-center shadow-sm">
        {menu.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={menu.logoUrl}
            alt={menu.name}
            className="mx-auto mb-2 h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div
            className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
            style={{ background: brand }}
            aria-hidden
          >
            {menu.name.charAt(0)}
          </div>
        )}
        <h1 className="text-xl font-bold">{menu.name}</h1>
        {menu.description ? <p className="mt-1 text-sm text-ink-secondary">{menu.description}</p> : null}
        {tableFromQr ? (
          <p className="mt-2 inline-block rounded-full border border-hairline px-3 py-1 text-xs text-ink-secondary">
            Table : {tableFromQr}
          </p>
        ) : null}
      </header>

      {/* Barre de catégories collante */}
      <nav
        className="thin-scrollbar sticky top-0 z-30 flex gap-2 overflow-x-auto bg-surface px-4 py-3 shadow-sm"
        aria-label="Catégories"
      >
        {menu.categories.map((category) => (
          <button
            key={category.id}
            onClick={() => scrollToCategory(category.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeCategory === category.id
                ? "text-white"
                : "bg-black/5 text-ink-secondary hover:text-ink dark:bg-white/10"
            )}
            style={activeCategory === category.id ? { background: brand } : undefined}
          >
            {category.name}
          </button>
        ))}
      </nav>

      {/* Produits */}
      <main className="mx-auto max-w-2xl px-4">
        {menu.categories.map((category) => (
          <section
            key={category.id}
            ref={(el) => {
              sectionRefs.current[category.id] = el;
            }}
            className="scroll-mt-16 pt-6"
            aria-labelledby={`cat-${category.id}`}
          >
            <h2 id={`cat-${category.id}`} className="mb-1 text-lg font-bold">
              {category.name}
            </h2>
            {category.description ? (
              <p className="mb-3 text-sm text-ink-muted">{category.description}</p>
            ) : null}
            <div className="space-y-3">
              {category.products.map((product) => (
                <button
                  key={product.id}
                  disabled={!product.isAvailable}
                  onClick={() => setSelectedProduct(product)}
                  className={cn(
                    "flex w-full items-stretch gap-3 rounded-xl border border-hairline bg-surface p-3 text-left transition-shadow hover:shadow-md",
                    !product.isAvailable && "opacity-50"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold">{product.name}</span>
                      {product.tags.map((tag) => (
                        <Badge key={tag} variant={TAG_VARIANTS[tag] ?? "default"}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {product.description ? (
                      <p className="mt-0.5 line-clamp-2 text-sm text-ink-secondary">
                        {product.description}
                      </p>
                    ) : null}
                    <p className="mt-1 font-medium" style={{ color: brand }}>
                      {formatCurrency(product.price, menu.currency)}
                    </p>
                    {!product.isAvailable ? (
                      <p className="text-xs text-ink-muted">Indisponible</p>
                    ) : null}
                  </div>
                  {product.imageUrl ? (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={product.imageUrl}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ))}
        {menu.address || menu.phone ? (
          <footer className="mt-10 border-t border-hairline pb-6 pt-4 text-center text-xs text-ink-muted">
            {menu.address ? <p>{menu.address}</p> : null}
            {menu.phone ? <p>{menu.phone}</p> : null}
          </footer>
        ) : null}
      </main>

      {/* Bouton panier flottant */}
      {cartCount > 0 && view === "menu" ? (
        <div className="fixed inset-x-0 bottom-0 z-40 p-4">
          <button
            onClick={() => setView("cart")}
            className="mx-auto flex w-full max-w-2xl items-center justify-between rounded-xl px-5 py-3.5 font-medium text-white shadow-lg"
            style={{ background: brand }}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" aria-hidden />
              {cartCount} article{cartCount > 1 ? "s" : ""}
            </span>
            <span>{formatCurrency(cartTotal, menu.currency)}</span>
          </button>
        </div>
      ) : null}

      {/* Fiche produit */}
      {selectedProduct ? (
        <ProductSheet
          product={selectedProduct}
          currency={menu.currency}
          brand={brand}
          onClose={() => setSelectedProduct(null)}
          onAdd={addToCart}
        />
      ) : null}

      {/* Panier / validation */}
      {view !== "menu" ? (
        <CartSheet
          cart={cart}
          currency={menu.currency}
          brand={brand}
          checkout={view === "checkout"}
          submitting={submitting}
          error={error}
          defaultTable={tableFromQr}
          onBack={() => setView(view === "checkout" ? "cart" : "menu")}
          onCheckout={() => setView("checkout")}
          onQuantity={updateQuantity}
          onSubmit={submitOrder}
        />
      ) : null}
    </div>
  );
}

function ProductSheet({
  product,
  currency,
  brand,
  onClose,
  onAdd,
}: {
  product: Product;
  currency: string;
  brand: string;
  onClose: () => void;
  onAdd: (line: Omit<CartLine, "key">) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [choiceIds, setChoiceIds] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const choiceById = useMemo(
    () =>
      new Map(
        product.optionGroups.flatMap((g) => g.choices.map((c) => [c.id, { group: g, choice: c }]))
      ),
    [product]
  );

  function toggleChoice(group: OptionGroup, choiceId: string) {
    setChoiceIds((prev) => {
      const inGroup = group.choices.map((c) => c.id);
      const selectedInGroup = prev.filter((id) => inGroup.includes(id));
      if (prev.includes(choiceId)) return prev.filter((id) => id !== choiceId);
      // choix unique : remplace la sélection du groupe
      if (group.maxSelect === 1) {
        return [...prev.filter((id) => !inGroup.includes(id)), choiceId];
      }
      if (group.maxSelect > 0 && selectedInGroup.length >= group.maxSelect) return prev;
      return [...prev, choiceId];
    });
  }

  const optionsTotal = choiceIds.reduce(
    (sum, id) => sum + (choiceById.get(id)?.choice.priceDelta ?? 0),
    0
  );
  const unitPrice = product.price + optionsTotal;

  const missingRequired = product.optionGroups.some((group) => {
    const min = group.isRequired ? Math.max(group.minSelect, 1) : group.minSelect;
    const count = choiceIds.filter((id) => group.choices.some((c) => c.id === id)).length;
    return count < min;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-surface sm:rounded-2xl">
        <div className="thin-scrollbar flex-1 overflow-y-auto">
          {product.imageUrl ? (
            <div className="relative h-48 w-full overflow-hidden rounded-t-2xl">
              <Image src={product.imageUrl} alt="" fill sizes="512px" className="object-cover" unoptimized />
            </div>
          ) : null}
          <div className="space-y-4 p-5">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold">{product.name}</h2>
                <span className="font-semibold" style={{ color: brand }}>
                  {formatCurrency(product.price, currency)}
                </span>
              </div>
              {product.description ? (
                <p className="mt-1 text-sm text-ink-secondary">{product.description}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {product.prepTimeMinutes} min
                </span>
                {product.allergens.length > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" aria-hidden />
                    Allergènes : {product.allergens.join(", ")}
                  </span>
                ) : null}
              </div>
            </div>

            {product.optionGroups.map((group) => (
              <fieldset key={group.id}>
                <legend className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  {group.name}
                  {group.isRequired || group.minSelect > 0 ? (
                    <Badge variant="brand">Obligatoire</Badge>
                  ) : (
                    <Badge>Optionnel</Badge>
                  )}
                  {group.maxSelect > 1 ? (
                    <span className="text-xs font-normal text-ink-muted">
                      (max {group.maxSelect})
                    </span>
                  ) : null}
                </legend>
                <div className="space-y-1.5">
                  {group.choices.map((choice) => {
                    const checked = choiceIds.includes(choice.id);
                    return (
                      <label
                        key={choice.id}
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm",
                          checked ? "border-transparent ring-2" : "border-hairline"
                        )}
                        style={checked ? ({ ["--tw-ring-color" as string]: brand } as React.CSSProperties) : undefined}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type={group.maxSelect === 1 ? "radio" : "checkbox"}
                            name={group.id}
                            checked={checked}
                            onChange={() => toggleChoice(group, choice.id)}
                            className="accent-current"
                            style={{ accentColor: brand }}
                          />
                          {choice.name}
                        </span>
                        {choice.priceDelta > 0 ? (
                          <span className="text-ink-secondary">
                            +{formatCurrency(choice.priceDelta, currency)}
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <div>
              <Label htmlFor="comment">Commentaire</Label>
              <Textarea
                id="comment"
                rows={2}
                placeholder="Ex. : sans oignons"
                value={comment}
                maxLength={300}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-hairline p-4">
          <div className="flex items-center rounded-lg border border-hairline">
            <button
              className="p-2.5"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Diminuer la quantité"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center font-medium" aria-live="polite">
              {quantity}
            </span>
            <button
              className="p-2.5"
              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
              aria-label="Augmenter la quantité"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            disabled={missingRequired}
            onClick={() =>
              onAdd({
                product,
                quantity,
                choiceIds,
                choiceLabels: choiceIds.map((id) => choiceById.get(id)?.choice.name ?? ""),
                unitPrice,
                comment: comment.trim(),
              })
            }
            className="flex-1 rounded-xl py-3 font-medium text-white disabled:opacity-50"
            style={{ background: brand }}
          >
            Ajouter · {formatCurrency(unitPrice * quantity, currency)}
          </button>
        </div>
      </div>
    </div>
  );
}

function CartSheet({
  cart,
  currency,
  brand,
  checkout,
  submitting,
  error,
  defaultTable,
  onBack,
  onCheckout,
  onQuantity,
  onSubmit,
}: {
  cart: CartLine[];
  currency: string;
  brand: string;
  checkout: boolean;
  submitting: boolean;
  error: string | null;
  defaultTable: string;
  onBack: () => void;
  onCheckout: () => void;
  onQuantity: (key: string, delta: number) => void;
  onSubmit: (name: string, table: string, type: "DINE_IN" | "TAKEAWAY") => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [tableName, setTableName] = useState(defaultTable);
  const [type, setType] = useState<"DINE_IN" | "TAKEAWAY">("DINE_IN");
  const total = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-page">
      <header className="flex items-center gap-3 bg-surface px-4 py-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Retour">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">{checkout ? "Validation" : "Votre panier"}</h2>
      </header>

      <div className="thin-scrollbar mx-auto w-full max-w-2xl flex-1 overflow-y-auto p-4">
        {!checkout ? (
          cart.length === 0 ? (
            <p className="py-16 text-center text-ink-muted">Votre panier est vide.</p>
          ) : (
            <ul className="space-y-3">
              {cart.map((line) => (
                <li key={line.key} className="rounded-xl border border-hairline bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{line.product.name}</p>
                      {line.choiceLabels.length > 0 ? (
                        <p className="text-xs text-ink-secondary">{line.choiceLabels.join(" · ")}</p>
                      ) : null}
                      {line.comment ? (
                        <p className="text-xs italic text-ink-muted">« {line.comment} »</p>
                      ) : null}
                    </div>
                    <p className="font-medium">
                      {formatCurrency(line.unitPrice * line.quantity, currency)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      className="rounded-lg border border-hairline p-1.5"
                      onClick={() => onQuantity(line.key, -1)}
                      aria-label={`Retirer un ${line.product.name}`}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{line.quantity}</span>
                    <button
                      className="rounded-lg border border-hairline p-1.5"
                      onClick={() => onQuantity(line.key, 1)}
                      aria-label={`Ajouter un ${line.product.name}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2" role="radiogroup" aria-label="Type de commande">
              {(
                [
                  ["DINE_IN", "Sur place"],
                  ["TAKEAWAY", "À emporter"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  role="radio"
                  aria-checked={type === value}
                  onClick={() => setType(value)}
                  className={cn(
                    "flex-1 rounded-xl border py-3 text-sm font-medium",
                    type === value ? "border-transparent text-white" : "border-hairline bg-surface"
                  )}
                  style={type === value ? { background: brand } : undefined}
                >
                  {label}
                </button>
              ))}
            </div>
            <div>
              <Label htmlFor="customerName">Votre nom (facultatif)</Label>
              <Input
                id="customerName"
                value={customerName}
                maxLength={60}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            {type === "DINE_IN" ? (
              <div>
                <Label htmlFor="tableName">Numéro de table</Label>
                <Input
                  id="tableName"
                  value={tableName}
                  maxLength={40}
                  placeholder="Ex. : 12"
                  onChange={(e) => setTableName(e.target.value)}
                />
              </div>
            ) : null}
            <div className="rounded-xl border border-hairline bg-surface p-4">
              <h3 className="mb-2 text-sm font-semibold">Récapitulatif</h3>
              <ul className="space-y-1 text-sm text-ink-secondary">
                {cart.map((line) => (
                  <li key={line.key} className="flex justify-between">
                    <span>
                      {line.quantity}× {line.product.name}
                    </span>
                    <span>{formatCurrency(line.unitPrice * line.quantity, currency)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex justify-between border-t border-hairline pt-2 font-semibold text-ink">
                <span>Total</span>
                <span>{formatCurrency(total, currency)}</span>
              </p>
            </div>
            {error ? (
              <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {cart.length > 0 ? (
        <div className="mx-auto w-full max-w-2xl p-4">
          <button
            disabled={submitting}
            onClick={() =>
              checkout ? onSubmit(customerName.trim(), tableName.trim(), type) : onCheckout()
            }
            className="w-full rounded-xl py-3.5 font-medium text-white shadow-lg disabled:opacity-60"
            style={{ background: brand }}
          >
            {checkout
              ? submitting
                ? "Envoi en cours…"
                : `Valider la commande · ${formatCurrency(total, currency)}`
              : "Commander"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function MenuClient({ menu }: { menu: PublicMenu }) {
  return (
    <Suspense>
      <MenuInner menu={menu} />
    </Suspense>
  );
}
