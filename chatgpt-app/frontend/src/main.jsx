import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  defaultTheme,
  Provider as SpectrumProvider,
} from "@adobe/react-spectrum";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SpectrumProvider theme={defaultTheme}>
      <App />
    </SpectrumProvider>
  </StrictMode>
);
