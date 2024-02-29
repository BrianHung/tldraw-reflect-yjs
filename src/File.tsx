import { useCallback } from "react";
import {
  Editor,
  InstancePresenceRecordType,
  Tldraw,
  createSessionStateSnapshotSignal,
  loadSessionStateSnapshotIntoStore,
  react,
} from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { useLoaderData } from "react-router-dom";
import { Provider } from "reflect-yjs";
import { Reflect } from "@rocicorp/reflect/client";
import { useReflectStore } from "./hooks/useReflectStore";
import { getUUIDFromShortId } from "./utils/uuid";
import { UrlState } from "./UrlState";

import { CodeBlockShapeTool } from "./shapes/codeblock/CodeBlockShapeTool";
import { CodeBlockShapeUtil } from "./shapes/codeblock/CodeBlockShapeUtil";
import { TextBlockShapeTool } from "./shapes/textblock/TextBlockShapeTool";
import { TextBlockShapeUtil } from "./shapes/textblock/TextBlockShapeUtil";
import { uiOverrides } from "./uiOverrides";
import { M, mutators } from "../reflect/mutators";
import React from "react";
import { YjsContext } from "./hooks/useYjs";
import * as Y from "yjs";

const shapeUtils = [CodeBlockShapeUtil, TextBlockShapeUtil];
const tools = [CodeBlockShapeTool, TextBlockShapeTool];

const server = import.meta.env.VITE_REFLECT_SERVER || "http://localhost:8080";

export const File = React.memo(() => {
  const { user, fileId } = useLoaderData();
  const userId = user.id as string;
  const roomId = getUUIDFromShortId(fileId);

  const reflect = React.useMemo(
    () =>
      new Reflect<M>({
        server,
        userID: userId,
        roomID: roomId,
        mutators,
        kvStore: "idb", // client-side persistence
      }),
    [userId, roomId]
  );

  const store = useReflectStore({ reflect, shapeUtils });

  const yjsContext = React.useMemo(() => {
    const ydoc = new Y.Doc({ gc: true });
    return { ydoc, provider: new Provider(reflect, reflect.roomID, ydoc), roomId: reflect.roomID };
  }, [reflect]);

  const awareness = yjsContext.provider.awareness;
  React.useEffect(
    function syncPresenceToAwareness() {
      return reflect.subscribe(tx => tx.get(InstancePresenceRecordType.createId(reflect.clientID)), {
        onData(presence) {
          // y-codemirror and y-prosemirror use user field for awareness
          if (presence == null) return;
          awareness.setLocalStateField("user", { color: presence.color, name: presence.userName });
        },
      });
    },
    [reflect, awareness]
  );

  const onMount = useCallback(
    function onMount(editor: Editor) {
      editor.user.updateUserPreferences(user);

      const store = editor.store;
      const disposables = new Set<() => void>();

      /**
       * Persist session state in localStorage.
       */
      const session = JSON.parse(localStorage.getItem("TLDRAW_INSTANCE_STATE") || "null");
      if (session) loadSessionStateSnapshotIntoStore(store, session);
      const sessionStateSnapshot = createSessionStateSnapshotSignal(store);
      disposables.add(
        react("when session state changes", function syncSessionStateToLocalStorage() {
          const session = sessionStateSnapshot.get();
          requestAnimationFrame(() => {
            if (session) localStorage.setItem("TLDRAW_INSTANCE_STATE", JSON.stringify(session));
          });
        })
      );

      return () => {
        disposables.forEach(dispose => dispose());
        disposables.clear();
      };
    },
    [user]
  );

  return (
    <YjsContext.Provider value={yjsContext}>
      <div style={{ position: "fixed", inset: 0 }}>
        <Tldraw store={store} autoFocus shapeUtils={shapeUtils} tools={tools} overrides={uiOverrides} onMount={onMount}>
          <UrlState />
        </Tldraw>
      </div>
    </YjsContext.Provider>
  );
});

export default File;
