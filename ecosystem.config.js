module.exports = {
  apps: [
    {
      name: "fpl-league-similarity",
      script: "./server.js",
      watch: false,
      force: true,
      env: {
        PORT: 8081,
        NODE_ENV: "production",
        MY_ENV_VAR: "MyVarValue",
      },
    },
  ],
};
