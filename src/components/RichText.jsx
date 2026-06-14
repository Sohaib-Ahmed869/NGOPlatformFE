import DOMPurify from "dompurify";

const SANITIZE = {
  ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "h2", "h3", "blockquote", "span"],
  ALLOWED_ATTR: ["href", "target", "rel"],
};

/**
 * Render CMS rich-text / textarea content safely. Handles BOTH the rich
 * editor's HTML and legacy plain text (line breaks preserved), so it's a
 * drop-in replacement for plain `{value}` renders that never shows raw tags.
 */
export function RichText({ html, className = "", as: Tag = "div" }) {
  if (!html) return null;
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(html);
  if (!looksLikeHtml) {
    return (
      <Tag className={className} style={{ whiteSpace: "pre-line" }}>
        {html}
      </Tag>
    );
  }
  return (
    <Tag
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, SANITIZE) }}
    />
  );
}

export default RichText;
