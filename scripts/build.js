const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const buildDirName = process.env.BUILD_DIR || 'build';
const buildDir = path.join(rootDir, buildDirName);

function exists(p) {
  return fs.existsSync(p);
}

function copyToBuild(relativePath) {
  const source = path.join(rootDir, relativePath);
  if (!exists(source)) return;

  const destination = path.join(buildDir, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

if (exists(buildDir)) {
  try {
    fs.rmSync(buildDir, { recursive: true, force: true });
  } catch (_) {
    // Fallback for Windows file locks: clean directory contents instead of deleting root.
    for (const entry of fs.readdirSync(buildDir)) {
      try {
        fs.rmSync(path.join(buildDir, entry), { recursive: true, force: true });
      } catch (_) {
        // Ignore locked files; they will be overwritten if possible.
      }
    }
  }
}
fs.mkdirSync(buildDir, { recursive: true });

const filesToCopy = [
  'index.html',
  'admin.html',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml'
];

const dirsToCopy = [
  'assets',
  'images',
  'img',
  'css',
  'js',
  'fonts'
];

filesToCopy.forEach(copyToBuild);
dirsToCopy.forEach(copyToBuild);

console.log(`Build completed. Files are in ./${buildDirName}`);
