import { useEffect } from "react";
import md5 from "md5";
import { useBoxcutterInternal } from "../context";
import { omit } from "../utils";

export function Style({ children }) {
  const { set } = useBoxcutterInternal();

  useEffect(() => {
    const id = md5(children);

    set((s) => ({
      ...s,
      styles: {
        ...s.styles,
        [id]: children,
      },
    }));

    return () => {
      set((s) => ({
        ...s,
        styles: omit(s.styles, id),
      }));
    };
  }, [set, children]);

  return null;
}
