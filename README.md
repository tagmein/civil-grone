# civil-grone
Grone: A configurable local-first database and notebook

## Requirements

- Node.js 22 or newer
- npm

## Start

Clone the StarryUI submodule, install dependencies, then start the dev server:

```sh
git submodule update --init
npm install
npm start
```

`npm start` bundles the client, then serves the app at [http://localhost:3000](http://localhost:3000). Set `PORT` to use another port.

Local databases and the connection registry are stored in `data/` (or `GRONE_DATA_DIR` if set).

## Develop

Refresh the browser after editing Crown pages in `web/*.cr`. The dev server reads those files on each request.

TypeScript in `web/` is bundled to `web/starry.mjs`. Rebuild it while the server is running, then refresh:

```sh
npm run build
```

Restart `npm start` after changing server code in `server/`. API routes live in `server/routes/` as Crown files.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Build the client and start the dev server |
| `npm run build` | Bundle the client and write static files to `public/` |
| `npm run start:production` | Build the client and start in production mode |
| `npm test` | Run the test suite |
