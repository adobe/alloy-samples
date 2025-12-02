# ChatGPT App + Adobe Experience Platform Edge

This is a reference implementation of a [ChatGPT App](https://developers.openai.com/apps-sdk) (MCP server + web UI) that integrates with the Adobe Experience Platform (AEP) Edge Network for analytics and personalization. It demonstrates a "hybrid" architecture where analytics and personalization logic is shared between a server-side backend and a client-side frontend.

## Package Overview

- **`datastore`**: Contains shared data models (offices) and Zod schemas used by both the backend and frontend to ensure type safety. This is a demo application, so the data is just a static variable, but in a real application, this would be a database.
- **`experience-edge-client`**: A server-side library that handles authentication with Adobe IMS and communicates directly with the AEP Edge Network. It mimics the capabilities of the client-side Alloy SDK but for server-side environments.
- **`frontend`**: A React application built with Adobe React Spectrum. It renders the UI widgets (like the office list) inside ChatGPT's sandbox and handles the client-side application of personalization decisions, following the [custom UX guidance](https://developers.openai.com/apps-sdk/build/custom-ux).
- **`backend`**: A Node.js application using Hono that serves as the Model Context Protocol (MCP) server (built with the [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)). It exposes the [Apps SDK tools](https://developers.openai.com/apps-sdk/plan/tools) (`office-list`, `office-details`, `request-visit`) to ChatGPT and orchestrates the connection to Adobe Edge.

## High-level dataflow

```mermaid
sequenceDiagram
    actor User
    participant ChatGPT
    participant Frontend as ChatGPT App<br>(Frontend Widget)
    participant Backend as MCP Server<br>(Backend)
    participant Edge as AEP Edge Network

    Note over Backend,Edge: App authenticates with Adobe

    User->>ChatGPT: "Show me the most pet-friendly Adobe office"

    Note over ChatGPT: Understands intent:<br>"List all offices first"

    ChatGPT->>Backend: Request office list

    Backend->>Edge: ✓ Track "office list viewed" event<br>✓ Request personalization content<br>✓ Maintain user identity (FPID → ECID)
    Edge-->>Backend: ✓ Analytics recorded<br>✓ Personalized content returned<br>✓ User identity established

    Backend-->>ChatGPT: Office data + personalization

    ChatGPT->>Frontend: Display offices with personalization

    Note over Frontend: Shows list of offices<br>Applies personalized content<br>(e.g., targeted banners, recommendations)

    Frontend-->>User: Interactive office list displayed

    Note over ChatGPT: Analyzes data:<br>"Seattle is pet-friendly"

    ChatGPT->>Backend: Request Seattle office details

    Backend->>Edge: ✓ Track "office details viewed" event<br>✓ Include office ID (Seattle)<br>✓ Request personalization content<br>✓ Continue same user session
    Edge-->>Backend: ✓ Analytics recorded<br>✓ Personalized content returned<br>✓ User journey tracked

    Backend-->>ChatGPT: Seattle office details + personalization

    ChatGPT->>Frontend: Display Seattle office with personalization

    Note over Frontend: Shows detailed view with:<br>- Office information<br>- Personalized recommendations<br>- Request tour form

    Frontend-->>User: Seattle office details displayed

    ChatGPT-->>User: "The Seattle office is the most pet-friendly!<br>It features pet-friendly amenities and is located<br>in downtown Seattle."
    Note over User,Edge: ✓ Complete user journey tracked in Adobe Analytics<br>✓ Cross-session personalization enabled<br>✓ Real-time behavioral data captured
```

## Technical dataflow

```mermaid
sequenceDiagram
    actor User
    participant ChatGPT
    participant Frontend as ChatGPT App<br>(Frontend Widget)
    participant Backend as MCP Server<br>(Backend)
    participant IMS as Adobe IMS
    participant Edge as AEP Edge Network

    Note over Backend,IMS: Initial Authentication
    Backend->>IMS: Client credentials auth request
    IMS-->>Backend: Access token

    User->>ChatGPT: "Use the Adobe Office Information tool to show me<br>the details about the office that is most pet friendly"

    Note over ChatGPT: Invokes office_list tool
    ChatGPT->>Backend: MCP tool call: office_list<br>(includes openai/subject as FPID)

    Note over Backend: Backend creates IdentityMap with FPID<br>and retrieves cluster hint from StateStore
    Backend->>Edge: POST /interact<br>- Authorization: Bearer {access_token}<br>- identityMap: {FPID}<br>- xdm: {eventType: "office.list.view"}<br>- query: {personalization: {decisionScopes: ["__view__"]}}<br>- meta: {state: {entries: [cluster, ECID]}}

    Edge-->>Backend: Response with handles:<br>- state:store (ECID, cluster hint)<br>- personalization:decisions<br>- identity:result

    Note over Backend: StateStore persists ECID & cluster hint<br>keyed by session ID (FPID)
    Backend-->>ChatGPT: structuredContent:<br>- offices: [...]<br>- _adobe: {handles: [...]}<br>content: "Displayed the list of offices."

    ChatGPT->>Frontend: Render office-list-widget with:<br>- offices data<br>- _adobe.handles

    Note over Frontend: Widget calls alloy("applyResponse", {<br>  renderDecisions: true,<br>  responseBody: {handle: _adobe.handles}<br>})
    Frontend->>Frontend: Alloy processes handles:<br>- Stores ECID in cookies<br>- Renders personalizations<br>- Displays office list

    Note over ChatGPT: Analyzes offices array from structuredContent,<br>identifies "Seattle" as pet-friendly<br>(amenities includes "Pet Friendly")

    ChatGPT->>Backend: MCP tool call: office-details<br>{officeId: "seattle"}<br>(includes openai/subject as FPID)

    Note over Backend: Retrieves ECID & cluster from StateStore<br>using FPID as session key<br>Fetches office data from datastore
    Backend->>Edge: POST /interact<br>- Authorization: Bearer {access_token}<br>- identityMap: {FPID}<br>- xdm: {eventType: "office.details.view",<br>        _unifiedJsLab: {details: {officeId: "seattle"}},<br>        query: {personalization: {decisionScopes: ["__view__"]}}}<br>- meta: {state: {entries: [cluster, ECID]}}

    Edge-->>Backend: Response with handles:<br>- state:store (updated state)<br>- personalization:decisions<br>- identity:result

    Note over Backend: StateStore updates session state<br>Filters relevant handles
    Backend-->>ChatGPT: structuredContent:<br>- office: {id: "seattle", name: "Seattle", ...}<br>- _adobe: {handles: [...]}<br>content: "Displayed details for office seattle"

    ChatGPT->>Frontend: Render office-details-widget with:<br>- office data<br>- _adobe.handles

    Note over Frontend: Widget calls alloy("applyResponse", {<br>  renderDecisions: true,<br>  responseBody: {handle: _adobe.handles}<br>})
    Frontend->>Frontend: Alloy processes handles:<br>- Updates ECID cookies<br>- Renders personalizations<br>- Displays office details with image,<br>  amenities, and "Request Tour" form

    ChatGPT-->>User: "The Seattle office is the most pet-friendly!<br>It features [amenities] and is located at [location]."<br>[Shows office-details-widget]
```

## Backend Architecture & Adobe Edge Connection

The `backend` is the core orchestrator of this application. It implements the [Model Context Protocol (MCP)](https://developers.openai.com/apps-sdk/concepts/mcp-server) to provide tools that ChatGPT can invoke.

### Connection to Adobe Edge

The backend connects to the Adobe Edge Network using the `experience-edge-client`. Here is the flow:

1.  **Authentication**: On startup, the backend authenticates with Adobe Identity Management System (IMS) using a Client ID and Secret to obtain an access token.
2.  **Tool Invocation**: When a user asks ChatGPT to "list offices", ChatGPT invokes the `office-list` tool on the backend.
3.  **Server-Side Event**: The backend uses `ExperienceEdgeClient` to send an experience event to AEP Edge.
    - It sends an XDM (Experience Data Model) payload describing the event (e.g., `office.list.view`).
4.  **Edge Response**: AEP Edge processes the event and returns "handles"—instructions for personalization (e.g., "show this specific banner") or state updates (e.g., "set this cookie").
5.  **Response Passthrough**: The backend packages these handles into the tool response and sends them back to ChatGPT, along with the actual data (the list of offices).

## Identity Management

[ChatGPT/OpenAI sends an `_meta.openai/subject` field in the MCP request metadata](https://developers.openai.com/apps-sdk/reference#_meta-fields-the-client-provides). This is a pseudonymous user ID that is stable across devices and sessions for a user. In this example, we use it as the FPID when communicating with the Adobe Edge Network, as the edge network requires either an FPID or an ECID for the first hit. If that is not available (e.g. for users connecting with an MCP client other than ChatGPT), we use a fallback UUIDv7. This will not be stable across sessions or across analytics events (1 event = 1 session) and should not be used in production.

If you are creating an authenticated application–ChatGPT and MCP servers [specify OAuth 2.1](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)–you can extract information from the JWT token in the `Authorization: Bearer` header. Emails derived from the JWT token or the `sub` claim are all excellent candidates for FPID.

This example also creates a `sessionId` to track sessions. This is a randomly generated UUIDv7 that is generated by the first tool call, returned as part of the structured content of the tool response so that it is inside the context of the LLM and is required on all subsequent tool calls. "Optional on the first and required on the second" is a tricky pattern to achieve. Our recommendation is that you identify or create an "entrypoint" tool that all sessions start with, which accepts an optional `sessionId` parameter, returns a `sessionId`, and then all other tools require that `sessionId` as a parameter. If a tool call is defined with `sessionId` as optional, we've found that LLMs will almost always either exclude it or hallucinate a value.

## Hybrid Implementation

This project uses a unique "Hybrid" approach to bridge the gap between the conversational interface (processed on the server) and the visual interface (rendered in the browser).

1.  **Server-Side Collection**: The primary interaction (the "view") is recorded server-side by the backend when the tool is called. This ensures that every interaction is tracked, even if the UI doesn't fully load or if the user is interacting via voice.
2.  **Client-Side Application**: When the frontend widget loads in ChatGPT's browser sandbox:
    - It receives the payload from the backend, including the `_adobe` object containing the state and personalization payloads from AEP Edge.
    - It initializes the client-side Alloy SDK.
    - It calls `alloy("applyResponse", ...)` with the handles received from the server. This will set the relevant `kndctr` cookies (identity and cluster) and apply the personalization payloads to the DOM.

This allows the client-side SDK to "hydrate" its state with the result of the server-side event, effectively merging the server-side session with the client-side browser session. This enables features like consistent personalization and cross-channel state management without requiring two separate network calls to Adobe Edge.

A hybrid implementation is preferred because for a few reasons:

1. The backend mcp server has more information that the frontend app does, such as the `openai/subject`.
2. The MCP specification for backend is more well-defined and is less likely to change-[the proposal for frontend MCP apps was only introduced in November 2025 and has yet to be finalized.](http://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/).
3. A backend allows us to target multiple MCP clients (Claude, Cursor, Gemini, etc) instead of just ChatGPT.

## Development/Usage

0. Clone the repository: `git clone https://github.com/adobe/alloy-samples.git` and navigate to the `chatgpt-app` directory (i.e. `cd alloy-samples/chatgpt-app`).
1. Install dependencies: `pnpm install`
2. Set up the environment variables: `cp .env.example .env` and fill in the values, including IMS token (for server-to-server auth) and datastream ID. All fields are required.
3. Start dev server in the `chatgpt-app` directory: `pnpm run dev`.
4. Expose the dev server to the public internet. I used [`ngrok`](https://ngrok.com/). `ngrok http 3000`.
5. Log into ChatGPT with at least a "Plus" plan.
6. Open Settings -> Apps & Connectors -> Advanced Settings (bottom of the page) -> Developer Mode.
7. Go back to "Apps & Connectors" -> Create and add the details of the dev server. Use your ngrok URL + "/mcp" as the URL. Select "No Authentication". Fill out the other fields and click "Create".
8. Try out the app in a new chat.

Example usage:

> Use the Adobe Office Information tool to show me the details about the office that is most pet friendly.

9. Observe the output log of your dev server. See the tool calls come in. Real data should be sent to the edge.

## Example AEP dataset schema

<img width="357" height="652" alt="image" src="https://github.com/user-attachments/assets/67ac03bd-a97d-41f5-bacc-3fc9ab9942b6" />

## Additional Documentation

- [Apps SDK overview & guides](https://developers.openai.com/apps-sdk) — general reference for defining MCP servers, tools, prompts, and widgets for ChatGPT, organized around the Plan (research use cases), Build (MCP server + tools + widget runtime), and Deploy stages.
- [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — powers the backend’s MCP implementation and includes the Streamable HTTP transport plus legacy SSE compatibility for broader client support.
