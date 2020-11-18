import { useContext, createContext } from "react";
import useFrameEvent from "./hooks/use-frame-event";
import { omit } from "./utils";

export const BoxcutterContext = createContext();

export function useBoxcutterInternal() {
  return useContext(BoxcutterContext);
}

export function useBoxcutter() {
  const context = useContext(BoxcutterContext);

  return omit(context, ["set", "frameId", "styles", "scripts"]);
}

export function useBoxcutterEvent(name, callback) {
  const { frameId } = useBoxcutterInternal();

  useFrameEvent(frameId, name, callback);
}
