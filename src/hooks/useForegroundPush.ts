import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Listens for PUSH_NAVIGATE messages from the Service Worker
 * and routes via React Router. Also nukes any leftover Radix UI
 * body locks that cause "frozen UI" on mobile PWAs.
 */
export function useForegroundPush() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const navHandler = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_NAVIGATE" && event.data.url) {
        // 1. NUKE RADIX UI / SHADCN LEFTOVER LOCKS (CRITICAL FOR MOBILE PWAs)
        document.body.style.pointerEvents = "auto";
        document.body.removeAttribute("data-scroll-locked");
        document.body.style.removeProperty("overflow");
        document.body.style.removeProperty("padding-right");

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
