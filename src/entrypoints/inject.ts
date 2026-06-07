export default defineUnlistedScript(() => {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
    this._url = url;
    return originalOpen.apply(this, [method, url, ...rest] as Parameters<typeof originalOpen>);
  };

  XMLHttpRequest.prototype.send = function (...args: unknown[]) {
    this.addEventListener('load', function () {
      try {
        const url = this._url ? this._url.toString() : '';
        if (!url.includes('view=')) return;

        window.dispatchEvent(
          new CustomEvent('IKARIAM_DATA_CAPTURED', {
            detail: {
              url,
              response: this.responseText,
            },
          }),
        );
      } catch (error) {
        console.error('Erro ao ler a resposta:', error);
      }
    });

    return originalSend.apply(this, args as Parameters<typeof originalSend>);
  };
});

declare global {
  interface XMLHttpRequest {
    _url?: string | URL;
  }
}
