export function zoomAt(view, factor, point, min, max) {
  const scale = Math.max(min, Math.min(max, view.scale * factor))
  const ratio = scale / view.scale
  return { scale, x: point.x - (point.x - view.x) * ratio, y: point.y - (point.y - view.y) * ratio }
}
export function constrain(view, width, height, imageWidth, imageHeight) {
  const w = imageWidth * view.scale, h = imageHeight * view.scale
  return { ...view, x: w < width ? (width-w)/2 : Math.min(0, Math.max(width-w, view.x)), y: h < height ? (height-h)/2 : Math.min(0, Math.max(height-h, view.y)) }
}

export function imageScales(width, height, imageWidth, imageHeight) {
  const fit = Math.min(width / imageWidth, height / imageHeight)
  const fill = Math.max(width / imageWidth, height / imageHeight)
  return { min: fit, max: Math.max(fill * 8, 1) }
}
