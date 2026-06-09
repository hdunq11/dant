export function browserLogger() {
    return {
        name: 'browser-logger',
        configureServer(server) {
            server.ws.on('browser-log', (data) => {
                const { type, args } = data;
                const prefix = `[browser:${type}]`;
                if (type === 'error') {
                    console.error(prefix, ...args);
                }
                else if (type === 'warn') {
                    console.warn(prefix, ...args);
                }
                else {
                    console.log(prefix, ...args);
                }
            });
        },
    };
}
