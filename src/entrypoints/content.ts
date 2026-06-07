import { GameHandler } from '../utils/gameHandler';

export default defineContentScript({
  matches: ['*://*.ikariam.gameforge.com/*'],
  runAt: 'document_start',
  main() {
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('/inject.js');
    script.type = 'module';
    (document.head || document.documentElement).appendChild(script);

    window.addEventListener('IKARIAM_DATA_CAPTURED', (event) => {
      const customEvent = event as CustomEvent<{ url: string; response: string }>;
      const { url, response } = customEvent.detail;

      try {
        const payload = JSON.parse(response);
        GameHandler.handleServerResponse(url, payload);
      } catch (error) {
        console.error('[Content Script] Falha ao parsear JSON bruto:', error);
      }
    });

  },
});
