import type { BbPluginApi } from "@get-bb/plugin-sdk";

export default async function plugin(bb: BbPluginApi) {
  bb.storage.database();
  bb.log.info("MyPosts loaded");
}
