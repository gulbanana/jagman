# JAGMAN

JAGMAN is an experimental dashboard for TUI coding agents, using Jujutsu workspaces anonymous branches to coordinate work. JAGMAN aims to solve an MxNxO problem: multiple agents of multiple kinds running in multiple repositories. At this scale, users' attention is the bottleneck; we want to reduce the overhead of agent management by bringing information together and focusing attention on the few things that actually matter.

"Experimental" undersells it: JAGMAN is not ready for use. Feel free to look at the code (but it's vibecoded, not valuable in and of itself) or to try and run it (which probably won't work). Here's a video of the interesting bit, the idea:

[![JAGMAN prototype](https://img.youtube.com/vi/WfEs22TPS0U/0.jpg)](https://www.youtube.com/watch?v=WfEs22TPS0U)

## Installation

```sh
npm install -g @gulbanana/jagman
jagman
```

Or run directly without installing:

```sh
npx @gulbanana/jagman
```

This starts the server on localhost, using a random port number, and opens it in your browser. Set `PORT` and `HOST` environment variables to override the defaults.

## Building from source

```sh
npm install
npm run build
node bin/jagman.js
```

## Development

```sh
npm run dev        # Start the dev server with hot reload
npm run check      # Type-check the project
npm run test       # Run all tests
```

## License

[AGPL-3.0-or-later](LICENSE)
