import { useEffect, useState } from "react";

export default function useChangeEffect(
  cb,
  changeDependencies = [],
  dependencies = []
) {
  const [isFirst, setIsFirst] = useState(true);
  const [shouldRerun, setShouldRerun] = useState(false);
  useEffect(() => {
    if (isFirst) {
      setIsFirst(false);
    } else {
      setShouldRerun(true);
    }
  }, [isFirst, ...changeDependencies]);

  useEffect(() => {
    if (shouldRerun) {
      setShouldRerun(false);
      cb();
    }
  }, [cb, shouldRerun, ...changeDependencies, ...dependencies]);
}
