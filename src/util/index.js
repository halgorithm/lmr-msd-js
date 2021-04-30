export function timesMap(count, callback) {
  return Array(count).fill(undefined).map(callback)
}

export function iterMap(callback) {
  const res = []

  while (true) {
    let item = callback()
    if (item === undefined) break
    res.push(item)
  }

  return res
}

// rectMap?
