import { getCityNote, loadCityNotes, upsertCityNote } from '../storage/cityNotesStorage';
import { getIslandNote, upsertIslandNote } from '../storage/islandNotesStorage';
import { cityNoteKey, CITY_NOTES_STORAGE_KEY, type CityNote } from '../types/cityNotes';
import { islandNoteKey } from '../types/islandNotes';
import {
  hasUnsecuredResources,
  parseUnsecuredFromNote,
  totalUnsecuredResources,
} from '../utils/enemyUnsecuredResources';

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

function parseCityIdFromElement(element: Element): number | undefined {
  const link = element.querySelector('a[id^="js_cityLocation"]') as HTMLAnchorElement | null;
  const href = link?.href || element.getAttribute('saved-href') || '';
  const cityIdMatch = href.match(/(?:destinationCityId|cityId)=(\d+)/);
  return cityIdMatch ? parseInt(cityIdMatch[1], 10) : undefined;
}

function parsePositionFromElement(element: Element): number | undefined {
  const match = element.id.match(/cityLocation(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

function noteHasLoot(note: CityNote): boolean {
  if (note.unsecuredResources && hasUnsecuredResources(note.unsecuredResources)) return true;
  return hasUnsecuredResources(parseUnsecuredFromNote(note.note));
}

function formatLootBadge(note: CityNote): string {
  const unsecured = note.unsecuredResources || parseUnsecuredFromNote(note.note);
  const total = totalUnsecuredResources(unsecured);
  if (total >= 1_000_000) return `${Math.round(total / 1_000_000)}M`;
  if (total >= 1_000) return `${Math.round(total / 1_000)}k`;
  return String(total);
}

function removeLootMarks() {
  document.querySelectorAll('.ika-loot-mark').forEach((el) => el.remove());
}

function applyLootMarks(notes: CityNote[], islandX: number, islandY: number) {
  removeLootMarks();

  const lootNotes = notes.filter(
    (note) => note.islandX === islandX && note.islandY === islandY && noteHasLoot(note),
  );
  if (lootNotes.length === 0) return;

  const cityLocations = document.querySelectorAll('.cityLocation.city, .cityLocationScroll.city');
  cityLocations.forEach((element) => {
    const cityId = parseCityIdFromElement(element);
    const position = parsePositionFromElement(element);

    const note =
      (cityId ? lootNotes.find((entry) => entry.cityId === cityId) : undefined) ||
      (position != null
        ? lootNotes.find((entry) => entry.position === position)
        : undefined);

    if (!note) return;

    const badge = document.createElement('div');
    badge.className = 'ika-loot-mark';
    badge.title = 'Recursos inseguros disponíveis para pilhagem';
    badge.textContent = `💰 ${formatLootBadge(note)}`;
    badge.style.cssText =
      'position:absolute; top:-4px; right:-6px; z-index:30; background:#8b0000; color:#fff; border:1px solid #ffd700; border-radius:10px; padding:1px 5px; font-size:10px; font-weight:bold; line-height:1.2; pointer-events:none; white-space:nowrap; box-shadow:0 1px 3px rgba(0,0,0,0.35);';

    const host = element as HTMLElement;
    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative';
    }
    host.appendChild(badge);
  });
}

async function refreshLootMarks(islandX: number, islandY: number) {
  const store = await loadCityNotes();
  applyLootMarks(Object.values(store), islandX, islandY);
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

function findActionsAccordion(sidebar: HTMLElement): HTMLLIElement | null {
  for (const item of sidebar.querySelectorAll('li.accordionItem')) {
    if (item.querySelector('.cityactions')) return item;
  }
  return null;
}

function insertAfterActions(sidebar: HTMLElement, accordion: HTMLLIElement) {
  const actionsItem = findActionsAccordion(sidebar);
  if (actionsItem) {
    actionsItem.insertAdjacentElement('afterend', accordion);
    return;
  }
  sidebar.appendChild(accordion);
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
  title.className = 'accordionTitle';
  title.innerHTML = `${titleText} <span class="indicator"></span>`;

  const content = document.createElement('div');
  content.className = 'accordionContent';
  content.style.display = 'none';

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

function removeAllNotePanels() {
  document
    .querySelectorAll('.ika-island-notes-accordion, .ika-city-notes-accordion')
    .forEach((el) => el.remove());
}

async function injectIslandPanel(sidebar: HTMLElement, context: IslandContext) {
  const stored = await getIslandNote(context.islandX, context.islandY);
  const key = islandNoteKey(context.islandX, context.islandY);
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

  insertAfterActions(sidebar, shell.accordion);
}

async function injectCityPanel(sidebar: HTMLElement, context: IslandCityContext) {
  const stored = await getCityNote(context.islandX, context.islandY, context.position);
  const key = cityNoteKey(context.islandX, context.islandY, context.position);
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

  const islandPanel = sidebar.querySelector('.ika-island-notes-accordion');
  if (islandPanel) {
    sidebar.insertBefore(shell.accordion, islandPanel);
  } else {
    insertAfterActions(sidebar, shell.accordion);
  }
}

let refreshToken = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastInjectedContextKey = '';

function getNotesContextKey(): string {
  if (document.body.id !== 'island') return '';
  const island = parseIslandContext();
  if (!island) return '';
  const city = parseSelectedCityContext();
  const islandFeature = isIslandFeatureSelected();
  const islandKey = islandNoteKey(island.islandX, island.islandY);
  const cityKey =
    city && !islandFeature
      ? cityNoteKey(city.islandX, city.islandY, city.position)
      : '';
  return `${islandKey}|${cityKey}`;
}

function panelsMatchContext(sidebar: HTMLElement, showCityPanel: boolean): boolean {
  if (!sidebar.querySelector('.ika-island-notes-accordion')) return false;
  const hasCityPanel = sidebar.querySelector('.ika-city-notes-accordion') != null;
  return showCityPanel ? hasCityPanel : !hasCityPanel;
}

function shouldRefreshPanels(): boolean {
  const contextKey = getNotesContextKey();
  if (!contextKey) return true;

  const sidebar = document.getElementById('sidebarWidget');
  if (!sidebar) return false;

  const cityContext = parseSelectedCityContext();
  const islandFeatureSelected = isIslandFeatureSelected();
  const showCityPanel = Boolean(cityContext && !islandFeatureSelected);

  if (contextKey !== lastInjectedContextKey) return true;
  return !panelsMatchContext(sidebar, showCityPanel);
}

function isOurPanelMutation(mutations: MutationRecord[]): boolean {
  for (const mutation of mutations) {
    const el = mutation.target as Element;
    if (!el || typeof el.closest !== 'function') continue;
    if (el.closest('.ika-island-notes-accordion, .ika-city-notes-accordion')) return true;
  }
  return false;
}

async function refreshNotesPanels() {
  const token = ++refreshToken;

  if (document.body.id !== 'island') {
    removeAllNotePanels();
    removeLootMarks();
    lastInjectedContextKey = '';
    return;
  }

  const islandContext = parseIslandContext();
  if (!islandContext) {
    removeAllNotePanels();
    lastInjectedContextKey = '';
    return;
  }

  const sidebar = document.getElementById('sidebarWidget');
  if (!sidebar) return;

  const cityContext = parseSelectedCityContext();
  const islandFeatureSelected = isIslandFeatureSelected();
  const showCityPanel = cityContext && !islandFeatureSelected;

  removeAllNotePanels();

  if (token !== refreshToken) return;

  await injectIslandPanel(sidebar, islandContext);
  if (token !== refreshToken) {
    removeAllNotePanels();
    return;
  }

  if (showCityPanel) {
    await injectCityPanel(sidebar, cityContext!);
    if (token !== refreshToken) {
      removeAllNotePanels();
      return;
    }
  }

  lastInjectedContextKey = getNotesContextKey();
  await refreshLootMarks(islandContext.islandX, islandContext.islandY);
}

function scheduleRefresh() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (shouldRefreshPanels()) void refreshNotesPanels();
  }, 80);
}

export default defineContentScript({
  matches: ['*://*.ikariam.gameforge.com/*'],
  main() {
    const observer = new MutationObserver((mutations) => {
      if (isOurPanelMutation(mutations)) return;
      scheduleRefresh();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes[CITY_NOTES_STORAGE_KEY]) return;
      const island = parseIslandContext();
      if (!island) return;
      void refreshLootMarks(island.islandX, island.islandY);
    });

    scheduleRefresh();
  },
});
