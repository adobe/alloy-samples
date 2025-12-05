import { useSyncExternalStore } from "react";
import { SET_GLOBALS_EVENT_TYPE, OpenAI } from "./openai.js";

/**
 * @typedef {import('./openai.js').OpenAiGlobals} OpenAiGlobals
 * @typedef {import('./openai.js').SetGlobalsEvent} SetGlobalsEvent
 */

/**
 * Hook to access and reactively track OpenAI global values
 * @template {keyof OpenAiGlobals} K
 * @param {K} key - The key of the OpenAiGlobals property to track
 * @returns {OpenAiGlobals[K]} The value of the specified global property
 */
export function useOpenAiGlobal(key) {
  return useSyncExternalStore(
    (onChange) => {
      /**
       * @param {SetGlobalsEvent} event
       */
      const handleSetGlobal = (event) => {
        const value = event.detail.globals[key];
        if (value === undefined) {
          return;
        }

        onChange();
      };

      window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
        passive: true,
      });

      return () => {
        window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
      };
    },
    () => OpenAI[key],
  );
}

/**
 * Hook to access the tool input from OpenAI globals
 * @returns {OpenAiGlobals['toolInput']} The tool input data
 */
export function useToolInput() {
  return useOpenAiGlobal("toolInput");
}

/**
 * Hook to access the tool output from OpenAI globals
 * @returns {OpenAiGlobals['toolOutput']} The tool output data
 */
export function useToolOutput() {
  return useOpenAiGlobal("toolOutput");
}

/**
 * Hook to access the tool response metadata from OpenAI globals
 * @returns {OpenAiGlobals['toolResponseMetadata']} The tool response metadata
 */
export function useToolResponseMetadata() {
  return useOpenAiGlobal("toolResponseMetadata");
}

/**
 * Hook to access and update widget state.
 * Widget state persists across user sessions and is scoped to the specific widget instance.
 * State is exposed to ChatGPT and rehydrated into window.openai.widgetState.
 * Keep payload under 4k tokens for performance.
 *
 * @template {Record<string, unknown>} [T=Record<string, unknown>]
 * @returns {[T | null, (state: T) => Promise<void>]} A tuple of [widgetState, setWidgetState]
 */
export function useWidgetState() {
  const widgetState = useOpenAiGlobal("widgetState");
  const setWidgetState = OpenAI.setWidgetState;
  return [widgetState, setWidgetState];
}

export function useTool(name) {
  const callTool = OpenAI.callTool;
  return (params) => callTool(name, params);
}
