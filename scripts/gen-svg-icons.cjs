const fs = require('fs')
const path = require('path')

function svgIcon(size) {
  const r = Math.round(size * 0.18)
  const cx = size / 2
  const fontSize = Math.round(size * 0.36)
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `  <rect width="${size}" height="${size}" rx="${r}" fill="#700000"/>`,
    `  <circle cx="${cx}" cy="${cx}" r="${Math.round(size * 0.38)}" fill="rgba(156,119,56,0.25)"/>`,
    `  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="${fontSize}" fill="#FDFBF7">VC</text>`,
    `</svg>`
  ].join('\n')
}

const pub = path.join(__dirname, '..', 'public')
fs.mkdirSync(pub, { recursive: true })
fs.writeFileSync(path.join(pub, 'pwa-192x192.svg'), svgIcon(192))
fs.writeFileSync(path.join(pub, 'pwa-512x512.svg'), svgIcon(512))
// Also copy as .png filenames — browsers/Vite will serve them fine for dev
fs.copyFileSync(path.join(pub, 'pwa-192x192.svg'), path.join(pub, 'pwa-192x192.png'))
fs.copyFileSync(path.join(pub, 'pwa-512x512.svg'), path.join(pub, 'pwa-512x512.png'))
console.log('Icons written to public/')
