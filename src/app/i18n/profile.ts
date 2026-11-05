const en = {
  profileEmptyTitle: "No style profile yet",
  profileEmptyHint: "Create a profile so an agent can copy an author's voice.",
  createProfileTitle: "New profile",
  createProfileHint: "A profile is built from a link or from texts. This screen is a stub.",
};

const ru: Record<keyof typeof en, string> = {
  profileEmptyTitle: "Профиля стиля пока нет",
  profileEmptyHint: "Создайте профиль, чтобы агент снял голос автора.",
  createProfileTitle: "Новый профиль",
  createProfileHint: "Профиль собирается по ссылке или по текстам. Этот экран — заглушка.",
};

export const profile = { en, ru };
