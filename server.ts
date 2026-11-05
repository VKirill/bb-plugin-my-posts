import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { noopSessions, registerRpc, type ChangedPayload } from "./src/server/rpc";
import { MIGRATIONS, Store } from "./src/server/store";
import { MP_CHANGED } from "./src/shared/contract";

export default async function plugin(bb: BbPluginApi) {
  const db = bb.storage.database();
  bb.storage.migrate(db, MIGRATIONS);
  const store = new Store(db);
  const changed = (payload: ChangedPayload) => bb.realtime.publish(MP_CHANGED, payload);
  registerRpc(bb, store, noopSessions, changed);
  bb.log.info("MyPosts loaded");
}
