const en = {
  appTitle: "MyPosts",
  loading: "Loading…",
  error: "Error",
  retry: "Retry",
  statusDraft: "Draft",
  statusWriting: "Agent writing",
  statusReady: "Ready",
  statusPublished: "Published",
  settings: "Settings",
  language: "Language",
  back: "Back",
};

const ru: Record<keyof typeof en, string> = {
  appTitle: "MyPosts",
  loading: "Загрузка…",
  error: "Ошибка",
  retry: "Повторить",
  statusDraft: "Черновик",
  statusWriting: "Агент пишет",
  statusReady: "Готов",
  statusPublished: "Опубликован",
  settings: "Настройки",
  language: "Язык",
  back: "Назад",
};

export const core = { en, ru };
