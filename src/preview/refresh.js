import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  createIframe,
  waitUntilEvent,
  invisibleIframeStyles,
  defaultIframeStyles,
} from "./iframe";
import { useBoxcutterInternal } from "../context";
import useChangeEffect from "../hooks/use-change-effect";
import { useDebounceCallback } from "@react-hook/debounce";

export default function RefreshPreview({
  frameId,
  source,
  title,
  sandbox,
  allow,
  options,
  setIframe,
}) {
  const iframeRef = useRef();
  const containerRef = useRef();
  const lastSourceId = useRef();
  const { isLoading, set, window } = useBoxcutterInternal();

  /**
   * create the initial iframe
   */
  useEffect(() => {
    if (!iframeRef.current) {
      const iframe = createIframe({ id: frameId });
      containerRef.current.append(iframe);

      iframeRef.current = iframe;
      setIframe(iframeRef.current);
    }

    iframeRef.current.setAttribute("title", title);
    iframeRef.current.setAttribute("sandbox", sandbox);
    iframeRef.current.setAttribute("allow", allow);
    iframeRef.current.publishEvent("setFrameId", frameId);
  }, [frameId, title, sandbox, allow, setIframe]);

  /**
   * Load in content on first load
   */
  useEffect(() => {
    waitUntilEvent(frameId, "DOMContentLoaded")
      .then(() => {
        iframeRef.current.publishEvent("write", source.html);
        return waitUntilEvent(frameId, "load");
      })
      .then(() => {
        setTimeout(() => {
          set((c) => ({ ...c, isLoading: false }));
        }, 1000);
        iframeRef.current.publishEvent("scroll", {
          scrollTop: 0,
          scrollLeft: 0,
        });
      });
  }, []);

  /**
   * update preview handler
   */
  const [rerunValue, setRerunValue] = useState(false);
  const updatePreview = useCallback((context) => {
    const {
      source,
      title,
      sandbox,
      allow,
      isLoading,
      frameId,
      window,
    } = context;
    /**
     * Set the value to be rerun after this load completes
     */
    if (isLoading) {
      return setRerunValue(context);
    }

    set((c) => ({ ...c, isLoading: true }));
    const tempFrameId = `TEMP_${frameId}`;
    const newIframe = createIframe({
      id: tempFrameId,
      style: invisibleIframeStyles,
      title,
      sandbox,
      allow,
    });
    containerRef.current.prepend(newIframe);

    (async () => {
      await waitUntilEvent(tempFrameId, "DOMContentLoaded");

      /**
       * write the new content and wait for it to load in
       */
      newIframe.publishEvent("write", source.html);
      await waitUntilEvent(tempFrameId, "load");

      /**
       * restore the scroll position if the source didn't change
       */
      if (source.id === lastSourceId.current) {
        newIframe.publishEvent("scroll", {
          scrollTop: window.scrollTop,
          scrollLeft: window.scrollLeft,
        });
      }

      /**
       * Swap out the old iframe
       */
      iframeRef.current.remove();
      newIframe.setAttribute("style", defaultIframeStyles);
      newIframe.publishEvent("setFrameId", frameId);
      iframeRef.current = newIframe;
      setIframe(iframeRef.current);

      /**
       * if the source changed, update the last source and scroll to the top
       */
      if (source.id !== lastSourceId.current) {
        lastSourceId.current = source.id;
        iframeRef.current.publishEvent("scroll", {
          scrollTop: 0,
          scrollLeft: 0,
        });
      }
      set((c) => ({ ...c, isLoading: false }));
    })();
  }, []);
  const debouncedUpdatePreview = useDebounceCallback(
    updatePreview,
    options.debounce,
    false
  );

  useChangeEffect(
    () => {
      const context = {
        frameId,
        source: {
          id: source.id,
          html: source.html,
        },
        title,
        sandbox,
        allow,
        isLoading,
        window: {
          scrollTop: window.scrollTop,
          scrollLeft: window.scrollLeft,
        },
      };

      /**
       * When the source id changes, skip the debouncing
       */
      if (source.id !== lastSourceId.current) {
        updatePreview(context);
      } else {
        debouncedUpdatePreview(context);
      }
    },
    [source.id, source.html],
    [
      title,
      sandbox,
      allow,
      isLoading,
      frameId,
      window.scrollTop,
      window.scrollLeft,
      updatePreview,
      debouncedUpdatePreview,
    ]
  );

  /**
   * If onchange is called while it is loading, the change is queued in the
   * state "rerunValue".
   *
   * This effect catches that case and runs updatePreview with the last called valu
   */
  useEffect(() => {
    if (!isLoading && rerunValue) {
      updatePreview({
        ...rerunValue,
        isLoading,
      });
      setRerunValue(false);
    }
  }, [updatePreview, rerunValue, isLoading]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
