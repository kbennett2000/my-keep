import { describe, test, expect } from 'vitest';
import {
  sanitizeBodyHtml,
  isHtmlBody,
  plainTextToHtml,
  bodyToDisplayHtml,
  bodyToEditorHtml,
  isBodyEmpty,
} from './richText.js';

describe('sanitizeBodyHtml', () => {
  test('keeps the allowed inline formatting tags', () => {
    const out = sanitizeBodyHtml('<p><strong>a</strong> <em>b</em> <u>c</u> <s>d</s></p>');
    expect(out).toContain('<strong>');
    expect(out).toContain('<em>');
    expect(out).toContain('<u>');
    expect(out).toContain('<s>');
  });

  test('strips <script>', () => {
    const out = sanitizeBodyHtml('<p>hi</p><script>alert(1)</script>');
    expect(out).not.toMatch(/<script/i);
    expect(out).toContain('hi');
  });

  test('strips event handlers and <img>', () => {
    const out = sanitizeBodyHtml('<img src=x onerror="alert(1)">');
    expect(out).not.toMatch(/onerror/i);
    expect(out).not.toMatch(/<img/i);
  });

  test('drops all attributes (no style/href)', () => {
    const out = sanitizeBodyHtml('<span style="color:red">x</span>');
    expect(out).not.toMatch(/style/i);
    expect(out).toContain('x');
  });
});

describe('isHtmlBody', () => {
  test('detects HTML', () => {
    expect(isHtmlBody('<p>x</p>')).toBe(true);
  });
  test('plain text (incl. a stray "<") is not HTML', () => {
    expect(isHtmlBody('hello world')).toBe(false);
    expect(isHtmlBody('a < b')).toBe(false);
  });
});

describe('plainTextToHtml', () => {
  test('escapes entities and turns newlines into <br>', () => {
    expect(plainTextToHtml('a < b & c\nx')).toBe('a &lt; b &amp; c<br>x');
  });
});

describe('bodyToDisplayHtml / bodyToEditorHtml', () => {
  test('legacy text gets line breaks and is safe', () => {
    expect(bodyToDisplayHtml('a\nb')).toContain('<br>');
  });
  test('HTML body is sanitized for display', () => {
    expect(bodyToDisplayHtml('<p>ok</p><script>bad</script>')).not.toMatch(/<script/i);
  });
  test('editor seed converts legacy text but sanitizes HTML', () => {
    expect(bodyToEditorHtml('x\ny')).toBe('x<br>y');
    expect(bodyToEditorHtml('<p>x</p><script>bad</script>')).not.toMatch(/<script/i);
  });
});

describe('bodyToDisplayHtml — auto-linkify', () => {
  test('wraps a typed https URL in a safe new-tab anchor', () => {
    const out = bodyToDisplayHtml('<p>see https://example.com now</p>');
    expect(out).toMatch(/<a [^>]*href="https:\/\/example\.com"/);
    expect(out).toMatch(/target="_blank"/);
    expect(out).toMatch(/rel="[^"]*noopener[^"]*"/);
    expect(out).toContain('>https://example.com<');
  });

  test('links a www. URL by prefixing https://', () => {
    const out = bodyToDisplayHtml('<p>www.example.com</p>');
    expect(out).toMatch(/href="https:\/\/www\.example\.com"/);
    expect(out).toContain('>www.example.com<'); // visible text keeps the www. form
  });

  test('keeps trailing sentence punctuation out of the link', () => {
    const out = bodyToDisplayHtml('<p>visit https://example.com.</p>');
    expect(out).toMatch(/href="https:\/\/example\.com"/);
    expect(out).not.toMatch(/href="https:\/\/example\.com\."/);
    expect(out).toContain('.</p>');
  });

  test('a javascript: scheme in text is NOT turned into a clickable link', () => {
    const out = bodyToDisplayHtml('<p>javascript:alert(1)</p>');
    expect(out).not.toMatch(/<a\b/i);
  });

  test('wraps a URL exactly once and preserves other formatting', () => {
    const out = bodyToDisplayHtml('<p><strong>b</strong> http://a.test x</p>');
    expect(out).toContain('<strong>b</strong>');
    expect((out.match(/<a\b/gi) || []).length).toBe(1);
  });

  test('still strips <script> on the display path', () => {
    const out = bodyToDisplayHtml('<p>http://a.test</p><script>bad</script>');
    expect(out).not.toMatch(/<script/i);
    expect(out).toMatch(/<a\b/i);
  });

  test('links a bare domain (no scheme, no www.) and prefixes https://', () => {
    const out = bodyToDisplayHtml('<p>cnn.com</p>');
    expect(out).toMatch(/href="https:\/\/cnn\.com"/);
    expect(out).toContain('>cnn.com<'); // visible text stays as typed
  });

  test('links a bare subdomain with a path', () => {
    const out = bodyToDisplayHtml('<p>foo.cnn.com/world</p>');
    expect(out).toMatch(/href="https:\/\/foo\.cnn\.com\/world"/);
  });

  test('links a scheme URL and a bare domain in the same text (the reported case)', () => {
    const out = bodyToDisplayHtml('<p>https://www.foxnews.com and cnn.com</p>');
    expect((out.match(/<a\b/gi) || []).length).toBe(2);
    expect(out).toMatch(/href="https:\/\/www\.foxnews\.com"/);
    expect(out).toMatch(/href="https:\/\/cnn\.com"/);
  });

  test('does NOT link code-ish dotted tokens', () => {
    for (const token of ['Node.js', 'config.json', 'index.html', 'v1.2', '3.14']) {
      const out = bodyToDisplayHtml(`<p>${token}</p>`);
      expect(out, token).not.toMatch(/<a\b/i);
    }
  });

  test('does NOT turn an email address into a link', () => {
    const out = bodyToDisplayHtml('<p>email me at hi@cnn.com please</p>');
    expect(out).not.toMatch(/<a\b/i);
  });
});

describe('isBodyEmpty', () => {
  test('empty forms', () => {
    expect(isBodyEmpty('')).toBe(true);
    expect(isBodyEmpty('<p></p>')).toBe(true);
    expect(isBodyEmpty('<p><br></p>')).toBe(true);
    expect(isBodyEmpty('   ')).toBe(true);
  });
  test('non-empty', () => {
    expect(isBodyEmpty('<p>hi</p>')).toBe(false);
    expect(isBodyEmpty('text')).toBe(false);
  });
});
