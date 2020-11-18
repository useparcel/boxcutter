import React, { useCallback, useEffect, useRef, useState } from "react";
import useLayoutEffect from "@react-hook/passive-layout-effect";
import PropTypes from "prop-types";
import { useBoxcutterInternal } from "../context";
import { max } from "../utils";
import InstantPreview from "./instant";
import RefreshPreview from "./refresh";
import useDOMParser from "../hooks/use-dom-parser";

export function Preview({ style, className, children }) {
  const {
    frameId,
    title,
    allow,
    sandbox,
    options,
    mode,
    setIframe,
    source,
    scripts,
    styles,
    isLoading,
    set,
  } = useBoxcutterInternal();

  /**
   * set the HTML content with the script and styles injected
   */
  const domparser = useDOMParser();
  const [completeHTML, setCompleteHTML] = useState("");
  const [derivedMode, setDerivedMode] = useState(mode);
  useEffect(() => {
    if (!domparser) return;

    const newDocument = domparser.parseFromString(
      source.html || "",
      "text/html"
    ).documentElement;

    const head = newDocument.querySelector("head");
    for (let css of Object.values(styles)) {
      const style = document.createElement("style");
      head.appendChild(style);
      style.appendChild(document.createTextNode(css));
    }

    for (let js of Object.values(scripts)) {
      const script = document.createElement("script");
      head.appendChild(script);
      script.appendChild(document.createTextNode(js));
    }

    setCompleteHTML(newDocument.outerHTML);
    setDerivedMode(newDocument.querySelector("script") ? "refresh" : "instant");
  }, [domparser, source.html, styles, scripts]);

  /**
   * Get the mode to use - if it's auto, use the derived value
   */
  const finalMode = mode === "auto" ? derivedMode : mode;

  /**
   * Set isLoading to true when switching contexts
   */
  useEffect(() => {
    set((c) => ({ ...c, isLoading: true }));
  }, [finalMode]);

  const previewProps = {
    frameId,
    source: {
      id: source.id,
      html: completeHTML,
    },
    title,
    allow,
    sandbox,
    options,
    setIframe,
  };

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      {finalMode === "instant" && <InstantPreview {...previewProps} />}
      {finalMode === "refresh" && <RefreshPreview {...previewProps} />}
      <OverlayContainer>{children}</OverlayContainer>
    </div>
  );
}

function OverlayContainer({ children }) {
  const ref = useRef();
  const { window } = useBoxcutterInternal();

  useLayoutEffect(() => {
    ref.current.scrollTop = window.scrollTop;
  }, [window.scrollTop]);

  useLayoutEffect(() => {
    ref.current.scrollLeft = window.scrollLeft;
  }, [window.scrollLeft]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        height: "100%",
        width: "100%",
        top: 0,
        left: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: max(window.scrollHeight, window.height),
          width: max(window.scrollWidth, window.width),
          border: "3px solid blue",
          boxSizing: "border-box",
          minHeight: "100%",
          minWidth: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}

Preview.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
};
