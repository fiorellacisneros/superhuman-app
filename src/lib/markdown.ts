import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/** Allowed tags for challenge/course descriptions: bold, italic, links, lists, line breaks */
const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'a', 'ul', 'ol', 'li'];

const SANITIZE_OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
  },
};

/**
 * Converts Markdown to safe HTML for descriptions (bold, italic, links, lists).
 * Use when rendering challenge/course descriptions.
 */
export function renderMarkdown(text: string): string {
  if (!text?.trim()) return '';
  const raw = marked.parse(text.trim(), { async: false }) as string;
  return sanitizeHtml(raw, SANITIZE_OPTIONS);
}
