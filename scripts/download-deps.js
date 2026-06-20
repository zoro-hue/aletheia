const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const workspaceRoot = 'd:\\aletheia-main\\aletheia-main';

const deps = [
  {
    name: 'aletheia-core',
    url: 'https://registry.npmjs.org/aletheia-core/-/aletheia-core-3.38.20.tgz',
    targetDir: path.join(workspaceRoot, 'packages', 'aletheia-core')
  },
  {
    name: 'aletheia',
    url: 'https://registry.npmjs.org/aletheia/-/aletheia-3.38.4.tgz',
    targetDir: path.join(workspaceRoot, 'packages', 'aletheia')
  },
  {
    name: 'aletheia-langchain',
    url: 'https://registry.npmjs.org/aletheia-langchain/-/aletheia-langchain-3.38.20.tgz',
    targetDir: path.join(workspaceRoot, 'packages', 'aletheia-langchain')
  }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  for (const dep of deps) {
    console.log(`Processing ${dep.name}...`);
    const tempTar = path.join(workspaceRoot, `${dep.name}.tgz`);
    
    // Download
    console.log(`Downloading ${dep.url}...`);
    await downloadFile(dep.url, tempTar);
    
    // Create target dir
    if (fs.existsSync(dep.targetDir)) {
      fs.rmSync(dep.targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(dep.targetDir, { recursive: true });
    
    // Extract
    console.log(`Extracting to ${dep.targetDir}...`);
    try {
      execSync(`tar -xzf "${tempTar}" -C "${dep.targetDir}" --strip-components=1`);
      console.log(`Successfully extracted ${dep.name}`);
    } catch (err) {
      console.error(`Failed to extract ${dep.name}:`, err.message);
    }
    
    // Clean up tarball
    if (fs.existsSync(tempTar)) {
      fs.unlinkSync(tempTar);
    }

    // Update package.json name inside extracted folder
    const pkgJsonPath = path.join(dep.targetDir, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      pkg.name = dep.name;
      
      // Update dependencies to use workspace local versions
      if (pkg.dependencies) {
        if (pkg.dependencies['aletheia-core']) {
          delete pkg.dependencies['aletheia-core'];
          pkg.dependencies['aletheia-core'] = 'workspace:*';
        }
        if (pkg.dependencies['aletheia']) {
          delete pkg.dependencies['aletheia'];
          pkg.dependencies['aletheia'] = 'workspace:*';
        }
      }
      if (pkg.peerDependencies) {
        if (pkg.peerDependencies['aletheia-core']) {
          delete pkg.peerDependencies['aletheia-core'];
          pkg.peerDependencies['aletheia-core'] = 'workspace:*';
        }
        if (pkg.peerDependencies['aletheia']) {
          delete pkg.peerDependencies['aletheia'];
          pkg.peerDependencies['aletheia'] = 'workspace:*';
        }
      }
      fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2), 'utf8');
    }
  }
  console.log('All dependencies processed.');
}

run().catch(console.error);
