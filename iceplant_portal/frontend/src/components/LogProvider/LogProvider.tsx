import React from 'react';
import { LoggerContext, loggerService } from '../../utils/logger';

interface LogProviderProps {
  children: React.ReactNode;
}

export const LogProvider: React.FC<LogProviderProps> = ({ children }) => {
  return (
    <LoggerContext.Provider value={loggerService}>
      {children}
    </LoggerContext.Provider>
  );
}; 