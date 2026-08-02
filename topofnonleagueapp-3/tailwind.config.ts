import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0f0d",
        bg2: "#0e1512",
        card: "#131b18",
        line: "rgba(255,255,255,0.07)",
        lineHi: "rgba(255,255,255,0.14)",
        ink: "#eef3f0",
        sub: "#8ea39a",
        subDim: "#5c6e67",
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
