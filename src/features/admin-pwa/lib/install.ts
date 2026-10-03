export interface InstallPrompt extends Event {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let prompt: InstallPrompt | null = null;
const listeners = new Set<() => void>();

export const getInstallPrompt = () => prompt;
export const getServerInstallPrompt = () => null;

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearInstallPrompt() {
  prompt = null;
  for (const listener of listeners) listener();
}

export function listenForInstall() {
  const capture = (event: Event) => {
    event.preventDefault();
    prompt = event as InstallPrompt;
    for (const listener of listeners) listener();
  };
  window.addEventListener('beforeinstallprompt', capture);
  window.addEventListener('appinstalled', clearInstallPrompt);
  return () => {
    window.removeEventListener('beforeinstallprompt', capture);
    window.removeEventListener('appinstalled', clearInstallPrompt);
  };
}

export function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}
