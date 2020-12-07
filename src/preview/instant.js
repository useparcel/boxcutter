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
  const isDoingRefresh = useRef(false);

  useChangeEffect(
    () => {
      setControlledSource(source);
      isDoingRefresh.current = true;
    },
    [source.id],
    [source.id, source.html]
  );

  /**
   * update preview handler
   *
   * 
   * When the source.id is change a full refresh should take place `isLoading`
   * takes a tick to update since the child is the one updating it (At least 
   * I think that's the reason). Regardless, if we don't wrap this "instant"
   * update in a requestAnimationFrame then it will fire before `isLoading` is 
   * set to true and it'll mix the old source's conten with the new - that's bad.
   *
   *
   * To combat this we do the update after the next animation frame. If `isLoading`
   * is then set to `true` we cancel it and do an early return to prevent a new
   * instant update timer from being created.
   */
  const doUpdateTimeoutRef = useRef()
  useEffect(() => {
    if (isLoading || !dd || !domparser) {
      console.log('clear timeout')
      return clearTimeout(doUpdateTimeoutRef.current)
    }
    doUpdateTimeoutRef.current = setTimeout(() => {
      console.log('timeout')
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
    })
  }, [isDoingRefresh, isLoading, source.id, source.html, dd, domparser]);

  return <RefreshPreview source={controlledSource} {...props} />;
}
