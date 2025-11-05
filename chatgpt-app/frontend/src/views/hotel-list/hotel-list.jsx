import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  defaultTheme,
  Provider as SpectrumProvider,
} from "@adobe/react-spectrum";
import "./hotel-list.css";

import { Heading, View } from "@adobe/react-spectrum";
import { useState, useEffect } from "react";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  timeZoneName: "short",
});
/**
 * @param {number} now - The UTC time in milliseconds.
 */
const formatTime = (now) => {
  return timeFormatter.format(now);
};

const useNow = () => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
};

const App = () => {
  const now = useNow();

  return (
    <View>
      <Heading>Hello, World! It is {formatTime(now)}</Heading>
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
