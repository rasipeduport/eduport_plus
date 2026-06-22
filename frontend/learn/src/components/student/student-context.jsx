import { createContext, useContext } from 'react';

export const StudentContext = createContext(null);

export function useStudent() {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
}
