type Rgb = [number, number, number]

function parseHex(hex: string): Rgb {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) throw new Error(`Unsupported color: ${hex}`)
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
}

function parseColor(value: string, over: Rgb): Rgb {
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(value.trim())
  if (!rgba) return parseHex(value)
  const a = rgba[4] === undefined ? 1 : parseFloat(rgba[4])
  const fg: Rgb = [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])]
  return fg.map((c, i) => c * a + over[i] * (1 - a)) as Rgb
}

function luminance([r, g, b]: Rgb): number {
  const [R, G, B] = [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

/** WCAG 2.x contrast ratio. `a` may be #RGB, #RRGGBB or rgba(); rgba is composited over `b` (opaque hex). */
export function contrastRatio(a: string, b: string): number {
  const bg = parseHex(b)
  const la = luminance(parseColor(a, bg))
  const lb = luminance(bg)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Parses `--name: value;` declarations of the rule whose selector is exactly `selector`. */
export function parseTokenBlock(css: string, selector: string): Record<string, string> {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = new RegExp(`(?:^|\\})\\s*${esc}\\s*\\{([^}]*)\\}`, 'm').exec(css.replace(/\/\*[\s\S]*?\*\//g, ''))
  const out: Record<string, string> = {}
  if (!m) return out
  for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[d[1]] = d[2].trim()
  return out
}
