import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "./i18n";
import { Spinner } from "./components/ui/spinner.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Spinner className="h-8 w-8 text-primary" />

            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              Loading Application...
            </p>
          </div>
        </div>
      }
    >
      <App />
    </Suspense>
  </StrictMode>,
);
