import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import os from 'os'

const CERT_DIR = `${os.homedir()}/.config/tailscale/certs`
const DOMAIN = 'aitopatom-4fc6.tailca9a17.ts.net'
const certPath = `${CERT_DIR}/${DOMAIN}.crt`
const keyPath  = `${CERT_DIR}/${DOMAIN}.key`

function canRead(p: string): boolean {
  try { fs.accessSync(p, fs.constants.R_OK); return true } catch { return false }
}

const certsAvailable = canRead(certPath) && canRead(keyPath)

const httpsConfig = certsAvailable
  ? { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }
  : undefined

// When the backend also has SSL (APP_SSL_CERT is set), proxy over https
const backendScheme = process.env.APP_SSL_CERT ? 'https' : 'http'
const backendUrl = `${backendScheme}://localhost:${process.env.APP_PORT ?? '8080'}`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: httpsConfig,
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: backendUrl,
        secure: false,
      },
      '/health': {
        target: backendUrl,
        secure: false,
      },
      '/v1/audio': {
        target: backendUrl,
        secure: false,
      },
    },
  },
})
