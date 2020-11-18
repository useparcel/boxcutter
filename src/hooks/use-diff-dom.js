import { useState, useEffect } from "react";
import * as d from "diff-dom";

export default function useDiffDOM() {
  const [dd, setDD] = useState();
  useEffect(() => {
    const temp = new d.DiffDOM();
    temp.nodeToObj = d.nodeToObj;
    setDD(temp);
  }, []);

  return dd;
}
