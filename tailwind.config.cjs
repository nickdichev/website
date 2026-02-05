/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Helvetica Neue", ...defaultTheme.fontFamily.sans],
        righteous: ["Righteous", "Helvetica Neue", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          hover: "rgb(var(--color-surface-hover) / <alpha-value>)",
        },
        text: {
          primary: "rgb(var(--color-text-primary) / <alpha-value>)",
          secondary: "rgb(var(--color-text-secondary) / <alpha-value>)",
          heading: "rgb(var(--color-text-heading) / <alpha-value>)",
          hover: "rgb(var(--color-text-hover) / <alpha-value>)",
          inverse: "rgb(var(--color-text-inverse) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          light: "rgb(var(--color-accent-light) / <alpha-value>)",
          hover: "rgb(var(--color-accent-hover) / <alpha-value>)",
        },
        brand: "rgb(var(--color-brand) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        badge: {
          warning: "rgb(var(--color-badge-warning) / <alpha-value>)",
        },
        indicator: {
          active: "rgb(var(--color-indicator-active) / <alpha-value>)",
          DEFAULT: "rgb(var(--color-indicator-default) / <alpha-value>)",
        },
        code: {
          bg: "rgb(var(--color-code-bg) / <alpha-value>)",
          text: "rgb(var(--color-code-text) / <alpha-value>)",
          button: "rgb(var(--color-code-button) / <alpha-value>)",
          "button-hover": "rgb(var(--color-code-button-hover) / <alpha-value>)",
          "line-number": "rgb(var(--color-code-line-number) / <alpha-value>)",
        },
        tag: {
          DEFAULT: "rgb(var(--color-tag) / <alpha-value>)",
          hover: "rgb(var(--color-tag-hover) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
  future: {
    hoverOnlyWhenSupported: true,
  },
};
