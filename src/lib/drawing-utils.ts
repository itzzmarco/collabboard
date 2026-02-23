/**
 * Compress an array of {x, y} points into a delta-encoded format.
 * The first point is emitted as an absolute {x, y}. Subsequent points
 * are emitted as {dx, dy} deltas relative to the previous point.
 * All coordinates are rounded to 2 decimal places.
 * Duplicate points (where both dx and dy are 0) are skipped.
 */
export function compressPoints(
  points: Array<{ x: number; y: number }>,
): Array<{ x: number; y: number } | { dx: number; dy: number }> {
  if (points.length === 0) return []

  const result: Array<{ x: number; y: number } | { dx: number; dy: number }> = []

  const firstX = Math.round(points[0].x * 100) / 100
  const firstY = Math.round(points[0].y * 100) / 100
  result.push({ x: firstX, y: firstY })

  let prevX = firstX
  let prevY = firstY

  for (let i = 1; i < points.length; i++) {
    const curX = Math.round(points[i].x * 100) / 100
    const curY = Math.round(points[i].y * 100) / 100
    const dx = Math.round((curX - prevX) * 100) / 100
    const dy = Math.round((curY - prevY) * 100) / 100

    if (dx === 0 && dy === 0) continue

    result.push({ dx, dy })
    prevX = curX
    prevY = curY
  }

  return result
}

/**
 * Decompress a delta-encoded points array back into plain {x, y}[].
 * Elements with {x, y} keys are treated as absolute anchors.
 * Elements with {dx, dy} keys are treated as deltas from the running position.
 */
export function decompressPoints(
  compressed: Array<Record<string, number>>,
): Array<{ x: number; y: number }> {
  const result: Array<{ x: number; y: number }> = []
  let curX = 0
  let curY = 0

  for (const entry of compressed) {
    if ('x' in entry && 'y' in entry) {
      curX = entry.x
      curY = entry.y
      result.push({ x: curX, y: curY })
    } else if ('dx' in entry && 'dy' in entry) {
      curX += entry.dx
      curY += entry.dy
      result.push({ x: curX, y: curY })
    }
  }

  return result
}
