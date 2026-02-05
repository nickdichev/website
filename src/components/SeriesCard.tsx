import type { CollectionEntry } from "astro:content";
import { useState } from "preact/hooks";
import MaterialSymbolsKeyboardArrowDownRounded from "~icons/material-symbols/keyboard-arrow-down-rounded";
import MaterialSymbolsKeyboardArrowUpRounded from "~icons/material-symbols/keyboard-arrow-up-rounded";

interface Props {
  series: CollectionEntry<"series">;
  posts: CollectionEntry<"blog">[];
  order?: number;
}

export default function ({ series, posts, order }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOnClick = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div class="bg-surface rounded-lg">
      <button
        class={`p-5 rounded-lg text-left space-y-2 hover:bg-surface-hover ${
          isOpen ? "border-b-4 border-accent rounded-b-lg bg-surface-hover" : ""
        }`}
        onClick={handleOnClick}
      >
        <div class="flex items-center justify-between">
          <div class="flex items justify-center space-x-2">
            <h2 class="text-xl text-text-heading font-bold">{series.data.title}</h2>
            <span class="text-xl">{`${
              order ? ` • ${order} of ${posts.length}` : ` • ${posts.length} Parts`
            }`}</span>
          </div>
          <div class="text-text-heading">
            {isOpen ? (
              <MaterialSymbolsKeyboardArrowUpRounded style={{ fontSize: "1.5em" }} />
            ) : (
              <MaterialSymbolsKeyboardArrowDownRounded style={{ fontSize: "1.5em" }} />
            )}
          </div>
        </div>
        <p>{series.data.description}</p>
      </button>
      {isOpen && (
        <ul class="p-5 space-y-2">
          {posts.map((post, index) => (
            <li
              class={`relative pl-5 before:absolute before:left-0 before:top-3 before:h-1.5 before:w-1.5 before:rounded-full ${
                !post.data.planned && order
                  ? order == index + 1
                    ? "before:bg-indicator-active before:ring-[3px] before:ring-indicator-active/40"
                    : "before:bg-indicator"
                  : !post.data.planned
                  ? "before:bg-indicator"
                  : "before:bg-text-secondary text-text-secondary"
              }`}
            >
              <a
                href={!post.data.planned ? `/blog/${post.slug}` : undefined}
                class={`space-x-2 font-medium ${
                  !post.data.planned
                    ? "underline underline-offset-2 text-text-heading decoration-accent"
                    : "text-text-secondary"
                }`}
              >
                <span>{post.data.title}</span>
                {post.data.planned && (
                  <span class="inline-flex items-center justify-center p-0.5 px-2 bg-badge-warning rounded-full text-black text-xs">
                    Planned
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
