/** @type {import("prettier").Config} */

export default {
  printWidth: 100,

  plugins: ["@trivago/prettier-plugin-sort-imports", "prettier-plugin-tailwindcss"],

  importOrder: ["<BUILTIN_MODULES>", "<THIRD_PARTY_MODULES>", "^@/(.*)$", "^[.]"],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,

  tailwindFunctions: ["cn"],
};
