/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ["@remix-run/eslint-config"],
  env: {
    node: true,
    es2021: true,
  },
};
