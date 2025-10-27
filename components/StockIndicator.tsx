"use client";

interface Props {
  isAvailable: boolean;
  lowStock?: boolean;
}

export function StockIndicator({ isAvailable, lowStock }: Props) {
  if (!isAvailable) {
    return <span className="status status-out">Rupture</span>;
  }
  if (lowStock) {
    return <span className="status status-low">Bientôt indisponible</span>;
  }
  return <span className="status status-in">Disponible</span>;
}
