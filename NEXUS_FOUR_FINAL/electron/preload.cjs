const { contextBridge, ipcRenderer } = require('electron')

// 간단한 브리지. (현재 앱은 외부 API에 의존하지 않지만, 향후 확장 대비)
contextBridge.exposeInMainWorld('nexusElectron', {
  getPlatform: () => process.platform,
  ping: () => 'pong',
})

