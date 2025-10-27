"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveData } from "../hooks/useLiveData";
import { formatPrice } from "../lib/format";
import { BadgeType, DashboardSummary, Order, Product } from "../lib/types";

interface MenuResponse {
  products: Product[];
  categories: { id: string; name: { fr: string; en: string } }[];
  discounts: { id: string; code: string }[];
}

const KDS_FLOW: Order["status"][] = ["placed", "in_kitchen", "ready", "served", "closed"];

export function StaffConsole() {
  const [tab, setTab] = useState("kds");
  const ordersQuery = useLiveData<Order[]>("/api/orders", { interval: 2000 });
  const menuQuery = useLiveData<MenuResponse>("/api/menu", { interval: 10000 });
  const auditQuery = useLiveData<{ id: string; actor: string; action: string; timestamp: string }[]>(
    "/api/audit",
    { interval: 8000 },
  );
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<DashboardSummary | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [formValues, setFormValues] = useState({
    nameFr: "",
    nameEn: "",
    price: "",
    category: "",
    allergens: "",
    badges: "",
  });

  const orders = ordersQuery.data ?? [];

  useEffect(() => {
    loadReport(reportDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function advanceOrder(order: Order) {
    const currentIndex = KDS_FLOW.indexOf(order.status);
    const normalizedIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextStatus = KDS_FLOW[Math.min(normalizedIndex + 1, KDS_FLOW.length - 1)];
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, actor: "kitchen" }),
    });
    ordersQuery.refresh();
  }

  async function captureCash(order: Order) {
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "capture_cash", actor: "cashier" }),
    });
    ordersQuery.refresh();
  }

  async function toggleAvailability(product: Product) {
    await fetch(`/api/products/${product.id}/availability`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !product.isAvailable, actor: "manager" }),
    });
    menuQuery.refresh();
  }

  async function submitProduct(event: React.FormEvent) {
    event.preventDefault();
    setCreatingProduct(true);
    const badgeValues = formValues.badges
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((value): value is BadgeType =>
        ["vegan", "spicy", "bestseller"].includes(value as BadgeType),
      );

    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: { fr: formValues.nameFr, en: formValues.nameEn },
        description: { fr: "", en: "" },
        price: Number(formValues.price) * 100,
        categoryId: formValues.category || menuQuery.data?.categories[0]?.id,
        allergens: formValues.allergens.split(",").map((item) => item.trim()).filter(Boolean),
        badges: badgeValues,
        actor: "manager",
      }),
    });
    setCreatingProduct(false);
    menuQuery.refresh();
    setFormValues({ nameFr: "", nameEn: "", price: "", category: "", allergens: "", badges: "" });
  }

  async function loadReport(date: string) {
    const response = await fetch(`/api/reporting?date=${date}`);
    if (response.ok) {
      const data = (await response.json()) as DashboardSummary;
      setReport(data);
    } else {
      setReport(null);
    }
  }

  async function exportCsv() {
    try {
      const response = await fetch(`/api/export?from=${reportDate}&to=${reportDate}`);
      if (!response.ok) {
        throw new Error("Export indisponible");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `bulpan-${reportDate}.csv`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Impossible de télécharger le fichier d'export pour le moment.");
    }
  }

  const kitchenColumns = useMemo(
    () => [
      { key: "placed", title: "Nouvelles", statuses: ["placed", "paid", "paid_waiting_cash"] },
      { key: "in_kitchen", title: "En préparation", statuses: ["in_kitchen"] },
      { key: "ready", title: "À dresser", statuses: ["ready"] },
      { key: "served", title: "Prêtes", statuses: ["served", "picked_up"] },
    ],
    [],
  );

  return (
    <div className="staff-console">
      <header>
        <h1>Console équipe Bulpan</h1>
        <nav>
          <button className={tab === "kds" ? "active" : ""} onClick={() => setTab("kds")}>KDS</button>
          <button className={tab === "cash" ? "active" : ""} onClick={() => setTab("cash")}>Caisse</button>
          <button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>Reporting</button>
          <button className={tab === "menu" ? "active" : ""} onClick={() => setTab("menu")}>Menu</button>
          <button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}>Journal</button>
        </nav>
      </header>

      {tab === "kds" && (
        <section className="kds-board">
          {kitchenColumns.map((column) => (
            <div key={column.key} className="kds-column">
              <h2>{column.title}</h2>
              {orders
                .filter((order) => column.statuses.includes(order.status))
                .map((order) => (
                  <article key={order.id} className="ticket">
                    <header>
                      <h3>{order.shortCode}</h3>
                      <p>{order.serviceType === "dine_in" ? `Table ${order.tableId ?? "?"}` : "À emporter"}</p>
                    </header>
                    <ul>
                      {order.items.map((item) => (
                        <li key={item.productId}>
                          {item.quantity} × {item.name.fr}
                        </li>
                      ))}
                    </ul>
                    <footer>
                      <span>{formatPrice(order.total)}</span>
                      <button type="button" onClick={() => advanceOrder(order)}>
                        Suivant
                      </button>
                    </footer>
                  </article>
                ))}
            </div>
          ))}
        </section>
      )}

      {tab === "cash" && (
        <section className="cash-queue">
          <h2>Commandes à encaisser</h2>
          {orders
            .filter((order) => order.payment.method === "cash" && order.payment.status !== "captured")
            .map((order) => (
              <article key={order.id} className="ticket">
                <header>
                  <h3>{order.shortCode}</h3>
                  <p>{order.serviceType === "dine_in" ? `Table ${order.tableId ?? "?"}` : "À emporter"}</p>
                </header>
                <p>À encaisser : {formatPrice(order.total)}</p>
                <button type="button" onClick={() => captureCash(order)}>
                  Marquer payé
                </button>
              </article>
            ))}
        </section>
      )}

      {tab === "dashboard" && (
        <section className="dashboard">
          <div className="filters">
            <label>
              Date
              <input
                type="date"
                value={reportDate}
                onChange={(event) => {
                  setReportDate(event.target.value);
                  loadReport(event.target.value);
                }}
              />
            </label>
            <button type="button" onClick={() => loadReport(reportDate)}>
              Rafraîchir
            </button>
            <button type="button" onClick={exportCsv}>
              Export CSV
            </button>
          </div>
          {report && (
            <dl className="metrics">
              <div>
                <dt>CA TTC</dt>
                <dd>{formatPrice(report.gross)}</dd>
              </div>
              <div>
                <dt>CA HT</dt>
                <dd>{formatPrice(report.net)}</dd>
              </div>
              <div>
                <dt>Commandes</dt>
                <dd>{report.orderCount}</dd>
              </div>
              <div>
                <dt>Ticket moyen</dt>
                <dd>{formatPrice(report.averageTicket)}</dd>
              </div>
              <div>
                <dt>Espèces</dt>
                <dd>{report.cashShare}%</dd>
              </div>
              <div>
                <dt>Carte</dt>
                <dd>{report.cardShare}%</dd>
              </div>
              <div>
                <dt>Taux annulation</dt>
                <dd>{report.cancellationRate}%</dd>
              </div>
            </dl>
          )}
          {report?.topProducts && (
            <section>
              <h3>Top produits</h3>
              <ul>
                {report.topProducts.map((item) => {
                  const productName = menuQuery.data?.products.find((product) => product.id === item.productId)?.name.fr;
                  return (
                    <li key={item.productId}>
                      {productName ?? item.productId} · {item.quantity} ventes
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </section>
      )}

      {tab === "menu" && (
        <section className="menu-manager">
          <h2>Gestion du menu</h2>
          <div className="product-list">
            {menuQuery.data?.products.map((product) => (
              <article key={product.id}>
                <h3>{product.name.fr}</h3>
                <p>{formatPrice(product.price)}</p>
                <p>Allergènes : {product.allergens.join(", ") || "Aucun"}</p>
                <button type="button" onClick={() => toggleAvailability(product)}>
                  {product.isAvailable ? "Mettre en rupture" : "Remettre en stock"}
                </button>
              </article>
            ))}
          </div>

          <form className="create-product" onSubmit={submitProduct}>
            <h3>Nouveau produit</h3>
            <label>
              Nom FR
              <input
                value={formValues.nameFr}
                onChange={(event) => setFormValues((prev) => ({ ...prev, nameFr: event.target.value }))}
                required
              />
            </label>
            <label>
              Nom EN
              <input
                value={formValues.nameEn}
                onChange={(event) => setFormValues((prev) => ({ ...prev, nameEn: event.target.value }))}
                required
              />
            </label>
            <label>
              Prix (€)
              <input
                type="number"
                step="0.1"
                value={formValues.price}
                onChange={(event) => setFormValues((prev) => ({ ...prev, price: event.target.value }))}
                required
              />
            </label>
            <label>
              Catégorie
              <select
                value={formValues.category}
                onChange={(event) => setFormValues((prev) => ({ ...prev, category: event.target.value }))}
              >
                <option value="">Choisir…</option>
                {menuQuery.data?.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name.fr}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Allergènes (séparés par des virgules)
              <input
                value={formValues.allergens}
                onChange={(event) => setFormValues((prev) => ({ ...prev, allergens: event.target.value }))}
              />
            </label>
            <label>
              Badges (vegan, spicy…)
              <input
                value={formValues.badges}
                onChange={(event) => setFormValues((prev) => ({ ...prev, badges: event.target.value }))}
              />
            </label>
            <button type="submit" className="primary" disabled={creatingProduct}>
              {creatingProduct ? "Création…" : "Enregistrer"}
            </button>
          </form>
        </section>
      )}

      {tab === "audit" && (
        <section className="audit-log">
          <h2>Journal</h2>
          <ul>
            {auditQuery.data?.map((event) => (
              <li key={event.id}>
                <strong>{event.action}</strong> par {event.actor} · {new Date(event.timestamp).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
