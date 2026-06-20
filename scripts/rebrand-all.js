const fs = require('fs');
const path = require('path');

const workspaceRoot = 'd:\\langfuse-main\\langfuse-main';

const replacements = [
  { search: /LungSpan/g, replace: 'Aletheia' },
  { search: /lungspan/g, replace: 'aletheia' },
  { search: /LUNGSPAN/g, replace: 'ALETHEIA' },
  { search: /Athelia/g, replace: 'Aletheia' },
  { search: /athelia/g, replace: 'aletheia' },
  { search: /ATHELIA/g, replace: 'ALETHEIA' },
  { search: /Langfuse/g, replace: 'Aletheia' },
  { search: /langfuse/g, replace: 'aletheia' },
  { search: /LANGFUSE/g, replace: 'ALETHEIA' }
];

const excludedDirs = new Set([
  '.git',
  'node_modules',
  '.next',
  '.turbo',
  'dist',
  'build',
  '.local-services'
]);

const excludedFiles = new Set([
  '.tsbuildinfo',
  'pnpm-lock.yaml',
  'rebrand-all.js'
]);

const binaryExtensions = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico',
  '.woff', '.woff2', '.ttf', '.eot', '.zip', '.gz', '.tar', '.pdf'
]);

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath);
  if (excludedFiles.has(name)) return false;
  if (binaryExtensions.has(ext)) return false;
  return true;
}

// Phase 1: Rebrand File Contents
function processDirectoryContents(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (excludedDirs.has(file)) continue;

    const fullPath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (e) {
      continue;
    }

    if (stat.isDirectory()) {
      processDirectoryContents(fullPath);
    } else if (stat.isFile() && shouldProcessFile(fullPath)) {
      try {
        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = false;
        for (const r of replacements) {
          if (r.search.test(content)) {
            content = content.replace(r.search, r.replace);
            modified = true;
          }
        }
        if (modified) {
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`Updated content: ${path.relative(workspaceRoot, fullPath)}`);
        }
      } catch (err) {
        console.error(`Error reading/writing ${fullPath}:`, err.message);
      }
    }
  }
}

// Phase 2: Bottom-Up Gather and Rename
function getAllPaths(dir, allPaths = []) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (e) {
    return allPaths;
  }
  for (const file of files) {
    if (excludedDirs.has(file)) continue;

    const fullPath = path.join(dir, file);
    allPaths.push(fullPath);

    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        getAllPaths(fullPath, allPaths);
      }
    } catch (e) {}
  }
  return allPaths;
}

console.log('Starting branding replacement pass...');
processDirectoryContents(workspaceRoot);

console.log('Gathering paths for renaming pass...');
const allPaths = getAllPaths(workspaceRoot);
// Sort by path length descending so that we rename deepest files/folders first!
allPaths.sort((a, b) => b.length - a.length);

console.log(`Renaming ${allPaths.length} items bottom-up...`);
for (const fullPath of allPaths) {
  const file = path.basename(fullPath);
  const dir = path.dirname(fullPath);
  
  let newName = file;
  let renamed = false;
  
  const nameReplacements = [
    { search: /LungSpan/g, replace: 'Aletheia' },
    { search: /lungspan/g, replace: 'aletheia' },
    { search: /Athelia/g, replace: 'Aletheia' },
    { search: /athelia/g, replace: 'aletheia' },
    { search: /Langfuse/g, replace: 'Aletheia' },
    { search: /langfuse/g, replace: 'aletheia' }
  ];

  for (const r of nameReplacements) {
    if (r.search.test(newName)) {
      newName = newName.replace(r.search, r.replace);
      renamed = true;
    }
  }

  if (renamed) {
    const newPath = path.join(dir, newName);
    try {
      if (fs.existsSync(fullPath)) {
        fs.renameSync(fullPath, newPath);
        console.log(`Renamed: ${path.relative(workspaceRoot, fullPath)} -> ${newName}`);
      }
    } catch (err) {
      console.error(`Error renaming ${fullPath} to ${newPath}:`, err.message);
    }
  }
}
console.log('Branding replacement and renaming complete.');
