import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type UserProfile = 'freelance' | 'perso' | null;

export type FreelanceStatus = 'bnc' | 'bic' | 'vente' | 'other';

interface FreelanceSetup {
  status: FreelanceStatus;
  monthlyRevenue: number;
  quarterly: boolean;
  versementLiberatoire: boolean;
  acre: boolean;
}

interface PersoSetup {
  netSalary: number;
  payday: number;
  fixedExpenses: number;
}

interface AppState {
  onboardingDone: boolean;
  profile: UserProfile;
  userName: string;
  freelanceSetup: FreelanceSetup;
  persoSetup: PersoSetup;
  hasData: boolean;
  tutorialDone: boolean;
  hasSeenAuthPrompt: boolean;
}

interface AppContextType extends AppState {
  authReady: boolean;
  isAnonymous: boolean | null;
  setProfile: (p: UserProfile) => void;
  setUserName: (n: string) => void;
  setFreelanceSetup: (s: Partial<FreelanceSetup>) => void;
  setPersoSetup: (s: Partial<PersoSetup>) => void;
  completeOnboarding: () => void;
  setHasData: (v: boolean) => void;
  setTutorialDone: (v: boolean) => void;
  setHasSeenAuthPrompt: (v: boolean) => void;
  reset: () => void;
}

const defaultFreelanceSetup: FreelanceSetup = {
  status: 'bnc',
  monthlyRevenue: 3200,
  quarterly: true,
  versementLiberatoire: true,
  acre: false,
};

const defaultPersoSetup: PersoSetup = {
  netSalary: 2100,
  payday: 27,
  fixedExpenses: 915,
};

const defaultState: AppState = {
  onboardingDone: false,
  profile: null,
  userName: 'Léa',
  freelanceSetup: defaultFreelanceSetup,
  persoSetup: defaultPersoSetup,
  hasData: false,
  tutorialDone: false,
  hasSeenAuthPrompt: false,
};

const AppContext = createContext<AppContextType>({
  ...defaultState,
  authReady: false,
  isAnonymous: null,
  setProfile: () => {},
  setUserName: () => {},
  setFreelanceSetup: () => {},
  setPersoSetup: () => {},
  completeOnboarding: () => {},
  setHasData: () => {},
  setTutorialDone: () => {},
  setHasSeenAuthPrompt: () => {},
  reset: () => {},
});

const STORAGE_KEY = '@karl_app_state';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [authReady, setAuthReady] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setState({ ...defaultState, ...JSON.parse(raw) });
        } catch {}
      }
    });
  }, []);

  // Auth: init anonymous session, listen for state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAnonymous(session.user.is_anonymous ?? false);
        setAuthReady(true);
      } else {
        setIsAnonymous(null);
        setAuthReady(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        await supabase.auth.signInAnonymously();
      } else {
        setIsAnonymous(session.user.is_anonymous ?? false);
        setAuthReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const save = useCallback((next: AppState) => {
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setProfile = useCallback(
    (profile: UserProfile) => save({ ...state, profile }),
    [state, save]
  );

  const setUserName = useCallback(
    (userName: string) => save({ ...state, userName }),
    [state, save]
  );

  const setFreelanceSetup = useCallback(
    (s: Partial<FreelanceSetup>) =>
      save({ ...state, freelanceSetup: { ...state.freelanceSetup, ...s } }),
    [state, save]
  );

  const setPersoSetup = useCallback(
    (s: Partial<PersoSetup>) =>
      save({ ...state, persoSetup: { ...state.persoSetup, ...s } }),
    [state, save]
  );

  const completeOnboarding = useCallback(
    () => save({ ...state, onboardingDone: true }),
    [state, save]
  );

  const setHasData = useCallback(
    (hasData: boolean) => save({ ...state, hasData }),
    [state, save]
  );

  const setTutorialDone = useCallback(
    (tutorialDone: boolean) => save({ ...state, tutorialDone }),
    [state, save]
  );

  const setHasSeenAuthPrompt = useCallback(
    (hasSeenAuthPrompt: boolean) => save({ ...state, hasSeenAuthPrompt }),
    [state, save]
  );

  const reset = useCallback(() => {
    AsyncStorage.removeItem(STORAGE_KEY);
    setState(defaultState);
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        authReady,
        isAnonymous,
        setProfile,
        setUserName,
        setFreelanceSetup,
        setPersoSetup,
        completeOnboarding,
        setHasData,
        setTutorialDone,
        setHasSeenAuthPrompt,
        reset,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

export function useAccentColor() {
  const { profile } = useApp();
  return profile === 'perso' ? '#a78bfa' : '#c4f542';
}
