import { ClerkProvider } from "@clerk/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppProviders } from "./components/AppProviders";
import "./index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  console.warn(
    "[Auth] VITE_CLERK_PUBLISHABLE_KEY is not set. Sign-in will not work until it is configured."
  );
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={publishableKey || "pk_placeholder"}>
    <AppProviders>
      <App />
    </AppProviders>
  </ClerkProvider>
);
