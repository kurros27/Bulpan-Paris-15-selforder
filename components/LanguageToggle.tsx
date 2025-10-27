"use client";

import { useLanguage } from "./LanguageContext";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="language-toggle" role="group" aria-label="Sélection langue">
      <button
        type="button"
        className={language === "fr" ? "active" : ""}
        onClick={() => setLanguage("fr")}
      >
        FR
      </button>
      <button
        type="button"
        className={language === "en" ? "active" : ""}
        onClick={() => setLanguage("en")}
      >
        EN
      </button>
    </div>
  );
}
