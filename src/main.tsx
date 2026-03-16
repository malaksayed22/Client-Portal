import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";
import App from "./App.tsx";
import { queryClient } from "./lib/queryClient";
import "./styles/globals.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

const appContent = (
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: {
          fontFamily: "Tajawal, sans-serif",
          fontSize: "14px",
          maxWidth: "min(400px, calc(100vw - 32px))",
          direction: "rtl",
        },
        success: {
          iconTheme: {
            primary: "#10B981",
            secondary: "#FFFFFF",
          },
        },
        error: {
          iconTheme: {
            primary: "#EF4444",
            secondary: "#FFFFFF",
          },
        },
      }}
    />
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        {appContent}
      </GoogleOAuthProvider>
    ) : (
      appContent
    )}
  </StrictMode>,
);
