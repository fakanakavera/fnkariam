import { getCityNote, upsertCityNote } from '../storage/cityNotesStorage';
import { getIslandNote, upsertIslandNote } from '../storage/islandNotesStorage';
import { cityNoteKey } from '../types/cityNotes';
import { islandNoteKey } from '../types/islandNotes';

interface IslandContext {
  islandX: number;
  islandY: number;
  islandName?: string;
}

interface IslandCityContext extends IslandContext {
  position: number;
  cityId?: number;
  cityName: string;
  playerId?: string;
  playerName: string;
}

function parseIslandCoords(): { x: number; y: number } | null {
  const coordsEl = document.getElementById('js_islandBreadCoords');
  const match = coordsEl?.textContent?.match(/\[(\d+):(\d+)\]/);
  if (!match) return null;
  return { x: parseInt(match[1], 10), y: parseInt(match[2], 10) };
}

function parseIslandContext(): IslandContext | null {
  if (document.body.id !== 'island') return null;
  const coords = parseIslandCoords();
  if (!coords) return null;
  return {
    islandX: coords.x,
    islandY: coords.y,
    islandName: document.getElementById('js_islandBreadName')?.textContent?.trim(),
  };
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
  const island = parseIslandContext();
  const position = parseSelectedPosition();
  if (!island || position == null) return null;

  const selected =
    document.querySelector('.cityLocation.city.selected') ||
    document.querySelector('.cityLocationScroll.city.selected');
  if (!selected) return null;

  const cityName =
    document.getElementById('js_selectedCityName')?.textContent?.trim() ||
    selected.querySelector('[id^="js_cityLocation"][id$="TitleText"]')?.textContent?.trim() ||
    selected.querySelector('a[id^="js_cityLocation"]')?.getAttribute('title')?.trim() ||
    '';

  const ownerEl = document.getElementById('js_selectedCityOwnerName');
  const playerName =
    ownerEl?.querySelector('.avatarName')?.textContent?.trim() ||
    ownerEl?.getAttribute('title')?.trim() ||
    ownerEl?.textContent?.trim() ||
    '';
  const playerLink = ownerEl?.getAttribute('href') || '';
  const playerIdMatch = playerLink.match(/avatarId=(\d+)/);

  return {
    ...island,
    position,
    cityId: parseCityIdFromSelected(),
    cityName,
    playerId: playerIdMatch?.[1],
    playerName,
  };
}

function isIslandFeatureSelected(): boolean {
  const selected =
    document.querySelector('.cityLocation.islandfeature.selected') ||
    document.querySelector('.cityLocation.barbarianVillage.selected') ||
    document.querySelector('.cityLocationScroll.islandfeature.selected');
  return selected != null;
}

function createAccordionShell(
  className: string,
  titleText: string,
  datasetKey: string,
): {
  accordion: HTMLLIElement;
  content: HTMLDivElement;
  textarea: HTMLTextAreaElement;
  saveBtn: HTMLButtonElement;
  status: HTMLSpanElement;
  meta: HTMLDivElement;
} {
  const accordion = document.createElement('li');
  accordion.className = `accordionItem ${className}`;
  accordion.dataset.ikaNoteKey = datasetKey;

  const title = document.createElement('a');
  title.className = 'accordionTitle active';
  title.innerHTML = `${titleText} <span class="indicator"></span>`;

  const content = document.createElement('div');
  content.className = 'accordionContent';
  content.style.display = 'block';

  const meta = document.createElement('div');
  meta.style.cssText =
    'padding: 8px 10px 4px; font-size: 11px; color: #735333; line-height: 1.4;';

  const textarea = document.createElement('textarea');
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

  return { accordion, content, textarea, saveBtn, status, meta };
}

function insertAccordion(sidebar: HTMLElement, accordion: HTMLLIElement) {
  const firstAccordion = sidebar.querySelector('li.accordionItem');
  if (firstAccordion?.nextSibling) {
    sidebar.insertBefore(accordion, firstAccordion.nextSibling);
  } else {
    sidebar.appendChild(accordion);
  }
}

function removeIslandPanel() {
  document.querySelector('.ika-island-notes-accordion')?.remove();
}

