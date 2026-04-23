import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./tests/unit/sandbox-loader.mjs', pathToFileURL('./'));
