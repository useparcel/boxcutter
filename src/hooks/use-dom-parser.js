import { useState, useEffect } from "react";

export default function useDOMParser() {
  const [parser, setParser] = useState();
  useEffect(() => {
    setParser(new DOMParser());
  }, []);

  return parser;
}
