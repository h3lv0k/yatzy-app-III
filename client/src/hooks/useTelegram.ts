import { useEffect, useMemo } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    start_param?: string;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  themeParams: Record<string, string>;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || '';

export function useTelegram() {
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, [tg]);

  const user = useMemo(() => tg?.initDataUnsafe?.user || null, [tg]);
  const initData = useMemo(() => tg?.initData || '', [tg]);
  const startParam = useMemo(() => tg?.initDataUnsafe?.start_param || null, [tg]);

  const haptic = useMemo(() => {
    if (tg?.HapticFeedback) return tg.HapticFeedback;
    // Fallback for non-Telegram environment
    return {
      impactOccurred: () => {},
      notificationOccurred: () => {},
      selectionChanged: () => {},
    };
  }, [tg]);

  /**
   * Make an authenticated API call to the backend.
   */
  async function apiCall<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (initData) {
      headers['X-Telegram-Init-Data'] = initData;
    } else {
      // Dev mode: use mock headers
      headers['X-Mock-User-Id'] = String(user?.id || 12345);
      headers['X-Mock-User-Name'] = user?.first_name || 'Dev User';
      headers['X-Mock-Username'] = user?.username || 'devuser';
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data as T;
  }

  /**
   * Share an invite link for a lobby via Telegram's native share sheet.
   */
  function shareInviteLink(lobbyCode: string) {
    const inviteLink = `https://t.me/${BOT_USERNAME}?startapp=lobby_${lobbyCode}`;
    const text = `Давай сыграем в Yatzy! 🎲`;

    if (tg) {
      // Use Telegram's native share sheet
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
      tg.openTelegramLink(shareUrl);
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(inviteLink).catch(() => {});
    }
  }

  /**
   * Build the invite link for a lobby (for manual copying).
   */
  function getInviteLink(lobbyCode: string): string {
    return `https://t.me/${BOT_USERNAME}?startapp=lobby_${lobbyCode}`;
  }

  return {
    tg,
    user,
    initData,
    startParam,
    haptic,
    apiCall,
    isTelegram: !!tg,
    shareInviteLink,
    getInviteLink,
  };
}
