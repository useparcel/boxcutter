import React, { useEffect, useRef, useState } from "react";
import { createIframe, waitUntilEvent } from "./iframe";
import { useBoxcutterInternal, useBoxcutterEvent } from "../context";
import RefreshPreview from "./refresh";
import useChangeEffect from "../hooks/use-change-effect";

export default function InstantPreview({ source, finalMode, ...props }) {
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
  useChangeEffect(
    () => {
      if (!isLoading) {
        isSourceChange.current = false;

        if (finalMode === "instant") {
          emit("html-update", source.html);
        }
      }
    },
    [isLoading],
    [source.html, finalMode]
  );

  /**
   * Do the instant update when:
   * - mode is instant
   * - the iframe isn't loading
   * - the source.id isn't changing
   */
  useEffect(() => {
    if (finalMode !== "instant" || isLoading || isSourceChange.current) {
      return;
    }

    emit("html-update", source.html);
  }, [source.id, source.html, finalMode]);

  /**
   * Do refresh update when:
   * - mode is refresh
   */
  useEffect(() => {
    if (finalMode !== "refresh") {
      return;
    }

    setControlledSource(source);
  }, [source.id, source.html, finalMode]);

  return <RefreshPreview source={controlledSource} {...props} />;
}
