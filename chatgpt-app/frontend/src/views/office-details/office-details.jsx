import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  Heading,
  defaultTheme,
  Provider as SpectrumProvider,
  View,
} from "@adobe/react-spectrum";
import "./office-details.css";

const App = () => {
  return (
    <View padding="size-250">
      <Heading>Office Details</Heading>
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
