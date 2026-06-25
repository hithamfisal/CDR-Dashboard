import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./header-clean.css";
import "./upload-clean.css";
// Imported last: project-wide visual parameter control layer for all tabs and UI elements.
import "./styles/design-control.css";
// Imported after all legacy layers: proposal-based design system overrides.
import "./styles/design-proposals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
