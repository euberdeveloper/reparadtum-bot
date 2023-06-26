import generateAliasesResolver from 'esm-module-alias'; 
const aliases = {
  "@": "./dist/source",
  "@packageJson": "./dist/package.json",
};
export const resolve = generateAliasesResolver(aliases);