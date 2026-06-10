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
