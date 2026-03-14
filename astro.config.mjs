import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import rehypePrettyCode from "rehype-pretty-code";
import remarkReadingTime from "./src/plugins/remark-reading-time.mjs";
import preact from "@astrojs/preact";
import Icons from "unplugin-icons/vite";
import { SITE_URL } from "./src/consts";

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [mdx(), sitemap(), tailwind(), preact()],
  markdown: {
    extendDefaultPlugins: true,
    syntaxHighlight: false,
    rehypePlugins: [
      [
        rehypePrettyCode,
        {
          transformers: [
            {
              name: "aside-reset",
              pre(node) {
                if (this.options.meta?.__raw?.includes("aside-reset")) {
                  node.properties["data-aside-reset"] = "";
                }
              },
            },
          ],
        },
      ],
    ],
    remarkPlugins: [remarkReadingTime],
  },
  vite: {
    plugins: [
      Icons({
        compiler: "jsx",
        jsx: "preact",
        autoInstall: true,
      }),
    ],
  },
});
