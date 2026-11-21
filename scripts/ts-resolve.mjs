// Lets `node --import ./scripts/register.mjs` run the engine's .ts sources
// directly: Node's ESM resolver needs explicit extensions, the sources use
// bundler-style extensionless imports.
export async function resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
    try {
      return await next(specifier + ".ts", context);
    } catch {
      // fall through to the default resolution below
    }
  }
  return next(specifier, context);
}
