import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "./i18n";
import FullscreenLoader from "./components/ui/fullscreenLoader.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense
      fallback={<FullscreenLoader />}
    >
      <App />
    </Suspense>
  </StrictMode>,
);
