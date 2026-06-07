const TRADEGOOD_TO_RESOURCE: Record<number, string> = {
  1: 'wine',
  2: 'marble',
  3: 'crystal',
  4: 'sulfur',
};

export default defineContentScript({
  matches: ['*://*.ikariam.gameforge.com/*'],
  main() {
    let observer: MutationObserver | null = null;

    window.addEventListener('IKARIAM_BUILDING_OPENED', (event) => {
      const customEvent = event as CustomEvent<{
        currentResources: Record<string, number>;
        woodProduction: number;
        producedTradegood: number;
        tradegoodProduction: number;
      }>;

      const { currentResources, woodProduction, producedTradegood, tradegoodProduction } =
        customEvent.detail;

      setTimeout(() => {
        const sidebar = document.getElementById('sidebarWidget');
        const buildingUpgrade = document.getElementById('buildingUpgrade');
        if (!sidebar || !buildingUpgrade) return;

        sidebar.querySelector('.ika-missing-accordion')?.remove();

        const resourceClasses = {
          wood: 'wood',
          wine: 'wine',
          marble: 'marble',
          crystal: 'crystal',
          sulfur: 'sulfur',
        };

        const onlyOneAccordion = sidebar.querySelectorAll('li.accordionItem').length === 1;
        const resourceItems = buildingUpgrade.querySelectorAll('ul.resources li:not(.time)');
        const rows: Array<{ type: string; text: string; color: string; infoText: string }> = [];

        resourceItems.forEach((item) => {
          const type =
            Array.from(item.classList).find((className) => className in resourceClasses) || '';
          if (!type) return;

          const hint = item.querySelector('.accesshint')?.textContent || '';
          const raw = item.textContent?.replace(hint, '').replace(/\./g, '').trim() || '0';
          const required = parseInt(raw, 10);
          const available = currentResources[type] || 0;

          let production = 0;
          if (type === 'wood') production = woodProduction;
          else if (type === TRADEGOOD_TO_RESOURCE[producedTradegood]) production = tradegoodProduction;

          if (available < required) {
            const missing = required - available;
            const infoText = production > 0 ? `${(missing / production).toFixed(1)}h de produção` : 'Sem produção';
            rows.push({ type, text: `-${missing.toLocaleString('de-DE')}`, color: '#990033', infoText });
          } else {
            const surplus = available - required;
            rows.push({ type, text: `+${surplus.toLocaleString('de-DE')}`, color: '#00802b', infoText: 'Suficiente' });
          }
        });

        if (rows.length === 0) return;

        const accordion = document.createElement('li');
        accordion.className = 'accordionItem ika-missing-accordion';

        const title = document.createElement('a');
        title.className = `accordionTitle ${onlyOneAccordion ? 'active' : ''}`;
        title.innerHTML = 'Balanço para Melhorar <span class="indicator"></span>';

        const content = document.createElement('div');
        content.className = 'accordionContent';
        content.style.display = onlyOneAccordion ? 'block' : 'none';

        let html = '<ul class="resources" style="padding: 8px 10px; margin: 0;">';
        rows.forEach((row) => {
          html += `
            <li class="${row.type}" style="display: flex; justify-content: space-between; align-items: center; float: none; width: auto; margin-bottom: 4px;">
              <span style="font-weight: bold; color: ${row.color};">${row.text}</span>
              <span style="color: var(--text-muted); font-size: 11px; font-weight: normal;">${row.infoText}</span>
            </li>
          `;
        });
        html += '</ul>';
        content.innerHTML = html;

        accordion.appendChild(title);
        accordion.appendChild(content);

        title.addEventListener('click', (clickEvent) => {
          clickEvent.preventDefault();
          if (title.classList.contains('active')) {
            title.classList.remove('active');
            content.style.display = 'none';
          } else {
            title.classList.add('active');
            content.style.display = 'block';
          }
        });

        const firstAccordion = sidebar.querySelector('li.accordionItem');
        if (firstAccordion) sidebar.insertBefore(accordion, firstAccordion.nextSibling);
        else sidebar.appendChild(accordion);

        observer?.disconnect();
        observer = new MutationObserver(() => {
          if (!document.getElementById('buildingUpgrade')) {
            sidebar.querySelector('.ika-missing-accordion')?.remove();
            observer?.disconnect();
            observer = null;
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }, 250);
    });
  },
});
