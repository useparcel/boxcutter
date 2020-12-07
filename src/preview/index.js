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
  const parse = useDOMParser();
  const [completeSource, setCompleteSource] = useState({ id: "", html: "" });
  const [derivedMode, setDerivedMode] = useState(mode);
  useEffect(() => {
    if (!parse) return;

    const newDocument = parse(source.html);
    const head = newDocument.querySelector("head");
    for (let css of Object.values(styles)) {
      const style = document.createElement("style");
      head.appendChild(style);
      style.appendChild(document.createTextNode(css));
    }

    for (let js of Object.values(scripts)) {
      const script = document.createElement("script");
      head.appendChild(script);
      script.appendChild(document.createTextNode(`(function() {${js}})()`));
    }

    setCompleteSource({
      id: source.id,
      html: newDocument.outerHTML,
    });
    setDerivedMode(newDocument.querySelector("script") ? "refresh" : "instant");
  }, [parse, source.id, source.html, styles, scripts]);

  /**
   * Get the mode to use - if it's auto, use the derived value
   */
  const finalMode = mode === "auto" ? derivedMode : mode;

  const previewProps = {
    frameId,
    source: completeSource,
    title,
    allow,
    sandbox,
    options,
    setIframe,
    finalMode,
  };

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      <InstantPreview {...previewProps} />
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
        transform: "translate3d(0,0,0)", // create a new stacking context
      }}
    >
      <div
        style={{
          height: max(window.scrollHeight, window.height),
          width: max(window.scrollWidth, window.width),
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
