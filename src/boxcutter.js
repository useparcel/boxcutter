import React, { useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { BoxcutterContext } from "./context";
import useFrameEvent from "./hooks/use-frame-event";
import { deserializeError } from "serialize-error";
import md5 from "md5";

export function Boxcutter({
  title,
  source,
  mode = "auto",
  allow = "accelerometer 'none';autoplay 'none';camera 'none';document-domain 'none';encrypted-media 'none';fullscreen 'none';geolocation 'none';gyroscope 'none';magnetometer 'none';microphone 'none';midi 'none';payment 'none';picture-in-picture 'none';sync-xhr 'none';usb 'none';xr-spatial-tracking 'none';",
  sandbox = "allow-scripts allow-forms allow-popups allow-modals",
  children,
  options,
}) {
  const frameId = useRef(`frame-${md5(title)}`).current;

  const [context, setContext] = useState({
    isLoading: true,
    styles: {},
    scripts: {},
  });
  options = {
    debounce: 250,
    ...options,
  };

  /**
   * iframe ref
   */
  const iframeRef = useRef();
  const setIframe = useCallback((iframe) => {
    iframeRef.current = iframe;
  }, []);

  /**
   * iframe size
   */
  const [size, setSize] = useState({
    isResizing: false,
    height: 0,
    width: 0,
    scrollHeight: 0,
    scrollWidth: 0,
  });
  const onResize = useCallback(
    (data) => {
      setSize(data);
    },
    [setSize]
  );
  useFrameEvent(frameId, "resize", onResize);

  /**
   * Mouse position
   */
  const [mouse, setMouse] = useState({
    target: null,
    event: null,
    x: null,
    y: null,
  });
  const onMouseEvent = useCallback(
    (data) => {
      setMouse(data);
    },
    [setMouse]
  );
  useFrameEvent(frameId, "mousemove", onMouseEvent);
  useFrameEvent(frameId, "mouseleave", onMouseEvent);
  useFrameEvent(frameId, "click", onMouseEvent);

  /**
   * Scroll
   */
  const [scroll, setScroll] = useState({
    scrollTop: 0,
    scrollLeft: 0,
  });
  const onScroll = useCallback(
    (data) => {
      setScroll(data);
    },
    [setScroll]
  );
  useFrameEvent(frameId, "scroll", onScroll);

  /**
   * Call boxcutter function inside of preview
   */
  const callBoxcutterFunction = useCallback(
    (name, data) => {
      return new Promise((resolve, reject) => {
        const generatedRunId = Math.random() + "";

        if (!iframeRef.current) {
          resolve();
        }

        /**
         * Publish the run request
         */
        iframeRef.current.publishEvent(`fn:${name}`, data, generatedRunId);

        /**
         * Wait for the response from the frame and resolve or reject this promise
         */
        function handler(event) {
          if (
            event.data.runId !== generatedRunId ||
            event.data.frameId !== frameId
          ) {
            return;
          }

          const { name, data } = event.data;

          if (name === "resolve") {
            resolve(data);
          } else {
            /**
             * Translate the data into an error
             */
            const error = deserializeError(data);

            reject(error.constructor.name === "NonError" ? data : error);
          }

          window.removeEventListener("message", handler);
        }

        window.addEventListener("message", handler);
      });
    },
    [frameId]
  );

  /**
   * Emit boxcutter event inside of preview
   */
  const emitBoxcutterEvent = useCallback((name, data) => {
    if (!iframeRef.current) {
      return;
    }

    iframeRef.current.publishEvent(name, data);
  }, []);

  return (
    <BoxcutterContext.Provider
      value={{
        id: source.id,
        ...context,
        mouse,
        window: {
          ...size,
          ...scroll,
        },
        call: callBoxcutterFunction,
        emit: emitBoxcutterEvent,
        // internal only
        set: setContext,
        frameId,
        mode,
        title,
        allow,
        sandbox,
        options,
        setIframe,
        source,
      }}
    >
      {children}
    </BoxcutterContext.Provider>
  );
}

Boxcutter.propTypes = {
  title: PropTypes.string.isRequired,
  source: PropTypes.shape({
    id: PropTypes.string.isRequired,
    html: PropTypes.string.isRequired,
  }).isRequired,
  mode: PropTypes.oneOf(["instant", "refresh", "auto"]),
  sandbox: PropTypes.string,
  allow: PropTypes.string,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
  options: PropTypes.shape({
    debounce: PropTypes.number,
  }),
};
