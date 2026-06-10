import DOMPurify from 'dompurify';

// Note bodies are stored as HTML going forward (from the rich-text editor), but
// legacy notes hold plain text. These helpers bridge both and keep rendering
// safe — every path to the DOM goes through a DOMPurify sanitize.

// Only inline formatting + paragraphs/line breaks. No attributes at all, so
// there's no href/style/on*-handler vector. This is the base set used for the
// editor seed and as the first pass before display-time linkification.
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'span'];

// The read-only display path additionally permits anchors — but only the ones
// WE generate from plain URLs (see linkifyHtml). The scheme allow-list + the
// fixed rel/target we set mean a body can never introduce a hostile link.
const DISPLAY_TAGS = [...ALLOWED_TAGS, 'a'];
const DISPLAY_ATTR = ['href', 'target', 'rel'];
const SAFE_URI = /^(?:https?|mailto):/i;

export function sanitizeBodyHtml(html) {
  return DOMPurify.sanitize(html ?? '', { ALLOWED_TAGS, ALLOWED_ATTR: [] });
}

// DOMPurify strips target/rel by default (tab-nabbing protection), so we re-add
// them via the canonical hook — this is the last word, so it survives. Anchors
// only ever appear on the display path; this hook is a no-op for the editor seed
// (whose tag set has no <a>). Registered once for the module's lifetime.
let linkHookRegistered = false;
function ensureLinkHook() {
  if (linkHookRegistered) return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });
  linkHookRegistered = true;
}

// Display sanitize: same inline formatting, plus our auto-linked anchors. The
// scheme allow-list drops anything that isn't http(s)/mailto.
function sanitizeDisplayHtml(html) {
  ensureLinkHook();
  return DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS: DISPLAY_TAGS,
    ALLOWED_ATTR: DISPLAY_ATTR,
    ALLOWED_URI_REGEXP: SAFE_URI,
  });
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

// Common public TLDs we'll auto-link as a *bare* domain (no scheme, no www.),
// e.g. "cnn.com". Kept to genuinely common ones — deliberately NOT code-ish
// suffixes (js, py, json, html, …) — so "Node.js", "config.json", and "v1.2"
// stay plain text instead of turning into links.
const BARE_TLDS =
  'com|org|net|edu|gov|mil|int|io|co|dev|app|ai|me|info|biz|tv|news|xyz|us|uk|ca|au|de|fr|jp|nl|eu|es|it|ru|ch|se|no';

// Matches, in priority order: a scheme URL (http/https), a www.-prefixed host,
// or a bare domain ending in a common TLD with an optional port/path. The
// bare-domain branch is guarded so it won't fire inside a larger token: a
// negative lookbehind keeps it off email domains ("a@cnn.com") and mid-host
// labels, and a negative lookahead after the TLD avoids "cnn.command". Trailing
// sentence punctuation is trimmed below so "see cnn.com." keeps the period out
// of the link.
const URL_RE = new RegExp(
  'https?:\\/\\/[^\\s<]+' +
    '|www\\.[^\\s<]+' +
    '|(?<![\\w@./])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:' +
    BARE_TLDS +
    ')(?![a-z0-9-])(?::\\d+)?(?:[/?#][^\\s<]*)?',
  'gi',
);
const TRAILING_PUNCT = /[.,;:!?)\]}'"]+$/;

// Walk the text nodes of already-sanitized HTML and wrap bare URLs in anchors.
// Operating on text nodes via the DOM (never string-splicing the markup) means
// existing tags/attributes can't be broken and no new markup is injected — the
// only attributes on the anchors are the safe ones we set here.
function linkifyHtml(html) {
  if (!html || typeof document === 'undefined') return html;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    // Don't re-link text that's already inside an anchor.
    if (node.parentElement && node.parentElement.closest('a')) continue;
    textNodes.push(node);
  }
  for (const node of textNodes) linkifyTextNode(node);
  return tpl.innerHTML;
}

function linkifyTextNode(node) {
  const text = node.nodeValue;
  URL_RE.lastIndex = 0;
  if (!URL_RE.test(text)) return;
  URL_RE.lastIndex = 0;

  const frag = document.createDocumentFragment();
  let last = 0;
  let m;
  while ((m = URL_RE.exec(text))) {
    const matchStart = m.index;
    const matchEnd = matchStart + m[0].length;
    let url = m[0];
    let trailing = '';
    const t = url.match(TRAILING_PUNCT);
    if (t) {
      trailing = t[0];
      url = url.slice(0, url.length - trailing.length);
    }
    if (matchStart > last) frag.appendChild(document.createTextNode(text.slice(last, matchStart)));
    const a = document.createElement('a');
    // Prefix https:// whenever the match has no scheme (covers www. and bare
    // domains). The visible link text stays exactly what the user typed.
    a.setAttribute('href', /^https?:\/\//i.test(url) ? url : `https://${url}`);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer nofollow');
    a.textContent = url;
    frag.appendChild(a);
    if (trailing) frag.appendChild(document.createTextNode(trailing));
    last = matchEnd;
  }
  if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
  node.parentNode.replaceChild(frag, node);
}

// Sanitized HTML for read-only display on the card / modal. Sanitize to the base
// inline set, auto-link bare URLs, then run a final anchor-allowing sanitize so
// every link's scheme is vetted (belt and suspenders — our linkify only ever
// emits http(s)/www anchors).
export function bodyToDisplayHtml(body) {
  if (!body) return '';
  const safe = isHtmlBody(body) ? sanitizeBodyHtml(body) : sanitizeBodyHtml(plainTextToHtml(body));
  return sanitizeDisplayHtml(linkifyHtml(safe));
}

// Sanitized HTML to seed the editor with (legacy text is converted first). The
// editor holds plain text — no anchors — so linkification is display-only.
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
