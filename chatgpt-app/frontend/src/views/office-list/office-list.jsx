import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  defaultTheme,
  Provider as SpectrumProvider,
} from "@adobe/react-spectrum";
import "./office-list.css";

import { Heading, View, Content, Text, Flex } from "@adobe/react-spectrum";
import { useState, useEffect } from "react";

const App = () => {
  const [offices, setOffices] = useState([]);

  useEffect(() => {
    // Read initial data from window.openai.toolOutput
    if (window.openai?.toolOutput?.offices) {
      setOffices(window.openai.toolOutput.offices);
    }

    // Listen for updates
    const handleSetGlobals = (event) => {
      if (event.detail?.globals?.toolOutput?.offices) {
        setOffices(event.detail.globals.toolOutput.offices);
      }
    };

    window.addEventListener("openai:set_globals", handleSetGlobals);
    return () => window.removeEventListener("openai:set_globals", handleSetGlobals);
  }, []);

  const handleViewDetails = async (officeId) => {
    try {
      await window.openai?.callTool("office-details", { officeId });
    } catch (error) {
      console.error("Failed to call office-details tool:", error);
    }
  };

  const handleSendEmail = async (officeId, officeName) => {
    try {
      await window.openai?.callTool("send-email", { officeId, officeName });
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  };

  return (
    <View padding="size-250">
      <Heading level={1}>Adobe Offices</Heading>
      <Content marginTop="size-200">
        {offices.length === 0 ? (
          <Text>No offices available</Text>
        ) : (
          <Flex direction="column" gap="size-200">
            {offices.map((office) => (
              <View
                key={office.id}
                padding="size-200"
                borderWidth="thin"
                borderColor="dark"
                borderRadius="medium"
              >
                <Heading level={2}>{office.name}</Heading>
                <Text>{office.location}</Text>
                <Text marginTop="size-100">{office.description}</Text>
                <Flex gap="size-100" marginTop="size-200">
                  <Button
                    variant="primary"
                    onPress={() => handleViewDetails(office.id)}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() => handleSendEmail(office.id, office.name)}
                  >
                    Express Interest
                  </Button>
                </Flex>
              </View>
            ))}
          </Flex>
        )}
      </Content>
    </View>
  );
};

export default App;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SpectrumProvider theme={defaultTheme}>
      <App />
    </SpectrumProvider>
  </StrictMode>
);
