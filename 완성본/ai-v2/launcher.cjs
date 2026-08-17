const http = require('http')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const readline = require('readline')

const PREFERRED_PORTS = [17891, 17892, 17893, 5175, 4175]

function log(...args) {
  const line = args.map(String).join(' ')
  console.log(line)
  try {
    const logFile = path.join(path.dirname(process.execPath), 'ai-v2-run.log')
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${line}\n`, 'utf8')
  } catch {}
}

function pause(message) {
  return new Promise((resolve) => {
    if (message) console.log(message)
    if (process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
      rl.question('\n종료하려면 Enter 키를 누르세요...', () => {
        rl.close()
        resolve()
      })
    } else {
      setTimeout(resolve, 15000)
    }
  })
}

function resolveRoot() {
  const candidates = [
    path.join(path.dirname(process.execPath), 'dist'),
    path.join(process.cwd(), 'dist'),
    path.join(__dirname, 'dist'),
  ]
  for (const c of candidates) {
    try {
      const index = path.join(c, 'index.html')
      if (fs.existsSync(index)) {
        log('UI 경로:', c)
        return path.resolve(c)
      }
    } catch (e) {
      log('경로 검사 실패:', c, e && e.message)
    }
  }
  return null
}

function safeFilePath(rootDir, rawUrl) {
  let urlPath = String(rawUrl || '/').split('?')[0]
  try {
    urlPath = decodeURIComponent(urlPath)
  } catch {}
  if (urlPath === '/' || urlPath === '') urlPath = 'index.html'
  urlPath = urlPath.replace(/^\/+/, '').replace(/\\/g, '/')
  if (!urlPath || urlPath.includes('..')) return null
  const full = path.resolve(rootDir, urlPath)
  const root = path.resolve(rootDir)
  const prefix = root.endsWith(path.sep) ? root : root + path.sep
  const fullLower = full.toLowerCase()
  const prefixLower = prefix.toLowerCase()
  if (fullLower !== root.toLowerCase() && !fullLower.startsWith(prefixLower)) return null
  return full
}

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

function openBrowser(url) {
  if (process.platform === 'win32') {
    // Avoid start "" quoting pitfalls on Korean Windows paths/locales
    exec(`cmd /c start ${url}`, { windowsHide: true }, (err) => {
      if (err) log('브라우저 자동 실행 실패. 주소창에 직접 입력:', url, err.message)
    })
  } else if (process.platform === 'darwin') {
    exec(`open "${url}"`)
  } else {
    exec(`xdg-open "${url}"`)
  }
}

function listen(server, ports) {
  return new Promise((resolve, reject) => {
    let i = 0
    const tryNext = () => {
      if (i >= ports.length) {
        reject(new Error('사용 가능한 포트를 찾지 못했습니다: ' + ports.join(', ')))
        return
      }
      const port = ports[i++]
      const onError = (err) => {
        server.off('listening', onListening)
        if (err && err.code === 'EADDRINUSE') {
          log('포트 사용 중, 다음 시도:', port)
          tryNext()
        } else {
          reject(err)
        }
      }
      const onListening = () => {
        server.off('error', onError)
        resolve(port)
      }
      server.once('error', onError)
      server.once('listening', onListening)
      server.listen(port, '127.0.0.1')
    }
    tryNext()
  })
}

async function main() {
  log('Intuition AI v2 시작')
  log('execPath:', process.execPath)
  log('cwd:', process.cwd())
  log('__dirname:', __dirname)

  const root = resolveRoot()
  if (!root) {
    console.error('')
    console.error('[오류] dist/index.html 을 찾을 수 없습니다.')
    console.error('Intuition-AI-v2.exe 와 같은 폴더에 dist 폴더가 있어야 합니다.')
    console.error('예) ...\\ai-v2\\Intuition-AI-v2.exe')
    console.error('    ...\\ai-v2\\dist\\index.html')
    console.error('')
    console.error('ZIP 전체를 압축 해제한 뒤 실행하세요. EXE만 따로 옮기면 안됩니다.')
    await pause()
    process.exit(1)
  }

  const server = http.createServer((req, res) => {
    try {
      const filePath = safeFilePath(root, req.url)
      if (!filePath) {
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
      const body = fs.readFileSync(filePath)
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' })
      res.end(body)
    } catch (e) {
      log('요청 처리 오류:', e && e.message)
      res.writeHead(500)
      res.end(String(e))
    }
  })

  try {
    const port = await listen(server, PREFERRED_PORTS)
    const url = `http://127.0.0.1:${port}/`
    openBrowser(url)
    console.log('')
    console.log('========================================')
    console.log(' Intuition AI v2 실행 중')
    console.log(' ' + url)
    console.log('========================================')
    console.log('브라우저가 안 열리면 위 주소를 직접 입력하세요.')
    console.log('이 창을 닫으면 앱이 종료됩니다.')
    console.log('')
  } catch (e) {
    console.error('[오류] 서버 시작 실패:', e && e.message)
    await pause()
    process.exit(1)
  }
}

main().catch(async (e) => {
  console.error('[치명적 오류]', e)
  await pause()
  process.exit(1)
})
