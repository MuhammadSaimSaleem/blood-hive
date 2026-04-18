import { createContext, useContext, useState } from 'react';

// 1. Initialize the context
const UserContext = createContext(undefined);

// 2. Create a Provider component
export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState('');

  return (
    <UserContext.Provider value={{ userId, setUserId }}>
      {children}
    </UserContext.Provider>
  );
};

// 3. Custom hook for easy access
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};