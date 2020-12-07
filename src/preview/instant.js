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

  useChangeEffect(
    () => {
      setControlledSource(source);
    },
    [source.id],
    [source.id, source.html]
  );

  
  const lastIdRef = useRef()
  useChangeEffect(() => {
    if (isLoading === false) {
      lastIdRef.current = source.id
    }
  }, [isLoading], [isLoading, source.id])
  useEffect(() => {
    if (!dd || !domparser || lastIdRef.current !== source.id) {
      console.log('skip instant update')
      return;
    }
  
    console.log('instant update')
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
      // Diff's isn't working quite right
      //
      // Example:
      // If you add an image:        <img src="https://source.unsplash.com/random" />
      // Remove the end of the tag:  <img src="https://source.unsplash.com/random
      // The image will disappear
      // However you add it back in: <img src="https://source.unsplash.com/random" />
      // The image will not reappear - this problem doesn't happen with the html-update method
      // const diff = dd.diff(domTree.current, newTree);
      // emit("update", diff)

      emit("html-update", source.html);
    }

    domTree.current = newTree;
  }, [source.id, source.html, dd, domparser]);

  return <RefreshPreview source={controlledSource} {...props} />;
}
