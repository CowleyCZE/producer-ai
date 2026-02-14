import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { UserFeedback } from '../types';

interface FeedbackContextType {
  feedbacks: UserFeedback[];
  addFeedback: (segmentId: string, variantId: string, rating: 'good' | 'bad' | 'neutral', comment?: string) => void;
  getSegmentFeedback: (segmentId: string) => UserFeedback | undefined;
  clearFeedbacks: () => void;
  getStats: () => { good: number; bad: number; neutral: number };
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

interface FeedbackProviderProps {
  children: ReactNode;
}

export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({ children }) => {
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);

  const addFeedback = useCallback((segmentId: string, variantId: string, rating: 'good' | 'bad' | 'neutral', comment?: string) => {
    const feedback: UserFeedback = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      segmentId,
      variantId,
      rating,
      comment
    };
    setFeedbacks(prev => [...prev, feedback]);
  }, []);

  const getSegmentFeedback = useCallback((segmentId: string) => {
    return feedbacks.find(f => f.segmentId === segmentId);
  }, [feedbacks]);

  const clearFeedbacks = useCallback(() => {
    setFeedbacks([]);
  }, []);

  const getStats = useCallback(() => {
    return {
      good: feedbacks.filter(f => f.rating === 'good').length,
      bad: feedbacks.filter(f => f.rating === 'bad').length,
      neutral: feedbacks.filter(f => f.rating === 'neutral').length
    };
  }, [feedbacks]);

  return (
    <FeedbackContext.Provider value={{ feedbacks, addFeedback, getSegmentFeedback, clearFeedbacks, getStats }}>
      {children}
    </FeedbackContext.Provider>
  );
};
