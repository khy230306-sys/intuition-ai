const http = require('http')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

const PORT = 17891

function resolveRoot() {
  const candidates = [
    path.join(__dirname, 'dist'),
    path.join(path.dirname(process.execPath), 'dist'),
    path.join(process.cwd(), 'dist'),
  ]
  for (const c of candidates) {
    try {
      if (fs.existsSync(path.join(c, 'index.html'))) return c
    } catch {}
  }
  return candidates[0]
}

const root = resolveRoot()

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.map': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error('dist/index.html 을 찾을 수 없습니다:', root)
  console.error('ai-v2 폴더 안에 Intuition-AI-v2.exe 와 dist 폴더가 함께 있는지 확인하세요.')
  setTimeout(() => process.exit(1), 8000)
} else {
  const server = http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0])
      if (urlPath === '/') urlPath = '/index.html'
      const filePath = path.normalize(path.join(root, urlPath))
      if (!filePath.startsWith(root)) {
        res.writeHead(403)
        res.end('Forbidden')
        return
      }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404)
        res.end('Not found')
        return
      }
      const ext = path.extname(filePath).toLowerCase()
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' })
      fs.createReadStream(filePath).pipe(res)
    } catch (e) {
      res.writeHead(500)
      res.end(String(e))
    }
  })

  server.listen(PORT, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${PORT}/`
    const cmd =
      process.platform === 'win32'
        ? `cmd /c start "" "${url}"`
        : process.platform === 'darwin'
          ? `open "${url}"`
          : `xdg-open "${url}"`
    exec(cmd, () => {})
    console.log(`Intuition AI v2 실행 중: ${url}`)
    console.log('이 창을 닫으면 앱이 종료됩니다.')
  })
}
