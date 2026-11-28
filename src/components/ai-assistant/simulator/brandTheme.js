// Tenant brand colours -> a small, contrast-safe palette shared by the simulator
// and the showcase. Only hex colours are accepted (tenant data is rendered into
// inline styles, so anything else falls back to WhatsApp teal).

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const FALLBACK = "#128C7E";

const expand = (hex) =>
  hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;

export const safeHex = (value, fallback = FALLBACK) => {
  const raw = String(value || "").trim();
  return HEX_PATTERN.test(raw) ? expand(raw).toLowerCase() : fallback;
};

const toRgb = (hex) => {
  const value = safeHex(hex).slice(1);
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
};

const toHex = (rgb) =>
  `#${rgb
    .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0"))
    .join("")}`;

// t = 0 -> a, t = 1 -> b
export const mixHex = (a, b, t) => {
  const ca = toRgb(a);
  const cb = toRgb(b);
  return toHex(ca.map((c, i) => c + (cb[i] - c) * t));
};

export const rgba = (hex, alpha) => {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const luminance = (hex) => {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

// Lighten/darken `hex` until it reaches `target` contrast against `background`.
const ensureContrast = (hex, background, target, towards) => {
  let color = hex;
  for (let step = 0; step < 12 && contrast(color, background) < target; step += 1) {
    color = mixHex(color, towards, 0.14);
  }
  return color;
};

export function brandTheme(brand) {
  const primary = safeHex(brand?.primary);
  const strong = safeHex(brand?.primaryDark, mixHex(primary, "#000000", 0.22));
  const onPrimary = contrast(primary, "#ffffff") >= 3 ? "#ffffff" : "#0b1220";
  return {
    primary,
    strong,
    onPrimary,
    // Text/icon colour that reads well on white and on the deep-ink sections.
    onLight: ensureContrast(primary, "#ffffff", 4.5, "#000000"),
    onDark: ensureContrast(primary, "#0b1220", 4.8, "#ffffff"),
    soft: rgba(primary, 0.1),
    ring: rgba(primary, 0.35),
    glow: rgba(primary, 0.28),
  };
}

// CSS custom properties for a subtree (use with style={...}).
export const themeVars = (theme) => ({
  "--acc": theme.primary,
  "--acc-strong": theme.strong,
  "--acc-on": theme.onPrimary,
  "--acc-light": theme.onLight,
  "--acc-dark": theme.onDark,
  "--acc-soft": theme.soft,
  "--acc-ring": theme.ring,
  "--acc-glow": theme.glow,
});
