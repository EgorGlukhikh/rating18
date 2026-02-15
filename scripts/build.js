const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const buildDir = path.join(rootDir, 'build');

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
  fs.rmSync(buildDir, { recursive: true, force: true });
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

console.log('Build completed. Files are in ./build');
