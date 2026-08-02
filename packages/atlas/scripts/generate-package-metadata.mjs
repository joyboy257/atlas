import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = git(['rev-parse', '--show-toplevel']);
const packageJson = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
const outputPath = path.join(packageRoot, 'metadata', 'package-source.v1.json');
const includedRoots = ['bin', 'docs', 'examples', 'schema', 'scripts', 'skills', 'src'];
const includedFiles = ['README.md', 'package.json', 'tsconfig.json'];

const files = [];
for (const root of includedRoots) await collect(path.join(packageRoot, root), root, files);
for (const relativePath of includedFiles) files.push(relativePath);
files.sort((a, b) => a.localeCompare(b));

const contentEntries = [];
for (const relativePath of files) {
  const absolutePath = path.join(packageRoot, ...relativePath.split('/'));
  const contents = await readFile(absolutePath);
  contentEntries.push({
    path: relativePath,
    sha256: digest(contents),
    bytes: contents.byteLength,
  });
}
const sourceContentDigest = digest(Buffer.from(contentEntries.map((entry) => `${entry.path}\0${entry.sha256}\0${entry.bytes}\n`).join(''), 'utf8'));
const packageRelative = path.relative(repositoryRoot, packageRoot);
const sourcePathspecs = [...includedRoots, ...includedFiles].map((relativePath) => path.join(packageRelative, relativePath));
const status = execFileSync('git', ['status', '--porcelain', '--', ...sourcePathspecs], { cwd: repositoryRoot, encoding: 'utf8' }).trim();
const sourceHeadSha = git(['rev-list', '-1', 'HEAD', '--', ...includedRoots, ...includedFiles]);
const metadata = {
  schema_version: 'atlas.package-source/v1',
  package_name: packageJson.name,
  package_version: packageJson.version,
  source_head_sha: sourceHeadSha,
  base_tree_sha: git(['rev-parse', `${sourceHeadSha}^{tree}`]),
  source_content_sha256: `sha256:${sourceContentDigest}`,
  source_dirty: status.length > 0,
  source_file_count: contentEntries.length,
  release_status: 'unpublished_local_artifact',
  repository_visibility: 'private_or_unpublished',
  public_package_available: false,
  live_provider_connected: false,
  hosted_staging_proven: false,
  hosted_production_proven: false,
  content_roots: includedRoots,
  content_files: includedFiles,
};
const serialized = `${JSON.stringify(metadata, null, 2)}\n`;

if (process.argv.includes('--check')) {
  const existing = await readFile(outputPath, 'utf8').catch(() => null);
  if (existing !== serialized) {
    console.error('Atlas package source metadata is missing or stale. Run npm run metadata:write.');
    process.exit(1);
  }
  console.log(`Atlas package metadata matches ${metadata.source_content_sha256}`);
} else {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized, { mode: 0o644 });
  console.log(`Wrote ${path.relative(packageRoot, outputPath)} ${metadata.source_content_sha256}`);
}

async function collect(absolutePath, relativePath, target) {
  const entry = await lstat(absolutePath);
  if (entry.isSymbolicLink()) throw new Error(`Metadata source cannot include a symbolic link: ${relativePath}`);
  if (entry.isFile()) {
    target.push(relativePath.split(path.sep).join('/'));
    return;
  }
  if (!entry.isDirectory()) return;
  const children = await readdir(absolutePath, { withFileTypes: true });
  for (const child of children.sort((a, b) => a.name.localeCompare(b.name))) {
    if (child.isSymbolicLink()) throw new Error(`Metadata source cannot include a symbolic link: ${path.join(relativePath, child.name)}`);
    await collect(path.join(absolutePath, child.name), path.join(relativePath, child.name), target);
  }
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function git(args) {
  return execFileSync('git', args, { cwd: packageRoot, encoding: 'utf8' }).trim();
}
