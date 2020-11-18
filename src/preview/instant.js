import React, { useEffect, useRef } from "react";
import { createIframe, waitUntilEvent } from "./iframe";
import { useBoxcutterInternal, useBoxcutterEvent } from "../context";
import useDOMParser from "../hooks/use-dom-parser";
import useDiffDOM from "../hooks/use-diff-dom";

export default function InstantPreview({
  frameId,
  source,
  title,
  sandbox,
  allow,
  setIframe,
}) {
  const iframeRef = useRef();
  const containerRef = useRef();
  const dd = useDiffDOM();
  const domparser = useDOMParser();
  const domTree = useRef();
  const { isLoading, set } = useBoxcutterInternal();

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
   * Write the initial content
   */
  useEffect(() => {
    waitUntilEvent(frameId, "DOMContentLoaded").then(() => {
      iframeRef.current.publishEvent("write", source.html);
      set((c) => ({ ...c, isLoading: false }));
      iframeRef.current.publishEvent("scroll", {
        scrollTop: 0,
        scrollLeft: 0,
      });
    });
  }, []);

  /**
   * scroll to top and reset dom tree when the source changes
   *
   * the preview handler will also be triggered and it will write the html
   */
  useEffect(() => {
    if (iframeRef.current) {
      domTree.current = null;
      iframeRef.current.publishEvent("scroll", {
        scrollTop: 0,
        scrollLeft: 0,
      });
    }
  }, [source.id]);

  /**
   * update preview handler
   */
  useEffect(() => {
    if (isLoading || !dd || !domparser) {
      return;
    }

    const newTree = dd.nodeToObj(
      domparser.parseFromString(source.html, "text/html").documentElement
    );

    /**
     * If we don't have an old DOM, do a full write.
     * Otherwise, just send the iframe the diff to be applied
     */
    if (!domTree.current) {
      iframeRef.current.publishEvent("write", source.html);
    } else {
      const diff = dd.diff(domTree.current, newTree);

      iframeRef.current.publishEvent("update", diff);
    }

    domTree.current = newTree;
  }, [isLoading, source.id, source.html, dd, domparser]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
