import { useState, useEffect } from "react";

export default function useDiffDOM() {
  const [dd, setDD] = useState();
  useEffect(() => {
    const d = require("diff-dom");
    const temp = new d.DiffDOM();
    temp.nodeToObj = d.nodeToObj;
    setDD(temp);
  }, []);

  return dd;
}
