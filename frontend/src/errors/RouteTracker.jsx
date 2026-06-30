import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    // Stash the scroll position before leaving the current page
    const handleScroll = () => {
      sessionStorage.setItem(`scroll_pos_${location.pathname}`, window.scrollY.toString());
    };

    window.addEventListener("scroll", handleScroll);

    // Track the navigation flow
    const current = sessionStorage.getItem("current_route");
    if (current && current !== location.pathname) {
      sessionStorage.setItem("previous_route", current);
    }
    sessionStorage.setItem("current_route", location.pathname);

    // Attempt to restore scroll position if returning
    const savedScroll = sessionStorage.getItem(`scroll_pos_${location.pathname}`);
    if (savedScroll) {
      setTimeout(() => {
        window.scrollTo({
          top: parseInt(savedScroll, 10),
          behavior: "instant"
        });
      }, 50);
    }

    // Handle active network connection statuses
    const handleOffline = () => {
      window.location.href = "/error/offline";
    };

    window.addEventListener("offline", handleOffline);

    if (!navigator.onLine && location.pathname !== "/error/offline") {
      window.location.href = "/error/offline";
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("offline", handleOffline);
    };
  }, [location]);

  return null;
}
