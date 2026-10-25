/**
 * Safe clipboard copy utility with fallback for iframes and unfocused documents
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Try navigator.clipboard if available
  if (navigator?.clipboard?.writeText) {
    try {
      if (document && typeof document.hasFocus === 'function' && !document.hasFocus()) {
        window.focus();
      }
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to textarea execCommand fallback
    }
  }

  // 2. Fallback using temporary textarea element (works in iframes & without strict clipboard focus permissions)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return !!successful;
  } catch {
    return false;
  }
}
