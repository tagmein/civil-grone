const MARKER = "/* UNIFIED */"

export function clipCrownSource(source) {
  const at = source.indexOf(MARKER)
  if (at < 0) {
    throw new Error("crown marker /* UNIFIED */ not found")
  }
  return `${source.slice(at)}\nexport { crown }\n`
}
