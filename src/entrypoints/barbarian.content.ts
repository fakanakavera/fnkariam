import { BARBARIAN_REWARDS } from '../data/barbarianRewards';

export default defineContentScript({
  matches: ['*://*.ikariam.gameforge.com/*'],
  main() {
    let observer: MutationObserver | null = null;

    window.addEventListener('BARBARIAN_PILLAGE_OPENED', (event) => {
      const customEvent = event as CustomEvent<{ level: number }>;
      const { level } = customEvent.detail;
      const reward = BARBARIAN_REWARDS.find((item) => item.level === level);
      if (!reward) return;

      setTimeout(() => {
        const missionSummary = document.querySelector('#missionSummary');
        const newSummary = missionSummary?.querySelector('.newSummary');
        if (!missionSummary || !newSummary) return;

        missionSummary.querySelector('.ika-barbarian-injection')?.remove();

        const banner = document.createElement('div');
        banner.className = 'ika-barbarian-injection';
        Object.assign(banner.style, {
          margin: '2px 10px 6px 10px',
          padding: '4px 8px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--color-gold)',
          borderRadius: 'var(--radius)',
          color: 'var(--text-dark)',
          fontSize: '11px',
          fontFamily: 'var(--font-family)',
          textAlign: 'left',
          fontWeight: 'bold',
          boxShadow: 'var(--shadow-sm)',
          clear: 'both',
        });
        banner.innerHTML = `Esse roubo requer <span style="color: #990033;">${reward.boats}</span> barcos`;
        missionSummary.insertBefore(banner, newSummary);

        observer?.disconnect();
        observer = new MutationObserver(() => {
          if (!document.querySelector('#missionSummary')) {
            banner.remove();
            observer?.disconnect();
            observer = null;
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }, 250);
    });
  },
});
