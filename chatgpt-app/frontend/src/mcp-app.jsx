import { createContext, useContext, useState, useCallback } from "react";
import { useApp } from "@modelcontextprotocol/ext-apps/react-with-deps";

const McpAppContext = createContext(null);

/**
 * Provides the MCP App connection and tool result state to the component tree.
 * Wrap each widget's root with this provider.
 */
export function McpAppProvider({ children }) {
  const [toolOutput, setToolOutput] = useState(null);

  const { app, isConnected, error } = useApp({
    appInfo: { name: "adobe-office-information", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (params) => {
        setToolOutput(params.structuredContent ?? null);
      };
    },
  });

  return (
    <McpAppContext.Provider value={{ app, isConnected, error, toolOutput }}>
      {children}
    </McpAppContext.Provider>
  );
}

/**
 * Returns the structured content from the most recent tool result.
 * Replaces the old `useToolOutput()` from openai-hooks.
 */
export function useToolOutput() {
  const ctx = useContext(McpAppContext);
  return ctx?.toolOutput ?? null;
}

/**
 * Returns a function to call server tools.
 * Replaces the old `createToolCaller()` from openai-hooks.
 *
 * Usage: `const callTool = useCallTool(); await callTool("tool-name", { arg: value })`
 */
export function useCallTool() {
  const ctx = useContext(McpAppContext);
  const app = ctx?.app;
  return useCallback(
    (name, args) =>
      app
        ? app.callServerTool({ name, arguments: args })
        : Promise.reject(new Error("MCP App not connected")),
    [app],
  );
}

/**
 * Returns the full MCP App context: { app, isConnected, error, toolOutput }.
 */
export function useMcpApp() {
  return useContext(McpAppContext);
}
