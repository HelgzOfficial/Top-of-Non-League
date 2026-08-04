import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // These eight vary between light/dark theme — see the CSS custom
        // properties defined in globals.css (:root vs html.light). The
        // brand accents below stay fixed across both themes on purpose.
        bg: "var(--color-bg)",
        bg2: "var(--color-bg2)",
        card: "var(--color-card)",
        line: "var(--color-line)",
        lineHi: "var(--color-lineHi)",
        ink: "var(--color-ink)",
        sub: "var(--color-sub)",
        subDim: "var(--color-subDim)",
        brandGreen: "#3ddc84",
        brandGreenDim: "#2ba566",
        gold: "#f4c04a",
        red: "#ef5a5a",
      },
      borderRadius: {
        card: "18px",
        smcard: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
