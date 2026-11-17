import DOMPurify from 'dompurify';
import { safeUrl } from './content-store';
export function sanitizeHtml(markup) {
  return DOMPurify.sanitize(String(markup || ''), {
    ALLOWED_TAGS: ['p','div','span','section','strong','b','em','i','u','s','h2','h3','h4','ul','ol','li','blockquote','a','br','hr','table','thead','tbody','tr','th','td','code','pre','sub','sup'],
    ALLOWED_ATTR: ['href','title','target','rel','class'],
    ALLOW_DATA_ATTR: false,
  });
}
export const validatedImageUrl = (value) => {
  const safe = safeUrl(value);
  return safe && safe.startsWith('https://') ? safe : '';
};
