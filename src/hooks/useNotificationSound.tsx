import { useState, useEffect, useRef, useCallback } from 'react';

const SOUND_PERMISSION_KEY = 'soundPermissionGranted';

export const useNotificationSound = (soundUrl: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAllowedToPlay, setIsAllowedToPlay] = useState(() => {
    try {
      // Check localStorage for a previously saved permission
      return localStorage.getItem(SOUND_PERMISSION_KEY) === 'true';
    } catch (e) {
      // If localStorage is not available, default to false
      return false;
    }
  });
  const repeatingConversationsRef = useRef<Set<string | number>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isAllowedToPlayRef = useRef(isAllowedToPlay);
  useEffect(() => {
    isAllowedToPlayRef.current = isAllowedToPlay;
  }, [isAllowedToPlay]);

  useEffect(() => {
    audioRef.current = new Audio(soundUrl);
    audioRef.current.loop = false;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [soundUrl]);

  const grantPermission = useCallback(() => {
    try {
      // Save the user's choice to localStorage
      localStorage.setItem(SOUND_PERMISSION_KEY, 'true');
    } catch (e) {
      console.error("Could not save sound permission to localStorage", e);
    }
    setIsAllowedToPlay(true);
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.muted = true;
      audio.play().then(() => {
        audio.muted = false;
      }).catch(() => {});
    }
  }, []);

  const playSound = useCallback(() => {
    if (audioRef.current && isAllowedToPlayRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        console.warn("Audio play failed:", error);
      });
    }
  }, []);

  const startRepeatingSound = useCallback((conversationId: string | number) => {
    repeatingConversationsRef.current.add(conversationId);

    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        if (repeatingConversationsRef.current.size > 0) {
          playSound();
        } else {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, 30000);
    }
  }, [playSound]);

  const playNotificationSound = useCallback((conversationId: string | number) => {
    playSound();
    startRepeatingSound(conversationId);
  }, [playSound, startRepeatingSound]);

  const stopRepeatingSound = useCallback((conversationId: string | number) => {
    repeatingConversationsRef.current.delete(conversationId);
  }, []);

  return { playNotificationSound, stopRepeatingSound, isAllowedToPlay, grantPermission };
};