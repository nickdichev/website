import { visit } from "unist-util-visit";

/**
 * Rehype plugin that converts `# (my-id)` or `// (my-id)` comment patterns
 * in code blocks into clickable markers that link to sidenotes.
 *
 * Finds <code> elements inside rehype-pretty-code figures, then processes
 * each direct child span (line) looking for the annotation pattern.
 */
export function rehypeCodeAsides() {
  return (tree) => {
    let codeMarkerCount = 0;

    visit(tree, "element", (node) => {
      // Find <code> elements (inside <pre> from rehype-pretty-code)
      if (node.tagName !== "code") return;
      if (!node.children || node.children.length === 0) return;

      // Each direct child should be a line <span>
      for (const line of node.children) {
        if (line.type !== "element" || line.tagName !== "span") continue;
        if (!line.children) continue;

        // Collect full text of this line
        const fullText = getTextContent(line);

        // Match `# (some-id)` or `// (some-id)` at end of line
        const match = fullText.match(/(#|\/\/)\s*\(([a-zA-Z0-9_-]+)\)\s*$/);
        if (!match) continue;

        const asideId = match[2];
        const patternStart = fullText.lastIndexOf(match[0]);

        codeMarkerCount++;

        // Walk children and strip everything from patternStart onward
        const newChildren = [];
        let pos = 0;

        for (const child of line.children) {
          const childText = getTextContent(child);
          const childLen = childText.length;
          const childEnd = pos + childLen;

          if (childEnd <= patternStart) {
            // Entirely before pattern — keep
            newChildren.push(child);
          } else if (pos >= patternStart) {
            // Entirely within pattern — drop
          } else {
            // Straddles the boundary — trim
            const keep = patternStart - pos;
            if (child.type === "text") {
              newChildren.push({
                type: "text",
                value: child.value.slice(0, keep),
              });
            } else if (child.type === "element") {
              const trimmed = trimElement(child, keep);
              if (trimmed) newChildren.push(trimmed);
            }
          }

          pos = childEnd;
        }

        // Append clickable marker
        newChildren.push({
          type: "element",
          tagName: "span",
          properties: {
            className: ["code-aside-marker"],
            dataAsideTarget: asideId,
            role: "button",
            tabIndex: 0,
            ariaLabel: "Go to sidenote",
          },
          children: [
            { type: "text", value: `(${codeMarkerCount})` },
          ],
        });

        line.children = newChildren;
      }
    });
  };
}

function getTextContent(node) {
  if (node.type === "text") return node.value;
  if (node.children) return node.children.map(getTextContent).join("");
  return "";
}

function trimElement(element, maxLen) {
  if (maxLen <= 0) return null;

  const clone = {
    type: element.type,
    tagName: element.tagName,
    properties: { ...element.properties },
    children: [],
  };
  let remaining = maxLen;

  for (const child of element.children || []) {
    if (remaining <= 0) break;

    if (child.type === "text") {
      if (child.value.length <= remaining) {
        clone.children.push(child);
        remaining -= child.value.length;
      } else {
        clone.children.push({
          type: "text",
          value: child.value.slice(0, remaining),
        });
        remaining = 0;
      }
    } else if (child.type === "element") {
      const childLen = getTextContent(child).length;
      if (childLen <= remaining) {
        clone.children.push(child);
        remaining -= childLen;
      } else {
        const trimmed = trimElement(child, remaining);
        if (trimmed) clone.children.push(trimmed);
        remaining = 0;
      }
    }
  }

  return clone.children.length > 0 ? clone : null;
}
