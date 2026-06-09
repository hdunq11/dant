import type { Plugin } from 'vite'

export function browserLogger(): Plugin {
  return {
    name: 'browser-logger',
    configureServer(server) {
      server.ws.on('browser-log', (data) => {
        const { type, args } = data as {
          type: string
          args: unknown[]
        }

        const prefix = `[browser:${type}]`

        if (type === 'error') {
          console.error(prefix, ...args)
        } else if (type === 'warn') {
          console.warn(prefix, ...args)
        } else {
          console.log(prefix, ...args)
        }
      })
    },
  }
}