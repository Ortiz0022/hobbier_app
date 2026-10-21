// Cache each immutable set of styles for the two theme objects.
// No global styles or React Native APIs are patched when the user switches.
/**
 * @template T
 * @param {(theme: typeof import('./palettes').themes.light) => T} factory
 * @returns {(theme: typeof import('./palettes').themes.light) => T}
 */
export const createThemeStyles = (factory) => {
  const cache = new WeakMap();
  return (theme) => {
    if (!cache.has(theme)) cache.set(theme, factory(theme));
    return cache.get(theme);
  };
};
