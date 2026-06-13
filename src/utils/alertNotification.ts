export const ALERT_DISPLAY_MS = 15_000;

const BEEP_PATTERN = [
  { frequency: 880, duration: 0.18 },
  { frequency: 660, duration: 0.18, gap: 0.12 },
  { frequency: 880, duration: 0.28, gap: 0.12 },
] as const;

function playAlertSound() {
  try {
    const audioContext = new AudioContext();
    let startAt = audioContext.currentTime;

    BEEP_PATTERN.forEach(({ frequency, duration, gap = 0 }) => {
      startAt += gap;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      gain.gain.setValueAtTime(0.35, startAt);
      gain.gain.exponentialRampToValueAtTime(0.01, startAt + duration);

      oscillator.start(startAt);
      oscillator.stop(startAt + duration);
      startAt += duration;
    });

    setTimeout(() => {
      void audioContext.close();
    }, ALERT_DISPLAY_MS);
  } catch {
    // Audio may be unavailable in some service worker contexts.
  }
}

export async function showAlertNotification(
  id: string,
  title: string,
  message: string,
  options?: { playSound?: boolean },
) {
  if (options?.playSound !== false) {
    playAlertSound();
  }

  const notificationId = await browser.notifications.create(id, {
    type: 'basic',
    iconUrl: browser.runtime.getURL('/icon-48.png'),
    title,
    message,
    requireInteraction: true,
    silent: false,
  });

  setTimeout(() => {
    browser.notifications.clear(notificationId).catch(() => {});
  }, ALERT_DISPLAY_MS);
}
