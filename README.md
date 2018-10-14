# Pirple Node.js Masterclass JSON API

Project presently has 2 routes
> - Ping -> which presently returns a 200 and an empty object
> - hello -> which sends a welcome message, a name query can be sent so the name sent will be part of the welcome message
> - More routes coming in later versions

| Route | Response |
|-------|----------|
|/ping  | `{}`   |
|/hello | `{ message: 'Hello and Welcome Stranger' }` |
|/hello?name=Roger | `{ message: 'Hello and Welcome Roger' }` |
