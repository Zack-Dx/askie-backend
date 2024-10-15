import globals from "globals";
import pluginJs from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

export default [
    { languageOptions: { globals: globals.node } },
    pluginJs.configs.recommended,
    eslintPluginPrettier,
    {
        rules: {
            "no-unused-vars": "error",
            "arrow-body-style": ["error", "always"],
        },
    },
];
