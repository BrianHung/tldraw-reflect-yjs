import {
  InstancePresenceRecordType,
  TLAnyShapeUtilConstructor,
  TLRecord,
  TLStoreEventInfo,
  TLStoreWithStatus,
  computed,
  createPresenceStateDerivation,
  createTLStore,
  defaultShapeUtils,
  defaultUserPreferences,
  getUserPreferences,
  react,
  setUserPreferences,
  transact,
} from "tldraw";
import { useEffect, useState } from "react";
import { ReadTransaction } from "@rocicorp/reflect";
import { Reflect } from "@rocicorp/reflect/client";
import groupBy from "lodash/groupBy";
import { M, BatchUpdate } from "../../reflect/mutators";
import jsonpatch, { Operation } from "fast-json-patch";

/**
 * https://github.com/tldraw/tldraw/blob/main/packages/tlschema/src/records/TLRecord.ts
 * https://github.com/tldraw/tldraw/tree/main/packages/tlschema/src/records
 */
const recordTypes = [
  "asset",
  "camera",
  "document",
  "instance",
  "page",
  "instance_page_state",
  "pointer",
  "instance_presence",
  "shape",
];

const recordRegex = new RegExp(`^(${recordTypes.join("|")}):`);

export function useReflectStore({
  reflect,
  shapeUtils = [],
}: {
  reflect: Reflect<M>;
  shapeUtils: TLAnyShapeUtilConstructor[];
}) {
  const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({
    status: "loading",
  });

  useEffect(
    function createReflectStore() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).reflect = reflect;
      setStoreWithStatus({ status: "loading" });

      const userId = reflect.userID;
      const roomId = reflect.roomID;

      const store = createTLStore({
        shapeUtils: defaultShapeUtils.concat(shapeUtils),
        defaultName: `tldraw:${userId}:${roomId}`,
      });

      /**
       * Set of disposables which will be cleaned up on unmount.
       */
      const disposables = new Set<() => void>();

      /**
       * Initialize the store with values from reflect
       * and set store status to be synced.
       */
      const getAllRecords = (tx: ReadTransaction) => tx.scan().values().toArray() as unknown as Promise<TLRecord[]>;

      reflect.query(getAllRecords).then(initialRecords => {
        initialRecords = initialRecords.filter(record => recordRegex.test(record.id));
        store.mergeRemoteChanges(() => store.put(initialRecords));
        setStoreWithStatus({
          store,
          status: "synced-local",
        });
      });

      const clientId = reflect.clientID;
      const presenceId = InstancePresenceRecordType.createId(clientId);

      disposables.add(
        reflect.experimentalWatch(function applyDiffsToStore(diffs) {
          // Filter out presenceId as self presence is locally derived.
          diffs = diffs.filter(diff => diff.key !== presenceId && recordRegex.test(diff.key));
          const { add = [], change = [], del = [] } = groupBy(diffs, diff => diff.op);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const valuesToPut = add.concat(change).map(diff => (diff as any).newValue);
          const keysToRemove = del.map(diff => diff.key);

          try {
            store.mergeRemoteChanges(() => {
              store.put(valuesToPut);
              store.remove(keysToRemove as TLRecord["id"][]);
            });
          } catch (error) {
            setStoreWithStatus({ status: "error", error: error as Error });
          }
        })
      );

      disposables.add(
        store.listen(
          function applyChangesToReflect({ changes }: TLStoreEventInfo) {
            const updatedPatches: Record<string, Operation[]> = {};
            for (const id in changes.updated) {
              const [from, to] = changes.updated[id as TLRecord["id"]];
              updatedPatches[id] = jsonpatch.compare(from, to);
            }
            const batchUpdate: BatchUpdate = {
              added: changes.added,
              removed: Object.keys(changes.removed),
              updated: updatedPatches,
            };
            // Sync document changes to reflect using one transaction / mutation.
            reflect.mutate.updateRecords(batchUpdate);
          },
          {
            source: "user",
            scope: "document",
          }
        )
      );

      disposables.add(
        reflect.subscribeToPresence(async function syncClients(clientIds) {
          // The local user's instance_presence record should not be stored in their local store.
          clientIds = clientIds.filter(id => id !== clientId);
          const instanceIds = clientIds.map(id => InstancePresenceRecordType.createId(id));

          const prevInstanceIds = new Set(
            store.query
              .records("instance_presence")
              .get()
              .map(instance => instance.id)
          );
          const nextInstanceIds = new Set(instanceIds);

          const created = Array.from(nextInstanceIds).filter(id => !prevInstanceIds.has(id));
          const deleted = Array.from(prevInstanceIds).filter(id => !nextInstanceIds.has(id));

          const instances = await Promise.all(created.map(id => reflect.query(tx => tx.get(id))));
          const nextInstances = instances.filter(Boolean).map(instance => InstancePresenceRecordType.create(instance));

          // Don't use mergeRemoteChanges as instance changes need to persist back to reflect.
          transact(() => {
            store.put(nextInstances);
            store.remove(deleted);
          });
        })
      );

      setUserPreferences({ id: clientId });

      const userPreferences = computed<{
        id: string;
        color: string;
        name: string;
      }>("userPreferences", () => {
        const user = getUserPreferences();
        return {
          id: user.id,
          color: user.color ?? defaultUserPreferences.color,
          name: user.name ?? defaultUserPreferences.name,
        };
      });

      // Create the instance presence derivation and set initial value.
      const presenceDerivation = createPresenceStateDerivation(userPreferences, presenceId)(store);
      const presence = presenceDerivation.get();
      if (presence) reflect.mutate.createRecord(presence);

      // When the derivation change, sync presence to reflect.
      disposables.add(
        react("when presence changes", function syncPresenceToReflect() {
          const presence = presenceDerivation.get();
          requestAnimationFrame(() => {
            if (presence) reflect.mutate.createRecord(presence);
          });
        })
      );

      // Sync store status with reflect online status.
      reflect.onOnlineChange = online => {
        setStoreWithStatus(({ store }) =>
          store
            ? {
                store,
                status: online ? "synced-remote" : "synced-local",
                connectionStatus: online ? "online" : "offline",
              }
            : { status: "loading" }
        );
      };
      disposables.add(() => (reflect.onOnlineChange = undefined));

      return () => {
        disposables.forEach(dispose => dispose());
        disposables.clear();
      };
    },
    [reflect]
  );

  return storeWithStatus;
}
