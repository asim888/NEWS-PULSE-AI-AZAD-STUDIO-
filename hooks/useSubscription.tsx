
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface SubscriptionContextType {
  isSubscribed: boolean;
  isTrial: boolean;
  startTrial: () => void;
  subscribe: () => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  checkSubscription: (isPremium: boolean) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [trialEndTime, setTrialEndTime] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const startTrial = useCallback(() => {
    setIsTrial(true);
    setTrialEndTime(Date.now() + TRIAL_DURATION_MS);
    setShowModal(false);
  }, []);

  const subscribe = useCallback(() => {
    setIsSubscribed(true);
    setIsTrial(false);
    setShowModal(false);
  }, []);

  const checkSubscription = useCallback((isPremium: boolean): boolean => {
    if (!isPremium) return true; // Free content is always accessible

    // Check for expired trial when accessing a resource
    if (isTrial && trialEndTime && Date.now() > trialEndTime) {
      setIsTrial(false);
      setTrialEndTime(null);
      setShowModal(true); // Show modal to prompt subscription
      return false;
    }

    if (isSubscribed || isTrial) return true; // Subscribed or active trial users can access
    
    setShowModal(true); // Prompt to subscribe
    return false;
  }, [isSubscribed, isTrial, trialEndTime]);

  const value = { isSubscribed, isTrial, startTrial, subscribe, showModal, setShowModal, checkSubscription };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
