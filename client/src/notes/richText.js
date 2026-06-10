import DOMPurify from 'dompurify';

// Note bodies are stored as HTML going forward (from the rich-text editor), but
// legacy notes hold plain text. These helpers bridge both and keep rendering
// safe — every path to the DOM goes through sanitizeBodyHtml.

// Only inline formatting + paragraphs/line breaks. No attributes at all, so
// there's no href/style/on*-handler vector.
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'span'];

export function sanitizeBodyHtml(html) {
  return DOMPurify.sanitize(html ?? '', { ALLOWED_TAGS, ALLOWED_ATTR: [] });
}

// Does this body look like HTML (new editor output) vs legacy plain text?
export function isHtmlBody(s) {
  return typeof s === 'string' && /<\/?[a-z][\s\S]*>/i.test(s);
}

// Escape a plain-text body and turn newlines into <br> so it renders the same
// in an HTML context (used both for display and for seeding the editor).
export function plainTextToHtml(s) {
  if (!s) return '';
  const escaped = String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped.replace(/\r?\n/g, '<br>');
}

// Sanitized HTML for read-only display on the card / modal.
export function bodyToDisplayHtml(body) {
  if (!body) return '';
  return isHtmlBody(body) ? sanitizeBodyHtml(body) : sanitizeBodyHtml(plainTextToHtml(body));
}

// Sanitized HTML to seed the editor with (legacy text is converted first).
export function bodyToEditorHtml(body) {
  if (!body) return '';
  return isHtmlBody(body) ? sanitizeBodyHtml(body) : plainTextToHtml(body);
}

// Is the body effectively empty? TipTap emits "<p></p>" for an empty doc; we
// normalize that to "" on save so empty notes stay empty and the composer's
// "has content" check works.
export function isBodyEmpty(body) {
  if (!body) return true;
  const text = String(body)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length === 0;
}
