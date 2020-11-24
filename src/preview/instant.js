import React, { useEffect, useRef, useState } from "react";
import { createIframe, waitUntilEvent } from "./iframe";
import { useBoxcutterInternal, useBoxcutterEvent } from "../context";
import useDOMParser from "../hooks/use-dom-parser";
import useDiffDOM from "../hooks/use-diff-dom";
import RefreshPreview from "./refresh";
import useChangeEffect from "../hooks/use-change-effect";

export default function InstantPreview({ source, ...props }) {
  const dd = useDiffDOM();
  const domparser = useDOMParser();
  const domTree = useRef();
  const { isLoading, set, emit } = useBoxcutterInternal();

  const [controlledSource, setControlledSource] = useState(source);

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
      emit("write", source.html);
    } else {
      const diff = dd.diff(domTree.current, newTree);

      emit("update", diff);
    }

    domTree.current = newTree;
  }, [isLoading, source.id, source.html, dd, domparser]);

  useChangeEffect(
    () => {
      setControlledSource(source);
    },
    [source.id],
    [source.id, source.html]
  );

  return <RefreshPreview source={controlledSource} {...props} />;
}
