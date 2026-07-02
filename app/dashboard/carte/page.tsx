"use client";

import { useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Upload,
  Download,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { api, useApi } from "@/lib/client";
import { cn, formatCurrency, PRODUCT_TAGS } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Input,
  Label,
  Select,
  Spinner,
  Switch,
  Textarea,
} from "@/components/ui";

type Choice = { id?: string; name: string; priceDelta: number; isAvailable?: boolean };
type Group = {
  id?: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  choices: Choice[];
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
  vatRate: number;
  optionGroups: Group[];
};
type Category = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  products: Product[];
};

export default function MenuManagementPage() {
  const { data: categories, mutate, setData } = useApi<Category[]>("/api/categories");
  const [categoryDialog, setCategoryDialog] = useState<{ id?: string; name: string; description: string } | null>(null);
  const [productDialog, setProductDialog] = useState<{ product: Product | null; categoryId: string } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragProduct = useRef<{ categoryId: string; productId: string } | null>(null);
  const dragCategory = useRef<string | null>(null);

  if (!categories) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  async function saveCategory() {
    if (!categoryDialog) return;
    setBusy(true);
    try {
      if (categoryDialog.id) {
        await api(`/api/categories/${categoryDialog.id}`, {
          method: "PATCH",
          json: { name: categoryDialog.name, description: categoryDialog.description || null },
        });
      } else {
        await api("/api/categories", {
          method: "POST",
          json: { name: categoryDialog.name, description: categoryDialog.description || null },
        });
      }
      setCategoryDialog(null);
      mutate();
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(category: Category) {
    if (!confirm(`Supprimer « ${category.name} » et ses ${category.products.length} produit(s) ?`)) return;
    await api(`/api/categories/${category.id}`, { method: "DELETE" });
    mutate();
  }

  async function toggleCategory(category: Category) {
    await api(`/api/categories/${category.id}`, {
      method: "PATCH",
      json: { isActive: !category.isActive },
    });
    mutate();
  }

  async function toggleProductAvailability(product: Product) {
    await api(`/api/products/${product.id}`, {
      method: "PATCH",
      json: { isAvailable: !product.isAvailable },
    });
    mutate();
  }

  async function deleteProduct(product: Product) {
    if (!confirm(`Supprimer « ${product.name} » ?`)) return;
    await api(`/api/products/${product.id}`, { method: "DELETE" });
    mutate();
  }

  /* Réorganisation par glisser-déposer (produits au sein d'une catégorie) */
  function onProductDrop(categoryId: string, targetProductId: string) {
    const drag = dragProduct.current;
    dragProduct.current = null;
    if (!drag || drag.categoryId !== categoryId || drag.productId === targetProductId || !categories) return;
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    const ids = category.products.map((p) => p.id);
    const fromIndex = ids.indexOf(drag.productId);
    const toIndex = ids.indexOf(targetProductId);
    ids.splice(toIndex, 0, ...ids.splice(fromIndex, 1));
    setData(
      categories.map((c) =>
        c.id === categoryId
          ? { ...c, products: ids.map((id) => c.products.find((p) => p.id === id)!) }
          : c
      )
    );
    api("/api/products/reorder", { method: "POST", json: { ids } }).catch(() => mutate());
  }

  function onCategoryDrop(targetId: string) {
    const dragged = dragCategory.current;
    dragCategory.current = null;
    if (!dragged || dragged === targetId || !categories) return;
    const ids = categories.map((c) => c.id);
    const fromIndex = ids.indexOf(dragged);
    const toIndex = ids.indexOf(targetId);
    ids.splice(toIndex, 0, ...ids.splice(fromIndex, 1));
    setData(ids.map((id) => categories.find((c) => c.id === id)!));
    api("/api/categories/reorder", { method: "POST", json: { ids } }).catch(() => mutate());
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setImportResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await api<{ createdCategories: number; createdProducts: number; updatedProducts: number }>(
        "/api/menu/import",
        { method: "POST", body: form }
      );
      setImportResult(
        `Import réussi : ${result.createdCategories} catégorie(s) et ${result.createdProducts} produit(s) créés, ${result.updatedProducts} mis à jour.`
      );
      mutate();
    } catch (error) {
      setImportResult(error instanceof Error ? error.message : "Erreur d'import");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Carte</h1>
          <p className="text-sm text-ink-muted">Catégories, produits, options et suppléments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={onImport} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="h-4 w-4" />
            Importer (.xlsx)
          </Button>
          <a href="/api/menu/export" download>
            <Button variant="outline">
              <Download className="h-4 w-4" />
              Exporter
            </Button>
          </a>
          <Button variant="brand" onClick={() => setCategoryDialog({ name: "", description: "" })}>
            <Plus className="h-4 w-4" />
            Catégorie
          </Button>
        </div>
      </div>

      {importResult ? (
        <p className="rounded-lg border border-hairline bg-surface px-3 py-2 text-sm">{importResult}</p>
      ) : null}

      {categories.length === 0 ? (
        <EmptyState
          title="Votre carte est vide"
          hint="Créez une première catégorie ou importez votre carte depuis Excel."
        />
      ) : (
        categories.map((category) => {
          const isCollapsed = collapsed.has(category.id);
          return (
            <Card
              key={category.id}
              className={cn("p-0", !category.isActive && "opacity-60")}
              draggable
              onDragStart={() => (dragCategory.current = category.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onCategoryDrop(category.id)}
            >
              <div className="flex items-center gap-2 px-4 py-3">
                <GripVertical className="h-4 w-4 cursor-grab text-ink-muted" aria-hidden />
                <button
                  onClick={() =>
                    setCollapsed((prev) => {
                      const next = new Set(prev);
                      if (next.has(category.id)) next.delete(category.id);
                      else next.add(category.id);
                      return next;
                    })
                  }
                  className="flex items-center gap-2 font-semibold"
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {category.name}
                  <span className="text-xs font-normal text-ink-muted">
                    {category.products.length} produit{category.products.length > 1 ? "s" : ""}
                  </span>
                </button>
                {!category.isActive ? <Badge variant="warning">Masquée</Badge> : null}
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleCategory(category)}
                    aria-label={category.isActive ? "Masquer la catégorie" : "Afficher la catégorie"}
                  >
                    {category.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setCategoryDialog({
                        id: category.id,
                        name: category.name,
                        description: category.description ?? "",
                      })
                    }
                    aria-label="Modifier la catégorie"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCategory(category)}
                    aria-label="Supprimer la catégorie"
                  >
                    <Trash2 className="h-4 w-4 text-critical" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProductDialog({ product: null, categoryId: category.id })}
                  >
                    <Plus className="h-4 w-4" />
                    Produit
                  </Button>
                </div>
              </div>

              {!isCollapsed ? (
                <ul className="border-t border-hairline">
                  {category.products.map((product) => (
                    <li
                      key={product.id}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        dragProduct.current = { categoryId: category.id, productId: product.id };
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.stopPropagation();
                        onProductDrop(category.id, product.id);
                      }}
                      className={cn(
                        "flex items-center gap-3 border-b border-hairline px-4 py-2.5 last:border-b-0",
                        !product.isAvailable && "opacity-50"
                      )}
                    >
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-ink-muted" aria-hidden />
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-gridline" aria-hidden />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                          {product.name}
                          {product.tags.map((tag) => (
                            <Badge key={tag}>{tag}</Badge>
                          ))}
                          {product.optionGroups.length > 0 ? (
                            <Badge variant="outline">{product.optionGroups.length} option(s)</Badge>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-ink-muted">{product.description}</p>
                      </div>
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(product.price)}
                      </span>
                      <Switch
                        checked={product.isAvailable}
                        onCheckedChange={() => toggleProductAvailability(product)}
                        aria-label={`Disponibilité de ${product.name}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setProductDialog({ product, categoryId: category.id })}
                        aria-label={`Modifier ${product.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteProduct(product)}
                        aria-label={`Supprimer ${product.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-critical" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          );
        })
      )}

      {/* Dialogue catégorie */}
      <Dialog
        open={categoryDialog !== null}
        onClose={() => setCategoryDialog(null)}
        title={categoryDialog?.id ? "Modifier la catégorie" : "Nouvelle catégorie"}
      >
        {categoryDialog ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="cat-name">Nom</Label>
              <Input
                id="cat-name"
                value={categoryDialog.name}
                onChange={(e) => setCategoryDialog({ ...categoryDialog, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                rows={2}
                value={categoryDialog.description}
                onChange={(e) => setCategoryDialog({ ...categoryDialog, description: e.target.value })}
              />
            </div>
            <Button variant="brand" className="w-full" disabled={busy || !categoryDialog.name.trim()} onClick={saveCategory}>
              Enregistrer
            </Button>
          </div>
        ) : null}
      </Dialog>

      {/* Dialogue produit */}
      {productDialog ? (
        <ProductDialog
          product={productDialog.product}
          categoryId={productDialog.categoryId}
          categories={categories}
          onClose={() => setProductDialog(null)}
          onSaved={() => {
            setProductDialog(null);
            mutate();
          }}
        />
      ) : null}
    </div>
  );
}

const ALLERGENS = [
  "Gluten", "Crustacés", "Œufs", "Poisson", "Arachides", "Soja", "Lait",
  "Fruits à coque", "Céleri", "Moutarde", "Sésame", "Sulfites", "Lupin", "Mollusques",
];

function ProductDialog({
  product,
  categoryId,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null;
  categoryId: string;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product?.price ?? 0,
    imageUrl: product?.imageUrl ?? "",
    categoryId,
    prepTimeMinutes: product?.prepTimeMinutes ?? 10,
    vatRate: product?.vatRate ?? 10,
    allergens: product?.allergens ?? [],
    tags: product?.tags ?? [],
    isAvailable: product?.isAvailable ?? true,
  });
  const [groups, setGroups] = useState<Group[]>(
    product?.optionGroups.map((g) => ({
      name: g.name,
      isRequired: g.isRequired,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      choices: g.choices.map((c) => ({ name: c.name, priceDelta: c.priceDelta })),
    })) ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...form,
        description: form.description || null,
        imageUrl: form.imageUrl || null,
        price: Number(form.price),
        prepTimeMinutes: Number(form.prepTimeMinutes),
        vatRate: Number(form.vatRate),
        optionGroups: groups
          .filter((g) => g.name.trim() && g.choices.some((c) => c.name.trim()))
          .map((g) => ({
            ...g,
            choices: g.choices
              .filter((c) => c.name.trim())
              .map((c) => ({ name: c.name, priceDelta: Number(c.priceDelta) || 0 })),
          })),
      };
      if (product) {
        await api(`/api/products/${product.id}`, { method: "PATCH", json: payload });
      } else {
        await api("/api/products", { method: "POST", json: payload });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'enregistrement");
      setBusy(false);
    }
  }

  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <Dialog open onClose={onClose} title={product ? "Modifier le produit" : "Nouveau produit"} wide>
      <div className="space-y-4">
        {error ? (
          <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical" role="alert">
            {error}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="p-name">Nom</Label>
            <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="p-desc">Description</Label>
            <Textarea
              id="p-desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="p-price">Prix (€)</Label>
            <Input
              id="p-price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="p-category">Catégorie</Label>
            <Select
              id="p-category"
              className="w-full"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="p-prep">Temps de préparation (min)</Label>
            <Input
              id="p-prep"
              type="number"
              min="0"
              value={form.prepTimeMinutes}
              onChange={(e) => setForm({ ...form, prepTimeMinutes: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="p-vat">TVA (%)</Label>
            <Input
              id="p-vat"
              type="number"
              step="0.1"
              min="0"
              value={form.vatRate}
              onChange={(e) => setForm({ ...form, vatRate: Number(e.target.value) })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="p-image">URL de la photo</Label>
            <Input
              id="p-image"
              type="url"
              placeholder="https://…"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label>Étiquettes</Label>
          <div className="flex flex-wrap gap-1.5">
            {PRODUCT_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setForm({ ...form, tags: toggleIn(form.tags, tag) })}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  form.tags.includes(tag)
                    ? "border-transparent bg-brand text-white"
                    : "border-hairline text-ink-secondary"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Allergènes</Label>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGENS.map((allergen) => (
              <button
                key={allergen}
                type="button"
                onClick={() => setForm({ ...form, allergens: toggleIn(form.allergens, allergen) })}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  form.allergens.includes(allergen)
                    ? "border-transparent bg-ink text-page"
                    : "border-hairline text-ink-secondary"
                )}
              >
                {allergen}
              </button>
            ))}
          </div>
        </div>

        {/* Options & suppléments */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="mb-0">Options & suppléments</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setGroups([
                  ...groups,
                  { name: "", isRequired: false, minSelect: 0, maxSelect: 1, choices: [{ name: "", priceDelta: 0 }] },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              Groupe
            </Button>
          </div>
          {groups.map((group, gi) => (
            <div key={gi} className="space-y-2 rounded-lg border border-hairline p-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Nom du groupe (ex. : Choix de pâte, Suppléments)"
                  value={group.name}
                  onChange={(e) =>
                    setGroups(groups.map((g, i) => (i === gi ? { ...g, name: e.target.value } : g)))
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setGroups(groups.filter((_, i) => i !== gi))}
                  aria-label="Supprimer le groupe"
                >
                  <Trash2 className="h-4 w-4 text-critical" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={group.isRequired}
                    onCheckedChange={(checked) =>
                      setGroups(
                        groups.map((g, i) =>
                          i === gi ? { ...g, isRequired: checked, minSelect: checked ? Math.max(1, g.minSelect) : 0 } : g
                        )
                      )
                    }
                    aria-label="Obligatoire"
                  />
                  Obligatoire
                </label>
                <label className="flex items-center gap-1.5">
                  Max
                  <Input
                    type="number"
                    min="0"
                    className="h-8 w-16"
                    value={group.maxSelect}
                    onChange={(e) =>
                      setGroups(groups.map((g, i) => (i === gi ? { ...g, maxSelect: Number(e.target.value) } : g)))
                    }
                    aria-label="Sélections maximum (0 = illimité)"
                  />
                  <span className="text-xs text-ink-muted">(0 = illimité)</span>
                </label>
              </div>
              {group.choices.map((choice, ci) => (
                <div key={ci} className="flex items-center gap-2">
                  <Input
                    placeholder="Choix (ex. : Fine, Mozzarella…)"
                    value={choice.name}
                    onChange={(e) =>
                      setGroups(
                        groups.map((g, i) =>
                          i === gi
                            ? { ...g, choices: g.choices.map((c, j) => (j === ci ? { ...c, name: e.target.value } : c)) }
                            : g
                        )
                      )
                    }
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-24"
                    value={choice.priceDelta}
                    onChange={(e) =>
                      setGroups(
                        groups.map((g, i) =>
                          i === gi
                            ? {
                                ...g,
                                choices: g.choices.map((c, j) =>
                                  j === ci ? { ...c, priceDelta: Number(e.target.value) } : c
                                ),
                              }
                            : g
                        )
                      )
                    }
                    aria-label="Prix supplémentaire"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setGroups(
                        groups.map((g, i) =>
                          i === gi ? { ...g, choices: g.choices.filter((_, j) => j !== ci) } : g
                        )
                      )
                    }
                    aria-label="Supprimer le choix"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setGroups(
                    groups.map((g, i) =>
                      i === gi ? { ...g, choices: [...g.choices, { name: "", priceDelta: 0 }] } : g
                    )
                  )
                }
              >
                <Plus className="h-4 w-4" />
                Ajouter un choix
              </Button>
            </div>
          ))}
        </div>

        <Button variant="brand" className="w-full" disabled={busy || !form.name.trim()} onClick={save}>
          {busy ? "Enregistrement…" : "Enregistrer le produit"}
        </Button>
      </div>
    </Dialog>
  );
}
