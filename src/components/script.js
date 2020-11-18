import { useEffect } from "react";
import md5 from "md5";
import { useBoxcutterInternal } from "../context";
import { omit } from "../utils";

export function Script({ children }) {
  const { set } = useBoxcutterInternal();

  useEffect(() => {
    const id = md5(children);

    set((s) => ({
      ...s,
      scripts: {
        ...s.scripts,
        [id]: children,
      },
    }));

    return () => {
      set((s) => ({
        ...s,
        scripts: omit(s.scripts, id),
      }));
    };
  }, [set, children]);

  return null;
}
