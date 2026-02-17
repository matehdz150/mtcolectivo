import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.scss";
import { Toaster } from "sileo";

createRoot(document.getElementById("root")).render(
  <>
    <Toaster
      position="top-center"
      offset={16}
      options={{
        fill: "#171717",
        roundness: 18,
        styles: {
          title: "sileo-dark",
          description: "sileo-dark",
        },
        autopilot: {
          expand: 500,
          collapse: 3000,
        },
      }}
    />
    <App />
  </>,
);