function removeCityPanel() {
  document.querySelector('.ika-city-notes-accordion')?.remove();
}

async function injectIslandPanel(context: IslandContext) {
  const sidebar = document.getElementById('sidebarWidget');
  if (!sidebar) return;

  const key = islandNoteKey(context.islandX, context.islandY);
  const existing = document.querySelector('.ika-island-notes-accordion');
  if (existing?.dataset.ikaNoteKey === key) return;

  removeIslandPanel();

  const stored = await getIslandNote(context.islandX, context.islandY);
  const shell = createAccordionShell(
    'ika-island-notes-accordion',
    'Nota da Ilha — Ikariam Hub',
    key,
  );

  shell.meta.innerHTML = `
    <div><strong>Ilha:</strong> ${context.islandName || '—'} [${context.islandX}:${context.islandY}]</div>
  `;
  shell.textarea.value = stored?.note ?? '';
  shell.textarea.placeholder = 'Nota geral sobre esta ilha…';

  shell.saveBtn.addEventListener('click', async () => {
    shell.saveBtn.disabled = true;
    shell.status.textContent = '';
    try {
      await upsertIslandNote({
        islandX: context.islandX,
        islandY: context.islandY,
        islandName: context.islandName,
        note: shell.textarea.value,
      });
      shell.status.textContent = 'Salvo!';
      shell.status.style.color = '#006600';
    } catch {
      shell.status.textContent = 'Erro ao salvar';
      shell.status.style.color = '#990033';
    } finally {
      shell.saveBtn.disabled = false;
    }
  });

  insertAccordion(sidebar, shell.accordion);
}

async function injectCityPanel(context: IslandCityContext) {
  const sidebar = document.getElementById('sidebarWidget');
  if (!sidebar) return;

  const key = cityNoteKey(context.islandX, context.islandY, context.position);
  const existing = document.querySelector('.ika-city-notes-accordion');
  if (existing?.dataset.ikaNoteKey === key) return;

  removeCityPanel();

  const stored = await getCityNote(context.islandX, context.islandY, context.position);
  const shell = createAccordionShell(
    'ika-city-notes-accordion',
    'Nota da Cidade — Ikariam Hub',
    key,
  );

  shell.meta.innerHTML = `
    <div><strong>Posição:</strong> ${context.position} em [${context.islandX}:${context.islandY}]</div>
    <div><strong>Jogador:</strong> ${context.playerName || '—'}</div>
    <div><strong>Cidade:</strong> ${context.cityName || '—'}</div>
  `;
  shell.textarea.value = stored?.note ?? '';
  shell.textarea.placeholder = 'Nota sobre esta cidade…';

  shell.saveBtn.addEventListener('click', async () => {
    shell.saveBtn.disabled = true;
    shell.status.textContent = '';
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
        note: shell.textarea.value,
      });
      shell.status.textContent = 'Salvo!';
      shell.status.style.color = '#006600';
    } catch {
      shell.status.textContent = 'Erro ao salvar';
      shell.status.style.color = '#990033';
    } finally {
      shell.saveBtn.disabled = false;
    }
  });

  const islandPanel = document.querySelector('.ika-island-notes-accordion');
  if (islandPanel) {
    sidebar.insertBefore(shell.accordion, islandPanel);
  } else {
    insertAccordion(sidebar, shell.accordion);
  }
}

function refreshNotesPanels() {
  if (document.body.id !== 'island') {
    removeIslandPanel();
    removeCityPanel();
    return;
  }

  const islandContext = parseIslandContext();
  if (!islandContext) {
    removeIslandPanel();
    removeCityPanel();
    return;
  }

  void injectIslandPanel(islandContext);

  const cityContext = parseSelectedCityContext();
  const islandFeatureSelected = isIslandFeatureSelected();

  if (cityContext && !islandFeatureSelected) {
    void injectCityPanel(cityContext);
  } else {
    removeCityPanel();
  }
}

export default defineContentScript({
  matches: ['*://*.ikariam.gameforge.com/*'],
  main() {
    const observer = new MutationObserver(() => refreshNotesPanels());
    observer.observe(document.body, { childList: true, subtree: true });
    refreshNotesPanels();
  },
});
