module.exports = function(config) {
  config.set({
    frameworks: ["jasmine", "karma-typescript"],
    files: [
      "src/**/*.ts"
    ],
    preprocessors: {
      "**/*.ts": "karma-typescript"
    },
    reporters: ["progress", "karma-typescript", "kjhtml"],
    browsers: ["Chrome"],
    karmaTypescriptConfig: {
      bundlerOptions: {
        transforms: [
          require("karma-typescript-es6-transform")()
        ]
      },
      tsconfig: "./tsconfig.json"
    }
  });
};
