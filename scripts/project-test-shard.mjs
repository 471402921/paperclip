import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { selectGeneralServerShard } from './general-server-shard.mjs';

export function projectTestFiles(specifications, { root, project, directory }) {
  assert.ok(Array.isArray(specifications) && specifications.length > 0, 'Missing project test inventory');
  const checkout = realpathSync(root);
  const folder = resolve(checkout, directory);
  assert.ok(folder.startsWith(`${checkout}${sep}`), 'Project directory must stay inside the checkout');
  const files = specifications.map(specification => {
    assert.equal(specification.projectName, project, 'Unexpected test project');
    assert.ok(typeof specification.file === 'string' && isAbsolute(specification.file), 'Expected an absolute test path');
    const file = realpathSync(specification.file);
    assert.ok(file.startsWith(`${folder}${sep}`), 'Test file is outside its project');
    return relative(checkout, file).split(sep).join('/');
  });
  assert.equal(new Set(files).size, files.length, 'Duplicate test file');
  return files.sort();
}

export function projectFileShard(specifications, options) {
  const { index, count, durations = {} } = options;
  assert.ok(Number.isSafeInteger(count) && count > 0, 'Invalid shard count');
  assert.ok(Number.isSafeInteger(index) && index >= 0 && index < count, 'Invalid shard index');
  const files = projectTestFiles(specifications, options);
  return { total: files.length, files: selectGeneralServerShard(files, index, count, durations) };
}
