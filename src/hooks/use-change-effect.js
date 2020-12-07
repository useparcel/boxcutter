import { useEffect, useRef } from "react";
import equals from "array-equal";

export default function useChangeEffect(
  cb,
  changeDependencies = [],
  dependencies = []
) {
  const isFirst = useRef(true);
  const changeDependenciesRef = useRef(changeDependencies);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    if (!equals(changeDependencies, changeDependenciesRef.current)) {
      changeDependenciesRef.current = changeDependencies;
      cb();
    }
  }, [cb, ...changeDependencies, ...dependencies]);
}
