import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyThemeColor, loadStoredTheme } from "./lib/theme";

applyThemeColor(loadStoredTheme());

createRoot(document.getElementById("root")!).render(<App />);
