export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: 'current' },
        // Keep ESM modules for Jest's --experimental-vm-modules (ESM mode)
        modules: false
      }
    ]
  ]
}
