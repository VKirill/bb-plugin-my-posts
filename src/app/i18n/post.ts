const en = {
  postStubTitle: "Post",
  postStubHint: "The post editor is not in this build.",
  editDirectiveHint: "Edit proposal",
};

const ru: Record<keyof typeof en, string> = {
  postStubTitle: "Пост",
  postStubHint: "Редактор поста в этой сборке ещё не подключён.",
  editDirectiveHint: "Предложение правки",
};

export const post = { en, ru };
