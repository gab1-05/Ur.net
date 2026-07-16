import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

const apiBase = import.meta.env.VITE_API_SERVER_URL ?? "http://localhost:3000";

console.log("[app] API base:", apiBase);
setBaseUrl(apiBase);

createRoot(document.getElementById("root")!).render(<App />);
