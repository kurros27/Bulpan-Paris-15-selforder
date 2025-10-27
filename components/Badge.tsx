"use client";

import { BadgeType } from "../lib/types";

const badgeLabels: Record<BadgeType, { fr: string; en: string; color: string }> = {
  vegan: { fr: "Vegan", en: "Vegan", color: "#2f9d44" },
  spicy: { fr: "Épicé", en: "Spicy", color: "#d9480f" },
  bestseller: { fr: "Best-seller", en: "Best seller", color: "#f08c00" },
};

export function Badge({ type, language }: { type: BadgeType; language: "fr" | "en" }) {
  const badge = badgeLabels[type];
  if (!badge) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "999px",
        padding: "0.1rem 0.5rem",
        fontSize: "0.75rem",
        backgroundColor: `${badge.color}22`,
        color: badge.color,
        fontWeight: 600,
      }}
    >
      {badge[language]}
    </span>
  );
}
