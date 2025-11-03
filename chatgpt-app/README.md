# ChatGPT App + Adobe Experience Platform Edge

This is an example of how to create a [ChatGPT App](https://openai.com/index/introducing-apps-in-chatgpt/) ([developer documentation](https://developers.openai.com/apps-sdk) that integrates with Adobe Experience Platform Edge.

A ChatGPT App has two parts - a front-end SPA, hosted inside an `iframe[sandbox="allow-scripts allow-same-origin allow-forms"]` on the dedicated `*.web-sandbox.oaiusercontent.com` (example: `https://open-spotify-com.web-sandbox.oaiusercontent.com?app=chatgpt&locale=en-US&deviceType=desktop`) domain, that the ChatGPT user interacts with, and a backend [MCP server](https://modelcontextprotocol.io/docs/getting-started/intro) that ChatGPT uses to interact with your application/service.

This example shows a small hotel aggregator, allowing the user to book a hotel room.

This example can be loaded into ChatGPT in developer mode. It will need to be publicly accessible with a valid SSL certificate.
