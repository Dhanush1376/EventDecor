import sanitizeHtml from 'sanitize-html';

const defaultOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    'b',
    'i',
    'em',
    'strong',
    'a',
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'br',
    'span',
    'div',
    'blockquote',
    'code',
    'pre',
    'hr',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    '*': ['style', 'class', 'id'],
  },
  allowedIframeHostnames: ['www.youtube.com', 'player.vimeo.com'],
  textFilter: (text) =>
    text
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>'),
};

export const sanitizeString = (str: string, options?: sanitizeHtml.IOptions): string => {
  if (!str) return str;
  return sanitizeHtml(str, options || defaultOptions);
};

export const xssSanitize = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Skip base64 data URIs as they are huge and not HTML, causing memory exhaustion
    if (obj.startsWith('data:image/')) {
      return obj;
    }
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => xssSanitize(item));
  }

  if (typeof obj === 'object') {
    // If it's a buffer or date, return as is
    if (Buffer.isBuffer(obj) || obj instanceof Date) {
      return obj;
    }

    const sanitizedObj: any = {};
    for (const key of Object.keys(obj)) {
      sanitizedObj[key] = xssSanitize(obj[key]);
    }
    return sanitizedObj;
  }

  return obj;
};
