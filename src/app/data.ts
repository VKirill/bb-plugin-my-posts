import { useCallback, useEffect, useRef, useState } from "react";
import {
  useRealtime,
  useRealtimeConnectionState,
  useRpc,
  type PluginRealtimeConnectionState,
} from "@get-bb/plugin-sdk/app";
import { MP_CHANGED, type RpcContract } from "../shared/contract";
import type { Platform } from "../shared/model";

export function isReconnect(
  prev: PluginRealtimeConnectionState | null,
  next: PluginRealtimeConnectionState,
): boolean {
  return prev === "reconnecting" && next === "connected";
}

export function useMpRpc() {
  return useRpc<RpcContract>();
}

export interface QueryState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

export function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export function useQuery<T>(
  key: string,
  match: { profileId?: string; postId?: string } | null,
  load: () => Promise<T>,
  enabled = true,
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const loadRef = useRef(load);
  loadRef.current = load;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const generation = useRef(0);
  const conn = useRealtimeConnectionState();
  const prevConn = useRef<PluginRealtimeConnectionState | null>(null);

  const refetch = useCallback(() => {
    if (!enabledRef.current) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const current = ++generation.current;
    setLoading(true);
    loadRef.current().then(
      (value) => {
        if (current !== generation.current) return;
        setData(value);
        setError(null);
        setLoading(false);
      },
      (cause: unknown) => {
        if (current !== generation.current) return;
        setError(errorText(cause));
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    setData(null);
    refetch();
  }, [key, refetch, enabled]);

  useEffect(() => {
    if (isReconnect(prevConn.current, conn)) refetch();
    prevConn.current = conn;
  }, [conn, refetch]);

  useRealtime(MP_CHANGED, (payload) => {
    if (!enabledRef.current) return;
    if (match === null) {
      refetch();
      return;
    }
    const changed =
      typeof payload === "object" && payload !== null
        ? (payload as { profileId?: unknown; postId?: unknown })
        : {};
    const profileId = typeof changed.profileId === "string" ? changed.profileId : null;
    const postId = typeof changed.postId === "string" ? changed.postId : null;
    if (profileId === null && postId === null) {
      refetch();
      return;
    }
    if (match.profileId !== undefined && profileId === match.profileId) refetch();
    else if (match.postId !== undefined && postId === match.postId) refetch();
  });

  return { data, error, loading, refetch };
}

export function useProfiles() {
  const rpc = useMpRpc();
  return useQuery("profiles", null, () => rpc.call("profiles_list", null));
}

export function useProfile(id: string | null) {
  const rpc = useMpRpc();
  return useQuery(
    id === null ? "profile:" : `profile:${id}`,
    id === null ? { profileId: "" } : { profileId: id },
    () => rpc.call("profile_get", { id: id as string }),
    id !== null,
  );
}

export function usePosts(profileId: string | null, platform?: Platform) {
  const rpc = useMpRpc();
  return useQuery(
    `posts:${profileId ?? ""}:${platform ?? ""}`,
    profileId === null ? { profileId: "" } : { profileId },
    () =>
      rpc.call(
        "posts_list",
        platform === undefined ? { profileId: profileId as string } : { profileId: profileId as string, platform },
      ),
    profileId !== null,
  );
}

export function usePost(id: string) {
  const rpc = useMpRpc();
  return useQuery(`post:${id}`, { postId: id }, () => rpc.call("post_get", { id }));
}

export function useSettings() {
  const rpc = useMpRpc();
  return useQuery("settings", null, () => rpc.call("settings_get", null));
}
