import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import App from "./App";
import { isChunkLoadError } from "./components/ErrorBoundary";

// Après un déploiement, les anciens chunks chargés dynamiquement n'existent plus.
// On recharge la page une seule fois pour récupérer le nouveau bundle.
const reloadOnce = () => {
  const key = "chunk-reload-attempted";
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, "1");
    window.location.reload();
  }
};
window.addEventListener("unhandledrejection", (event) => {
  if (isChunkLoadError(event.reason)) reloadOnce();
});
window.addEventListener("error", (event) => {
  if (isChunkLoadError(event.error || event.message)) reloadOnce();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((registration) => {
      // Force la vérification d'une nouvelle version du SW à chaque visite
      registration.update().catch(() => {});
    }).catch(() => {});
  });
}
