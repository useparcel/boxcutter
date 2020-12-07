import React, { useEffect, useRef, useState } from "react";
import { createIframe, waitUntilEvent } from "./iframe";
import { useBoxcutterInternal, useBoxcutterEvent } from "../context";
import useDOMParser from "../hooks/use-dom-parser";
// import useDiffDOM from "../hooks/use-diff-dom";
import RefreshPreview from "./refresh";
import useChangeEffect from "../hooks/use-change-effect";

// `update` Diff's isn't working quite right so we are using `html-update`
// for now
//
// Example:
// If you add an image:        <img src="https://source.unsplash.com/random" />
// Remove the end of the tag:  <img src="https://source.unsplash.com/random
// The image will disappear
// However you add it back in: <img src="https://source.unsplash.com/random" />
// The image will not reappear - this problem doesn't happen with the html-update method

export default function InstantPreview({ source, ...props }) {
  // const dd = useDiffDOM();
  const parse = useDOMParser();
  const domTree = useRef();
  const { isLoading, set, emit } = useBoxcutterInternal();

  /**
   * We "control" the source so we only pass the updated html to
   * the RefreshPreview component when the source.id changes.
   * That way when the source.id changes we do a full iframe refresh
   * but when just the html changes we do just a diff update.
   */
  const isSourceChange = useRef(false);
  const [controlledSource, setControlledSource] = useState(source);

  /**
   * When the source.id changes, update the controlled source and block
   * the instant update
   */
  useChangeEffect(
    () => {
      isSourceChange.current = true;
      setControlledSource(source);
    },
    [source.id],
    [source.id, source.html]
  );

  /**
   * Unblock the instant updates when the iframe finishes loading
   */
  useEffect(() => {
    if (!isLoading) {
      isSourceChange.current = false;
    }
  }, [isLoading]);

  /**
   * Do the instant update when the iframe isn't loading and the source.id
   * isn't changing
   */
  useEffect(() => {
    if (isLoading /*|| !dd*/ || !parse || isSourceChange.current) {
      return;
    }

    // const newTree = dd.nodeToObj(
    //   parse(source.html)
    // );

    /**
     * If we don't have an old DOM, do a full write.
     * Otherwise, just send the iframe the diff to be applied
     */
    if (!domTree.current) {
      emit("write", source.html);
    } else {
      // const diff = dd.diff(domTree.current, newTree);
      // emit("update", diff)

      emit("html-update", source.html);
    }

    // domTree.current = newTree;
  }, [source.id, source.html, /*dd,*/ parse]);

  return <RefreshPreview source={controlledSource} {...props} />;
}
