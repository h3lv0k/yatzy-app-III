import { useState, useEffect, useCallback } from 'react';
import { ProfileData } from '../types/game';

interface UseProfileOptions {
  apiCall: <T>(path: string, options?: RequestInit) => Promise<T>;
}

export function useProfile({ apiCall }: UseProfileOptions) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error after 4 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall<ProfileData>('/api/profile/me');
      setProfile(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  const updateProfile = useCallback(async (displayName: string, avatarEmoji: string) => {
    setError(null);
    try {
      await apiCall<{ display_name: string; avatar_emoji: string }>('/api/profile/me', {
        method: 'PATCH',
        body: JSON.stringify({ display_name: displayName, avatar_emoji: avatarEmoji }),
      });
      // Update local profile state
      setProfile((prev) =>
        prev ? { ...prev, display_name: displayName, avatar_emoji: avatarEmoji } : prev
      );
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [apiCall]);

  return {
    profile,
    setProfile,
    loading,
    error,
    fetchProfile,
    updateProfile,
  };
}
