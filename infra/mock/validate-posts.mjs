import { readFileSync } from 'node:fs';
import { deepStrictEqual } from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const spec = JSON.parse(readFileSync(new URL('./openapi.json', import.meta.url), 'utf8'));
const schema = spec.paths['/posts'].get.responses['200'].content['application/json'].schema;
const body = JSON.parse(readFileSync(0, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strictTypes: false });
addFormats(ajv);
// Keep the OpenAPI components at the root so bundled JSON Pointer references resolve.
ajv.addKeyword({ keyword: 'components', schemaType: 'object', valid: true });
const validate = ajv.compile({ ...schema, components: spec.components });

if (!validate(body)) {
  console.error(ajv.errorsText(validate.errors, { separator: '\n' }));
  process.exitCode = 1;
} else {
  if (process.argv.length > 2) {
    deepStrictEqual(body.items.map(post => post.postId), process.argv.slice(2));
  }
  console.log(`PublicPostPage valid (${body.items.length} items)`);
}
