import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  defaultTheme,
  Provider as SpectrumProvider,
} from "@adobe/react-spectrum";
import "./office-details.css";

import { Heading, View, Content, Text, Flex, Divider } from "@adobe/react-spectrum";
import { useState, useEffect } from "react";

const App = () => {
  const [office, setOffice] = useState(null);

  useEffect(() => {
    // Read initial data from window.openai.toolOutput
    if (window.openai?.toolOutput?.office) {
      setOffice(window.openai.toolOutput.office);
    }

    // Listen for updates
    const handleSetGlobals = (event) => {
      if (event.detail?.globals?.toolOutput?.office) {
        setOffice(event.detail.globals.toolOutput.office);
      }
    };

    window.addEventListener("openai:set_globals", handleSetGlobals);
    return () => window.removeEventListener("openai:set_globals", handleSetGlobals);
  }, []);

  const handleSendEmail = async () => {
    if (!office) return;
    try {
      await window.openai?.callTool("send-email", {
        officeId: office.id,
        officeName: office.name,
      });
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  };

  const handleBackToList = async () => {
    try {
      await window.openai?.callTool("office-list", {});
    } catch (error) {
      console.error("Failed to go back to list:", error);
    }
  };

  if (!office) {
    return (
      <View padding="size-250">
        <Text>Loading office details...</Text>
      </View>
    );
  }

  return (
    <View padding="size-250">
      <Flex direction="column" gap="size-200">
        <Button variant="secondary" onPress={handleBackToList} alignSelf="start">
          Back to List
        </Button>

        <Heading level={1}>{office.name}</Heading>

        <Content>
          <Flex direction="column" gap="size-150">
            <View>
              <Text>
                <strong>Location:</strong> {office.location}
              </Text>
            </View>

            <View>
              <Text>
                <strong>Description:</strong> {office.description}
              </Text>
            </View>

            {office.phone && (
              <View>
                <Text>
                  <strong>Phone:</strong> {office.phone}
                </Text>
              </View>
            )}

            {office.amenities && office.amenities.length > 0 && (
              <>
                <Divider size="S" />
                <View>
                  <Heading level={3}>Amenities</Heading>
                  <Flex direction="column" gap="size-50" marginTop="size-100">
                    {office.amenities.map((amenity, index) => (
                      <Text key={index}>• {amenity}</Text>
                    ))}
                  </Flex>
                </View>
              </>
            )}
          </Flex>
        </Content>

        <Button variant="accent" onPress={handleSendEmail} marginTop="size-200">
          Express Interest in Visiting
        </Button>
      </Flex>
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
