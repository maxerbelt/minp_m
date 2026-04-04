export function errorMsg (title, obj) {
  return `\n\n${title}:\n${JSON.stringify(
    obj,
    (_key, value) =>
      typeof value === 'bigint' ? value.toString() + 'n' : value,
    2
  )}`
}
