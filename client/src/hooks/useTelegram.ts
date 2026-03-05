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

  return {
    tg,
    user,
    initData,
    startParam,
    haptic,
    apiCall,
    isTelegram: !!tg,
  };
}
