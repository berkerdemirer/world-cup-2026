import { useSyncExternalStore } from "react";

/** True after the component has mounted in the browser. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
