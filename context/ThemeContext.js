import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const COLORS = {
    primary: "#d42b1f",
    backgroundLight: "#FFFFFF",
    backgroundDark: "#121212",
    surfaceLight: "#F0F5FA",
    surfaceDark: "#1E1E1E",
    textLightPrimary: "#1C1C1E",
    textDarkPrimary: "#F2F2F7",
    textLightSecondary: "#636366",
    textDarkSecondary: "#8E8E93",
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, COLORS }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}