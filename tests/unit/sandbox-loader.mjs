import { pathToFileURL } from 'node:url';

function isWindowsAbsoluteSpecifier(specifier) {
  return /^[A-Za-z]:[\\/]/.test(specifier) || specifier.startsWith('\\\\');
}

function isRelativeOrFileSpecifier(specifier) {
  return (
    specifier.startsWith('./') ||
    specifier.startsWith('../') ||
    specifier.startsWith('/') ||
    specifier.startsWith('file://') ||
    isWindowsAbsoluteSpecifier(specifier)
  );
}

function hasExplicitExtension(specifier) {
  const normalized = specifier.replace(/\?.*$/, '').replace(/#.*$/, '');
  return /\.[a-z0-9]+$/i.test(normalized);
}

function addCandidate(candidates, seen, value) {
  if (!seen.has(value)) {
    seen.add(value);
    candidates.push(value);
  }
}

function addPathAndUrlCandidates(candidates, seen, value) {
  addCandidate(candidates, seen, value);

  if (isWindowsAbsoluteSpecifier(value)) {
    const normalized = value.replace(/\\/g, '/');
    addCandidate(candidates, seen, normalized);

    try {
      addCandidate(candidates, seen, pathToFileURL(value).href);
    } catch {
      // Best-effort only for sandbox fallback.
    }
  }
}

function buildCandidates(specifier) {
  const candidates = [];
  const seen = new Set();
  const push = (value) => addPathAndUrlCandidates(candidates, seen, value);

  if (specifier.endsWith('.js')) {
    push(specifier.slice(0, -3) + '.ts');
    push(specifier.slice(0, -3) + '.tsx');
  }

  if (!hasExplicitExtension(specifier)) {
    push(`${specifier}.ts`);
    push(`${specifier}.tsx`);
    push(`${specifier}/index.ts`);
    push(`${specifier}/index.tsx`);
  }

  return candidates;
}

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!isRelativeOrFileSpecifier(specifier) || error?.code !== 'ERR_MODULE_NOT_FOUND') {
      throw error;
    }

    for (const candidate of buildCandidates(specifier)) {
      try {
        return await nextResolve(candidate, context);
      } catch (candidateError) {
        if (candidateError?.code !== 'ERR_MODULE_NOT_FOUND') {
          throw candidateError;
        }
      }
    }

    throw error;
  }
}
