import { createContext, useContext } from "react";

// Stable-ish console state: system, tenant, agent identity, navigation helpers.
export const ConsoleContext = createContext(null);

// The shared conversation list (polled by the shell, used by the inbox + badges).
export const InboxDataContext = createContext(null);

export const useConsole = () => {
  const value = useContext(ConsoleContext);
  if (!value) throw new Error("useConsole must be used inside the advisor console");
  return value;
};

export const useInboxData = () => useContext(InboxDataContext);
