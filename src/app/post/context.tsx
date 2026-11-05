import { createContext, useContext } from "react";
import type { Post, Proposal } from "../../shared/model";
import type { QueryState } from "../data";

export interface PostScreen {
  post: Post;
  proposals: Proposal[];
  refetch: QueryState<unknown>["refetch"];
}

export const PostScreenContext = createContext<PostScreen | null>(null);

export function usePostScreen(): PostScreen | null {
  return useContext(PostScreenContext);
}
