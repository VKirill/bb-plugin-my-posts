export const STORAGE_KEYS = {
  lastProfile: "my-posts:last-profile-id",
  chatWidth: "my-posts.chatWidth",
} as const;

export function readStored(key: string): string | null {
  try {
    const value = globalThis.localStorage?.getItem(key);
    return value === undefined ? null : value;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // storage unavailable
  }
}
