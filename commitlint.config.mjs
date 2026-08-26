const config = {
  extends: ['@commitlint/config-conventional'],
  ignores: [(message) => message.startsWith('Checkpoint: ')],
  rules: {
    'header-max-length': [2, 'always', 150],
  },
  prompt: {
    settings: {
      enableMultipleScopes: true,
    },
  },
};

export default config;
