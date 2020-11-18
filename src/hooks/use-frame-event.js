import { useEffect, useRef } from "react";
import { supportsPassiveEvents } from "detect-passive-events";

const EVENT_LISTENER_OPTIONS = supportsPassiveEvents
  ? { passive: true }
  : false;

export default function useFrameEvent(frameId, name, callback) {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function handler(event) {
      if (event.data.name === name && event.data.frameId === frameId) {
        savedCallback.current(event.data.data);
      }
    }
    window.addEventListener("message", handler, EVENT_LISTENER_OPTIONS);

    return () => window.removeEventListener("message", handler);
  }, [frameId, name]);
}
