import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtime, useRpc } from "@get-bb/plugin-sdk/app";
import type { RpcContract } from "../shared/contract";
import { MP_CHANGED } from "../shared/events";
import type { Platform } from "../shared/model";

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
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;
  const generation = useRef(0);

  const refetch = useCallback(() => {
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
  }, [key, refetch]);

  useRealtime(MP_CHANGED, (payload) => {
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

export function useProfile(id: string) {
  const rpc = useMpRpc();
  return useQuery(`profile:${id}`, { profileId: id }, () => rpc.call("profile_get", { id }));
}

export function usePosts(profileId: string, platform?: Platform) {
  const rpc = useMpRpc();
  return useQuery(`posts:${profileId}:${platform ?? ""}`, { profileId }, () =>
    rpc.call("posts_list", platform === undefined ? { profileId } : { profileId, platform }),
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
