import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  defaultTheme,
  Provider as SpectrumProvider,
  View,
  Heading,
  Grid,
  Text,
  Content,
  Flex,
  Divider,
} from "@adobe/react-spectrum";
import "./office-list.css";
import { useToolOutput, useWidgetState } from "../../openai-hooks";

const OfficeCard = ({ office }) => {
  const imageSize = 300;
  /* TODO: Figure out a different way to serve images - ChatGPT's Content Security Policy generates the following error:
   * Content-Security-Policy: The page’s settings blocked the loading of a resource (img-src) at
   * https://picsum.photos/seed/sf/300 because it violates the following directive: “img-src 'self' data:
   * https://cdn.tailwindcss.com
   * https://cdn.jsdelivr.net
   * https://unpkg.com
   * https://*.oaiusercontent.com
   * https://threejs.org
   * https://*.oaistatic.com”
   */
  const imageUrl = `https://picsum.photos/seed/${office.id}/${imageSize}`;

  return (
    <View
      borderWidth="thin"
      borderColor="gray-300"
      borderRadius="medium"
      overflow="hidden"
      backgroundColor="gray-50"
    >
      <img
        src={imageUrl}
        alt={office.name}
        style={{ width: "100%", height: "200px", objectFit: "cover" }}
      />
      <View padding="size-200">
        <Heading level={3} marginBottom="size-50">
          {office.name}
        </Heading>
        <Text marginBottom="size-100">
          <strong>Location:</strong> {office.location}
        </Text>
        <Text marginBottom="size-150">{office.description}</Text>
        <Divider size="S" marginBottom="size-150" />
        <Text>
          <strong>Amenities:</strong>
        </Text>
        <Flex gap="size-100" wrap marginTop="size-50" marginBottom="size-150">
          {office.amenities.map((amenity) => (
            <View
              key={amenity}
              backgroundColor="gray-200"
              paddingX="size-100"
              paddingY="size-50"
              borderRadius="small"
            >
              <Text UNSAFE_style={{ fontSize: "0.875rem" }}>{amenity}</Text>
            </View>
          ))}
        </Flex>
        <Text
          UNSAFE_style={{
            fontSize: "0.875rem",
            color: "var(--spectrum-global-color-gray-700)",
          }}
        >
          <strong>Phone:</strong> {office.phone}
        </Text>
      </View>
    </View>
  );
};

const App = () => {
  /** @type {import("datastore").Office[]} */
  const output = useToolOutput();

  if (!output?.offices) {
    return (
      <View padding="size-250">
        <Heading level={1}>Adobe Offices</Heading>
        <Text>Loading offices...</Text>
      </View>
    );
  }
  const { offices } = output;

  return (
    <View padding="size-250">
      <Heading level={1} marginBottom="size-300">
        Adobe Offices
      </Heading>
      <Grid
        columns={{
          base: ["1fr"],
          M: ["1fr", "1fr"],
          L: ["1fr", "1fr", "1fr"],
        }}
        gap="size-300"
      >
        {offices.map((office) => (
          <OfficeCard key={office.id} office={office} />
        ))}
      </Grid>
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
