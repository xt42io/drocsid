import { textLinks } from "../../lib/text-links";

export function AutoLinkText({ text }: { text: string }) {
  return textLinks(text).map((part, index) =>
    part.kind === "link" ? (
      <a
        key={index}
        href={part.href}
        target="_blank"
        rel="noreferrer noopener"
      >
        {part.text}
      </a>
    ) : (
      part.text
    ),
  );
}
