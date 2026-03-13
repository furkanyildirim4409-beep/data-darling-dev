import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Listens for PUSH_NAVIGATE messages from the Service Worker and
 * performs a clean React Router navigation after nuking any leftover
 * Radix UI / shadcn body locks that freeze mobile PWA webviews.
 */
export function useForegroundPush() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const navHandler = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_NAVIGATE" && event.data.url) {
        // 1. NUKE RADIX UI / SHADCN LEFTOVER LOCKS
        document.body.style.pointerEvents = "auto";
        document.body.removeAttribute("data-scroll-locked");

        // 2. Route smoothly on the next paint
        requestAnimationFrame(() => {
          navigate(event.data.url);
        });
      }
    };

    navigator.serviceWorker.addEventListener("message", navHandler);
    return () => navigator.serviceWorker.removeEventListener("message", navHandler);
  }, [navigate]);
}
