export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: 'current' },
        // Transform modules to CommonJS for Jest, keep ESM for production builds
        modules: process.env.NODE_ENV === 'test' ? 'commonjs' : false
      }
    ]
  ]
}
