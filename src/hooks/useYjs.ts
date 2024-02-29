import React from "react";
import * as Y from "yjs";

export const YjsContext = React.createContext<YjsContextType | undefined>(undefined);

interface YjsContextType {
  ydoc: Y.Doc;
  provider: any;
  undoManager?: Y.UndoManager;
  roomId: string;
}

/**
 * Creates a Yjs document and provider for a given type and id.
 * @param options
 * @returns
 */
export function useYjs(selector: (context: YjsContextType) => any = x => x, deps: any[] = []) {
  const context = React.useContext(YjsContext);
  if (context === undefined) {
    throw new Error("useYjs must be used within a YjsProvider");
  }
  return React.useMemo(() => selector(context), deps);
}
