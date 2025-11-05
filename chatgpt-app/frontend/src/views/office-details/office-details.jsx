import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  defaultTheme,
  Provider as SpectrumProvider,
} from "@adobe/react-spectrum";
import "./office-details.css";

import { Heading, View, Content, Text } from "@adobe/react-spectrum";
import { useState } from "react";

const App = () => {
  const [office, setOffice] = useState(null);

  return (
    <View padding="size-250">
      <Heading level={1}>Office Details</Heading>
      <Content>
        <Text>Office details will be displayed here</Text>
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
