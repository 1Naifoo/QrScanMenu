// Loads this client's brand colors and fonts (written to public/theme.json
// by scripts/generate-static.js, from client.config.json) and applies them
// as CSS custom properties — so styles.css never hard-codes any client's
// specific brand colors.

export async function applyTheme() {
  const res = await fetch("/theme.json");
  const theme = await res.json();
  const root = document.documentElement.style;

  root.setProperty("--c-background", theme.background);
  root.setProperty("--c-surface", theme.surface);
  root.setProperty("--c-surface-card", theme.surfaceCard);
  root.setProperty("--c-text-on-dark", theme.textOnDark);
  root.setProperty("--c-name", theme.nameColor);
  root.setProperty("--c-price", theme.priceColor);
  root.setProperty("--c-accent", theme.accent);
  root.setProperty("--c-danger", theme.danger);
  root.setProperty("--c-featured-bg", theme.featuredBg);
  root.setProperty("--font-display", `"${theme.fontDisplay}", sans-serif`);
  root.setProperty("--font-body", `"${theme.fontBody}", sans-serif`);

  return theme;
}
