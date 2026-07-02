"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

/* Palette catégorielle de référence (ordre fixe, jamais cyclée : au-delà
   de 6 segments, les données sont repliées dans « Autre » en amont). */
export const SERIES = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
];

const AXIS_TICK = { fill: "var(--text-muted)", fontSize: 11 };
const GRID = { stroke: "var(--gridline)", strokeWidth: 1 };

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color?: string; dataKey?: string | number }[];
  label?: string;
  currency?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-hairline bg-surface px-3 py-2 text-xs shadow-md">
      {label ? <p className="mb-1 font-medium text-ink">{label}</p> : null}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2 text-ink-secondary">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color ?? "var(--series-1)" }}
          />
          {entry.name} :{" "}
          <span className="font-medium text-ink">
            {currency && entry.dataKey !== "orders"
              ? formatCurrency(entry.value)
              : entry.value.toLocaleString("fr-FR")}
          </span>
        </p>
      ))}
    </div>
  );
}

/** Évolution du chiffre d'affaires — aire 2px + lavis 10 %, une seule série. */
export function RevenueAreaChart({
  data,
  height = 260,
}: {
  data: { day: string; revenue: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid vertical={false} {...GRID} />
        <XAxis
          dataKey="day"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: "var(--baseline)" }}
          tickFormatter={(d: string) => d.slice(8, 10) + "/" + d.slice(5, 7)}
          minTickGap={24}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v: number) => `${v.toLocaleString("fr-FR")} €`}
        />
        <Tooltip content={<ChartTooltip currency />} cursor={{ stroke: "var(--baseline)" }} />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Chiffre d'affaires"
          stroke="var(--series-1)"
          strokeWidth={2}
          fill="var(--series-1)"
          fillOpacity={0.1}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface-1)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Commandes par heure — barres fines arrondies côté données, une série. */
export function HourBarChart({
  data,
  height = 260,
}: {
  data: { hour: number; orders: number }[];
  height?: number;
}) {
  const full = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}h`,
    orders: data.find((d) => d.hour === h)?.orders ?? 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={full} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid vertical={false} {...GRID} />
        <XAxis
          dataKey="hour"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: "var(--baseline)" }}
          minTickGap={12}
        />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--gridline)", opacity: 0.4 }} />
        <Bar
          dataKey="orders"
          name="Commandes"
          fill="var(--series-1)"
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Donut part-du-tout (≤ 6 segments — replier le reste dans « Autre » en amont). */
export function CategoryDonut({
  data,
  height = 260,
  currency = true,
}: {
  data: { name: string; value: number }[];
  height?: number;
  currency?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          stroke="var(--surface-1)"
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={SERIES[i % SERIES.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip currency={currency} />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span className="text-xs text-ink-secondary">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
/* Rampe séquentielle bleue (une teinte, clair → foncé) — palette de référence. */
const HEAT_RAMP = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];

/** Carte thermique jour × heure des ventes (rampe séquentielle monochrome). */
export function SalesHeatmap({ data }: { data: { dow: number; hour: number; orders: number }[] }) {
  const byCell = new Map(data.map((d) => [`${d.dow}-${d.hour}`, d.orders]));
  const max = Math.max(1, ...data.map((d) => d.orders));
  const hours = Array.from({ length: 16 }, (_, i) => i + 8); // 8h → 23h

  return (
    <div className="thin-scrollbar overflow-x-auto">
      <table className="border-separate" style={{ borderSpacing: 2 }} aria-label="Ventes par jour et heure">
        <thead>
          <tr>
            <th className="w-8" />
            {hours.map((h) => (
              <th key={h} className="min-w-7 pb-1 text-center text-[10px] font-normal text-ink-muted">
                {h}h
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS_FR.map((day, di) => (
            <tr key={day}>
              <td className="pr-1 text-right text-[10px] text-ink-muted">{day}</td>
              {hours.map((h) => {
                const value = byCell.get(`${di + 1}-${h}`) ?? 0;
                const intensity = value === 0 ? -1 : Math.min(6, Math.floor((value / max) * 6));
                return (
                  <td
                    key={h}
                    title={`${day} ${h}h — ${value} commande${value > 1 ? "s" : ""}`}
                    className="h-6 min-w-7 rounded"
                    style={{
                      background: intensity < 0 ? "var(--gridline)" : HEAT_RAMP[intensity],
                      opacity: intensity < 0 ? 0.4 : 1,
                    }}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-ink-muted">
        Faible
        {HEAT_RAMP.map((c) => (
          <span key={c} className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
        ))}
        Élevé
      </div>
    </div>
  );
}
