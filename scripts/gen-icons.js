// Generates PWA icons using canvas
const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#700000'
  ctx.fillRect(0, 0, size, size)

  // Rounded corners via clip
  const r = size * 0.18
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.clip()

  ctx.fillStyle = '#700000'
  ctx.fillRect(0, 0, size, size)

  // Gold circle accent
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size * 0.38, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(156,119,56,0.25)'
  ctx.fill()

  // "VC" text
  ctx.fillStyle = '#FDFBF7'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${size * 0.36}px serif`
  ctx.fillText('VC', size / 2, size / 2)

  return canvas.toBuffer('image/png')
}

const publicDir = path.join(__dirname, '..', 'public')
fs.mkdirSync(publicDir, { recursive: true })

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generateIcon(192))
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generateIcon(512))
console.log('Icons generated.')
