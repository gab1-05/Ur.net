import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

const apiBase =
  import.meta.env.VITE_API_BASE_URL ??
  `${location.origin}${(import.meta.env.BASE_URL || "/").replace(/\/$/, "")}`;

setBaseUrl(apiBase);

createRoot(document.getElementById("root")!).render(<App />);
