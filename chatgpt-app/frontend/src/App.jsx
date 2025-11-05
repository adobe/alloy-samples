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
    <div>
      <h1>Hello, World! It is {formatTime(now)}</h1>
    </div>
  );
};

export default App;
