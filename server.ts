import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { registerRpc, type ChangedPayload } from "./src/server/rpc";
import { agentConfiguration, createSessions } from "./src/server/sessions";
import { MIGRATIONS, Store } from "./src/server/store";
import { registerTools } from "./src/server/tools";
import { MP_CHANGED } from "./src/shared/contract";

export default async function plugin(bb: BbPluginApi) {
  const db = bb.storage.database();
  bb.storage.migrate(db, MIGRATIONS);
  const store = new Store(db);
  const changed = (payload: ChangedPayload) => bb.realtime.publish(MP_CHANGED, payload);
  registerTools(bb, store, changed);
  const sessions = createSessions(bb, store);
  registerRpc(bb, store, sessions, changed);
  bb.agents.configure((context) => agentConfiguration(store, context));
  bb.log.info("MyPosts loaded");
}
