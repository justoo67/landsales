import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      /**
       * React Compiler rules introduced with eslint-config-next 16. The MVP was
       * written before these existed and uses patterns they flag (setState in
       * effects to sync with localStorage/network, ids generated with Date.now
       * inside handlers). Downgraded to warnings so `npm run lint` can gate CI;
       * fix them incrementally as each screen is touched.
       */
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
    },
  },
]);

export default eslintConfig;
