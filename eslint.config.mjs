// Konfigurasi ESLint format flat (ESLint 9 / eslint-config-next 16).
// Pengganti .eslintrc.json lama ("next/core-web-vitals"); aturan sama.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] }
];

export default config;
