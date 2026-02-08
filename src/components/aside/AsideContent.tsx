import { useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";

interface AsideContentProps {
  children: ComponentChildren;
  asideId?: string;
}

export default function AsideContent({
  children,
  asideId,
}: AsideContentProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [computedNumber, setComputedNumber] = useState<number | null>(null);

  const isCodeLinked = !!asideId;

  const handleMarkerClick = () => {
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) {
      // On desktop, scroll to and highlight the aside content
      const content = containerRef.current?.querySelector("[data-aside-content]") as HTMLElement;
      if (!content) return;
      content.scrollIntoView({ behavior: "smooth", block: "center" });
      content.classList.add("aside-highlighted");
      setTimeout(() => content.classList.remove("aside-highlighted"), 1500);
    } else {
      // On mobile, toggle inline expand
      setExpanded(!expanded);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const article = container.closest("article");
    if (!article) return;

    if (isCodeLinked) {
      // Read number from the corresponding code marker created by transformCodeMarkers()
      const marker = article.querySelector(
        `.code-aside-marker[data-aside-target="${asideId}"]`
      );
      if (marker) {
        const markerText = marker.textContent || "";
        const num = parseInt(markerText.replace(/[()]/g, ""), 10);
        if (!isNaN(num)) {
          setComputedNumber(num);
        }
      }
    } else {
      // Inline asides numbered only among other inline asides
      const inlineAsides = article.querySelectorAll(
        ".aside-container:not(.aside-code-linked)"
      );
      const index = Array.from(inlineAsides).indexOf(container);
      if (index !== -1) {
        setComputedNumber(index + 1);
      }
    }
  }, []);

  return (
    <span
      ref={containerRef}
      class={`aside-container ${isCodeLinked ? "aside-code-linked" : ""}`}
      role="note"
      data-aside-id={asideId}
      data-aside-number={computedNumber}
    >
      {!isCodeLinked && (
        <span class="aside-marker-wrapper">
          <button
            type="button"
            class="aside-marker"
            onClick={handleMarkerClick}
            aria-expanded={expanded}
            aria-label={`Sidenote ${computedNumber}`}
          >
            <span class="aside-marker-number">{computedNumber}</span>
          </button>
        </span>
      )}

      <span
        class={`aside-content ${expanded ? "aside-content-expanded" : ""} ${isCodeLinked ? "aside-content-code-linked" : ""}`}
        data-aside-content
      >
        <span class="aside-content-inner">
          <span class="aside-content-number">{computedNumber}.</span>
          {children}
        </span>
      </span>
    </span>
  );
}
