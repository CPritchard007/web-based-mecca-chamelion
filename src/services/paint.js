export const MAX_STROKES = 128
export const MAX_POINTS = 256

// Only accept bounded vector data; never render peer-provided SVG markup.
export function sanitizePaint(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_STROKES).filter(stroke =>
    stroke && /^#[0-9a-f]{6}$/i.test(stroke.color) &&
    Number.isFinite(stroke.width) && stroke.width >= .5 && stroke.width <= 8 &&
    Array.isArray(stroke.points) && stroke.points.length > 0 && stroke.points.length <= MAX_POINTS &&
    stroke.points.every(p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && n >= 0 && n <= 24))
  ).map(stroke => ({ color: stroke.color, width: stroke.width, points: stroke.points.map(p => [...p]) }))
}

export function playerPaintView(width, height, imageWidth, imageHeight, player) {
  const available = Math.max(100, width - (width <= 700 ? 220 : 340))
  const diameter = Math.min(240, available * .8, height * .4)
  const scale = diameter / 20
  return { scale, x: available / 2 - player.x * imageWidth * scale, y: height / 2 - player.y * imageHeight * scale }
}
