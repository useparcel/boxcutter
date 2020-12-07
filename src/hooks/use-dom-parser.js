import { useState, useEffect, useCallback } from "react";

export default function useDOMParser() {
  const [parser, setParser] = useState();
  useEffect(() => {
    setParser(new DOMParser());
  }, []);

  const parse = useCallback(
    (html = "") => {
      return parser.parseFromString(html, "text/html").documentElement;
    },
    [parser]
  );

  return parser && parse;
}
