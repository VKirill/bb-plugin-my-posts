# MyPosts

A BB plugin for style profiles and posts. An agent copies an author's voice (`style-portrait`); a copywriter agent writes Telegram, Dzen, VK and X posts in that voice (`writing-in-style`).

English is the default interface language; Russian is included.

## Screens

Approved layout (prototype A2):

- Telegram post: [design/screens/a2-tg.png](design/screens/a2-tg.png)
- X thread: [design/screens/a2-x.png](design/screens/a2-x.png)

The clickable prototype is [design/prototype-a2.html](design/prototype-a2.html). Notes: [design/README.md](design/README.md).

## Install

```
bb plugin install git:https://github.com/VKirill/bb-plugin-my-posts.git
```

## Develop

```
npm ci
npm run typecheck
npm test
bb plugin build .
```

## Credits

The skills in `skills/style-portrait` and `skills/writing-in-style` are by Vyacheslav Startsev, https://github.com/vyacheslav-startsev/claude-plugins, MIT License. See [NOTICE.md](NOTICE.md).
