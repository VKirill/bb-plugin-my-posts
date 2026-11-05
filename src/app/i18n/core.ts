const en = {
  appTitle: "MyPosts",
  loading: "Loading…",
  error: "Error",
  retry: "Retry",
  platformTelegram: "Telegram",
  platformDzen: "Dzen",
  platformVk: "VK",
  platformX: "X",
  statusDraft: "Draft",
  statusWriting: "Agent writing",
  statusReady: "Ready",
  statusPublished: "Published",
};

const ru: Record<keyof typeof en, string> = {
  appTitle: "MyPosts",
  loading: "Загрузка…",
  error: "Ошибка",
  retry: "Повторить",
  platformTelegram: "Telegram",
  platformDzen: "Дзен",
  platformVk: "ВКонтакте",
  platformX: "X",
  statusDraft: "Черновик",
  statusWriting: "Агент пишет",
  statusReady: "Готов",
  statusPublished: "Опубликован",
};

export const core = { en, ru };
