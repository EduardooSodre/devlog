import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    rules: {
      // ponytail: these effects read external state (localStorage, feature
      // detection, hydration guard) once on mount — the standard React
      // pattern this rule flags as a false positive. Revisit if the rule
      // gains an exception for empty-deps mount effects.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
