export default {
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.js' }]
  },
  // extensionsToTreatAsEsm removed: '.js' is inferred from package.json 'type: module'
  testEnvironment: '<rootDir>/test/jest-environment.js',
  moduleNameMapper: {},
  testMatch: ['<rootDir>/src/**/*.test.js', '<rootDir>/test/**/*.test.js'],
  transformIgnorePatterns: [
    '/node_modules/(?!(jest-.*|@jest/.*|@babel/.*|babel-jest)/)'
  ],
  testTimeout: 10000
}
