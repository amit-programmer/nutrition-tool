import { useState, useEffect } from 'react';

export interface UserProfile {
  age?: number;
  gender?: string;
  height?: number; // in cm
  weight?: number; // in kg
  activityLevel?: string;
  target?: string;
  medicalConditions?: string[];
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('somi_user_profile');
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse user profile', e);
      }
    }
  }, []);

  const saveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem('somi_user_profile', JSON.stringify(newProfile));
  };

  return { profile, saveProfile };
}
