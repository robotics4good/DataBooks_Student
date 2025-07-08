import React, { createContext, useContext, useState } from 'react';

const JournalContext = createContext();

export const useJournal = () => {
  const context = useContext(JournalContext);
  if (!context) {
    throw new Error('useJournal must be used within a JournalProvider');
  }
  return context;
};

export const JournalProvider = ({ children }) => {
  const [journalAnswers, setJournalAnswers] = useState({});

  const setJournalAnswer = (index, answer) => {
    setJournalAnswers(prev => ({
      ...prev,
      [index]: answer
    }));
  };

  const clearJournal = () => {
    setJournalAnswers({});
  };

  const value = {
    journalAnswers,
    setJournalAnswer,
    clearJournal
  };

  return (
    <JournalContext.Provider value={value}>
      {children}
    </JournalContext.Provider>
  );
}; 