/**
 * @typedef {Object} UnknownObject
 * @template [T=Record<string, unknown>]
 */

/**
 * @typedef {Object} CallToolResponse
 */

/**
 * @typedef {Object} OpenAiGlobals
 * @template {UnknownObject} [ToolInput=UnknownObject]
 * @template {UnknownObject} [ToolOutput=UnknownObject]
 * @template {UnknownObject} [ToolResponseMetadata=UnknownObject]
 * @template {UnknownObject} [WidgetState=UnknownObject]
 * @property {Theme} theme
 * @property {UserAgent} userAgent
 * @property {string} locale
 * @property {number} maxHeight
 * @property {DisplayMode} displayMode
 * @property {SafeArea} safeArea
 * @property {ToolInput} toolInput
 * @property {ToolOutput|null} toolOutput
 * @property {ToolResponseMetadata|null} toolResponseMetadata
 * @property {WidgetState|null} widgetState
 */

/**
 * @typedef {Object} API
 * @template {UnknownObject} WidgetState
 * @property {function(string, Record<string, unknown>): Promise<CallToolResponse>} callTool - Calls a tool on your MCP. Returns the full response.
 * @property {function({prompt: string}): Promise<void>} sendFollowUpMessage - Triggers a followup turn in the ChatGPT conversation
 * @property {function({href: string}): void} openExternal - Opens an external link, redirects web page or mobile app
 * @property {function({mode: DisplayMode}): Promise<{mode: DisplayMode}>} requestDisplayMode - For transitioning an app from inline to fullscreen or pip. The granted display mode. The host may reject the request. For mobile, PiP is always coerced to fullscreen.
 * @property {function(WidgetState): Promise<void>} setWidgetState
 */

/**
 * @typedef {function(string, Record<string, unknown>): Promise<CallToolResponse>} CallTool
 */

/** @typedef {"pip"|"inline"|"fullscreen"} DisplayMode */
/** @typedef {"light"|"dark"} Theme */

/**
 * @typedef {Object} SafeAreaInsets
 * @property {number} top
 * @property {number} bottom
 * @property {number} left
 * @property {number} right
 */

/**
 * @typedef {Object} SafeArea
 * @property {SafeAreaInsets} insets
 */

/** @typedef {"mobile"|"tablet"|"desktop"|"unknown"} DeviceType */

/**
 * @typedef {Object} UserAgent
 * @property {{type: DeviceType}} device
 * @property {{hover: boolean, touch: boolean}} capabilities
 */

// Dispatched when any global changes in the host page
export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";

/**
 * @class SetGlobalsEvent
 * @extends CustomEvent
 * @param {{globals: Partial<OpenAiGlobals>}} detail
 */
export class SetGlobalsEvent extends CustomEvent {
  /**
   * @type {string}
   * @readonly
   */
  type = SET_GLOBALS_EVENT_TYPE;
}

/**
 * @typedef {API & OpenAiGlobals} WindowOpenAI
 */

/**
 * @typedef {Object} window
 * @property {WindowOpenAI} openai
 */

/**
 * @typedef {Object} WindowEventMap
 * @property {SetGlobalsEvent} [openai:set_globals]
 */

/** @type {WindowOpenAI} */
export const OpenAI = window.openai;
