import './style.css'
import { mountApp } from './lotto/ui/app'
import { mountClassicApp } from './legacy/classicApp'

const rootEl = document.querySelector<HTMLDivElement>('#app')
if (!rootEl) {
  throw new Error('#app root missing')
}
const root: HTMLDivElement = rootEl

function showV3(): void {
  mountApp(root)
}

function showClassic(): void {
  mountClassicApp(root)
}

showV3()

window.addEventListener('lottolens:open-legacy', () => {
  showClassic()
})

window.addEventListener('lottolens:open-v3', () => {
  showV3()
})
