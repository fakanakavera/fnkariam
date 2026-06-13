import { getCityNote, upsertCityNote } from '../storage/cityNotesStorage';
import { cityNoteKey } from '../types/cityNotes';

interface IslandCityContext {
  islandX: number;
  islandY: number;
  position: number;
  islandName?: string;
  cityId?: number;
  cityName: string;
  playerId?: string;
  playerName: string;
  isOwnCity: boolean;
}

function parseIslandCoords(): { x: number; y: number } | null {
  const coordsEl = document.getElementById('js_islandBreadCoords');
  const match = coordsEl?.textContent?.match(/\[(\d+):(\d+)\]/);
  if (!match) return null;
  return { x: parseInt(match[1], 10), y: parseInt(match[2], 10) };
}

function parseSelectedPosition(): number | null {
  const selected =
    document.querySelector('.cityLocation.city.selected') ||
    document.querySelector('.cityLocationScroll.city.selected');
  if (!selected?.id) return null;
  const match = selected.id.match(/cityLocation(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function parseCityIdFromSelected(): number | undefined {
  const selected =
    document.querySelector('.cityLocation.city.selected') ||
    document.querySelector('.cityLocationScroll.city.selected');
  if (!selected) return undefined;

  const link = selected.querySelector('a[id^="js_cityLocation"]') as HTMLAnchorElement | null;
  const href = link?.href || selected.getAttribute('saved-href') || '';
  const cityIdMatch = href.match(/(?:destinationCityId|cityId)=(\d+)/);
  return cityIdMatch ? parseInt(cityIdMatch[1], 10) : undefined;
}

function parseSelectedCityContext(): IslandCityContext | null {
  if (document.body.id !== 'island') return null;

  const coords = parseIslandCoords();
  const position = parseSelectedPosition();
  if (!coords || position == null) return null;

  const selected =
    document.querySelector('.cityLocation.selected') ||
    document.querySelector('.cityLocationScroll.selected');
  if (!selected || selected.classList.contains('buildplace')) return null;

  const cityName = document.getElementById('js_selectedCityName')?.textContent?.trim() || '';
  const ownerEl = document.getElementById('js_selectedCityOwnerName');
  const playerName =
    ownerEl?.querySelector('.avatarName')?.textContent?.trim() ||
    ownerEl?.getAttribute('title')?.trim() ||
    ownerEl?.textContent?.trim() ||
    '';
  const playerLink = ownerEl?.getAttribute('href') || '';
  const playerIdMatch = playerLink.match(/avatarId=(\d+)/);
  const islandName = document.getElementById('js_islandBreadName')?.textContent?.trim();

  return {
    islandX: coords.x,
    islandY: coords.y,
    position,
    islandName,
    cityId: parseCityIdFromSelected(),
    cityName,
    playerId: playerIdMatch?.[1],
    playerName,
    isOwnCity: selected.classList.contains('own'),
  };
}

function removeNotesPanel() {
  document.querySelector('.ika-city-notes-accordion')?.remove();
}

async function injectNotesPanel(context: IslandCityContext) {
  const sidebar = document.getElementById('sidebarWidget');
  if (!sidebar) return;

  removeNotesPanel();

  const key = cityNoteKey(context.islandX, context.islandY, context.position);
  const stored = await getCityNote(context.islandX, context.islandY, context.position);

  const accordion = document.createElement('li');
  accordion.className = 'accordionItem ika-city-notes-accordion';

  const title = document.createElement('a');
  title.className = 'accordionTitle active';
  title.innerHTML = 'Nota — Ikariam Hub <span class="indicator"></span>';

  const content = document.createElement('div');
  content.className = 'accordionContent';
  content.style.display = 'block';

  const meta = document.createElement('div');
  meta.style.cssText =
    'padding: 8px 10px 4px; font-size: 11px; color: #735333; line-height: 1.4;';
  meta.innerHTML = `
    <div><strong>Posição:</strong> ${context.position} em [${context.islandX}:${context.islandY}]</div>
    <div><strong>Jogador:</strong> ${context.playerName || '—'}</div>
    <div><strong>Cidade:</strong> ${context.cityName || '—'}</div>
  `;

  const textarea = document.createElement('textarea');
  textarea.value = stored?.note ?? '';
  textarea.placeholder = 'Escreva uma nota sobre esta cidade…';
  textarea.style.cssText =
    'width: calc(100% - 20px); margin: 4px 10px; min-height: 72px; resize: vertical; font-size: 12px; padding: 6px; box-sizing: border-box;';

  const actions = document.createElement('div');
  actions.style.cssText = 'padding: 4px 10px 10px; display: flex; gap: 8px; align-items: center;';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.textContent = 'Salvar';
  saveBtn.style.cssText =
    'padding: 4px 12px; font-size: 12px; font-weight: bold; cursor: pointer; background: #735333; color: #fff; border: none; border-radius: 3px;';

  const status = document.createElement('span');
  status.style.cssText = 'font-size: 11px; color: #006600;';

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    status.textContent = '';
    try {
      await upsertCityNote({
        islandX: context.islandX,
        islandY: context.islandY,
        position: context.position,
        islandName: context.islandName,
        cityId: context.cityId,
        cityName: context.cityName,
        playerId: context.playerId,
        playerName: context.playerName,
        note: textarea.value,
      });
      status.textContent = 'Salvo!';
      status.style.color = '#006600';
    } catch {
      status.textContent = 'Erro ao salvar';
      status.style.color = '#990033';
    } finally {
      saveBtn.disabled = false;
    }
  });

  actions.appendChild(saveBtn);
  actions.appendChild(status);

  content.appendChild(meta);
  content.appendChild(textarea);
  content.appendChild(actions);

  accordion.appendChild(title);
  accordion.appendChild(content);

  title.addEventListener('click', (event) => {
    event.preventDefault();
    if (title.classList.contains('active')) {
      title.classList.remove('active');
      content.style.display = 'none';
    } else {
      title.classList.add('active');
      content.style.display = 'block';
    }
  });

  const infoAccordion = sidebar.querySelector('li.accordionItem');
  if (infoAccordion?.nextSibling) {
    sidebar.insertBefore(accordion, infoAccordion.nextSibling);
  } else {
    sidebar.appendChild(accordion);
  }

  accordion.dataset.ikaCityKey = key;
}

function refreshNotesPanel() {
  const context = parseSelectedCityContext();
  if (!context || context.isOwnCity) {
    removeNotesPanel();
    return;
  }

  const key = cityNoteKey(context.islandX, context.islandY, context.position);
  const existing = document.querySelector('.ika-city-notes-accordion');
  if (existing?.dataset.ikaCityKey === key) return;

  void injectNotesPanel(context);
}

export default defineContentScript({
  matches: ['*://*.ikariam.gameforge.com/*'],
  main() {
    const observer = new MutationObserver(() => {
      if (document.body.id !== 'island') {
        removeNotesPanel();
        return;
      }
      refreshNotesPanel();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    refreshNotesPanel();
  },
});
