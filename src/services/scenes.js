// Vite discovers images in this folder, including nested folders, at build time.
const images = import.meta.glob('../assets/images/**/*.{jpg,jpeg,png,webp,avif,gif,svg,bmp,JPG,JPEG,PNG,WEBP,AVIF,GIF,SVG,BMP}', { eager: true, query: '?url', import: 'default' })
export const scenes = Object.entries(images).map(([path, src]) => {
  const id = path.replace('../assets/images/', '')
  return { id, src, title: id.replace(/\.[^.]+$/, '').replace(/[-_/]/g, ' ') }
}).sort((a, b) => a.id.localeCompare(b.id))
