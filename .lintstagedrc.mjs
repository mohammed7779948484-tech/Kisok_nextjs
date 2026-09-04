const config = {
  '*.{js,jsx,ts,tsx,json,css}': [
    'biome check --write --no-errors-on-unmatched --files-ignore-unknown=true',
  ],
};

export default config;
