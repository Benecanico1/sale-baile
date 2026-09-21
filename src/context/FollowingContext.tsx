import React, { createContext, useContext, useState } from 'react';

const STORAGE_FOLLOWING_KEY = 'sale_baile_following_organizers_v1';

interface FollowingContextType {
  following: string[];
  isFollowing: (organizerName: string) => boolean;
  toggleFollow: (organizerName: string) => void;
  followOrganizer: (organizerName: string) => void;
  unfollowOrganizer: (organizerName: string) => void;
  followingCount: number;
}

const FollowingContext = createContext<FollowingContextType | undefined>(undefined);

export function getLocalFollowing(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_FOLLOWING_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading following from localStorage', e);
  }
  return [];
}

export const FollowingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [following, setFollowing] = useState<string[]>(() => getLocalFollowing());

  const isFollowing = (organizerName: string) => {
    if (!organizerName) return false;
    const clean = organizerName.trim().toLowerCase();
    return following.some((f) => f.toLowerCase() === clean);
  };

  const toggleFollow = (organizerName: string) => {
    if (!organizerName) return;
    const clean = organizerName.trim();
    setFollowing((prev) => {
      const exists = prev.some((f) => f.toLowerCase() === clean.toLowerCase());
      const next = exists
        ? prev.filter((f) => f.toLowerCase() !== clean.toLowerCase())
        : [...prev, clean];
      try {
        localStorage.setItem(STORAGE_FOLLOWING_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const followOrganizer = (organizerName: string) => {
    if (!organizerName) return;
    const clean = organizerName.trim();
    setFollowing((prev) => {
      if (prev.some((f) => f.toLowerCase() === clean.toLowerCase())) return prev;
      const next = [...prev, clean];
      try {
        localStorage.setItem(STORAGE_FOLLOWING_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const unfollowOrganizer = (organizerName: string) => {
    if (!organizerName) return;
    const clean = organizerName.trim().toLowerCase();
    setFollowing((prev) => {
      const next = prev.filter((f) => f.toLowerCase() !== clean);
      try {
        localStorage.setItem(STORAGE_FOLLOWING_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  return (
    <FollowingContext.Provider
      value={{
        following,
        isFollowing,
        toggleFollow,
        followOrganizer,
        unfollowOrganizer,
        followingCount: following.length,
      }}
    >
      {children}
    </FollowingContext.Provider>
  );
};

export function useFollowing() {
  const ctx = useContext(FollowingContext);
  if (!ctx) throw new Error('useFollowing must be used within a FollowingProvider');
  return ctx;
}
