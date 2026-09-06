/**
 * INSA KMS Enterprise HTML Sanitization Utility
 * Strips dangerous tags, event handlers, and executable script vectors
 * to defend against Stored and Reflected Cross-Site Scripting (XSS).
 */

const ALLOWED_TAGS = new Set([
  'strong', 'b', 'em', 'i', 'del', 's', 'u', 'code', 'pre',
  'p', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'video', 'source', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'br', 'hr'
]);

const ALLOWED_ATTRS = new Set([
  'class', 'src', 'controls', 'type', 'width', 'height', 'title'
]);

/**
 * Strips all dangerous HTML tags and event handlers.
 * Safe for both Server-Side Pre-rendering and Browser Execution.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';

  let sanitized = dirty;

  // 1. Strip script, iframe, object, embed, frame, applet tags and their contents
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/<link\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // 2. Filter remaining tags and attributes
  sanitized = sanitized.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tagName, rawAttrs) => {
    const lowerTag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(lowerTag)) {
      return ''; // Strip disallowed tag entirely
    }

    // Closing tag: clean and return
    if (match.startsWith('</')) {
      return `</${lowerTag}>`;
    }

    // Opening or self-closing tag: parse and whitelist attributes
    const cleanAttrs: string[] = [];
    if (rawAttrs) {
      // Match attr="val" or attr='val' or attr=val
      const attrRegex = /([a-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        const attrVal = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

        // Disallow any attribute starting with 'on' (e.g. onerror, onload, onclick)
        if (attrName.startsWith('on')) {
          continue;
        }

        if (ALLOWED_ATTRS.has(attrName)) {
          // If src attribute, disallow javascript: or data: schemes
          if (attrName === 'src') {
            const cleanVal = attrVal.trim().toLowerCase();
            if (cleanVal.startsWith('javascript:') || cleanVal.startsWith('data:text') || cleanVal.startsWith('vbscript:')) {
              continue;
            }
          }
          cleanAttrs.push(`${attrName}="${escapeHtmlAttr(attrVal)}"`);
        }
      }
    }

    const isSelfClosing = match.endsWith('/>');
    return cleanAttrs.length > 0
      ? `<${lowerTag} ${cleanAttrs.join(' ')}${isSelfClosing ? ' />' : '>'}`
      : `<${lowerTag}${isSelfClosing ? ' />' : '>'}`;
  });

  return sanitized;
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
