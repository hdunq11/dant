import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
if (true) {
  const sendLog = (type: string, args: unknown[]) => {
    import.meta.hot?.send('browser-log', {
      type,
      args: args.map((arg) => {
        if (arg instanceof Error) {
          return {
            name: arg.name,
            message: arg.message,
            stack: arg.stack,
          }
        }

        try {
          return JSON.parse(JSON.stringify(arg))
        } catch {
          return String(arg)
        }
      }),
    })
  }

  const originalLog = console.log
  const originalWarn = console.warn
  const originalError = console.error

  console.log = (...args) => {
    originalLog(...args)
    sendLog('log', args)
  }

  console.warn = (...args) => {
    originalWarn(...args)
    sendLog('warn', args)
  }

  console.error = (...args) => {
    originalError(...args)
    sendLog('error', args)
  }

  window.addEventListener('error', (event) => {
    sendLog('error', [
      event.message,
      event.filename,
      event.lineno,
      event.colno,
      event.error,
    ])
  })

  window.addEventListener('unhandledrejection', (event) => {
    sendLog('unhandledrejection', [event.reason])
  })
}