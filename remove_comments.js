const fs = require('fs');
const path = require('path');

function isTextFile(ext) {
  return ['.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.css', '.scss', '.vue'].includes(ext);
}

function stripComments(content, ext) {
  let result = content;
  if (['.js', '.jsx', '.ts', '.tsx', '.css', '.scss'].includes(ext)) {

    result = result.replace(/\/\/.*(?=\n)/g, '');

    result = result.replace(/\/\*[\s\S]*?\*\

  }
  if (['.html', '.htm', '.vue'].includes(ext)) {

    result = result.replace(/<!--[\s\S]*?-->/g, '');
  }
  return result;
}

function processDir(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (isTextFile(ext)) {
        const original = fs.readFileSync(fullPath, 'utf8');
        const stripped = stripComments(original, ext);
        if (original !== stripped) {
          fs.writeFileSync(fullPath, stripped, 'utf8');
          console.log('Stripped comments from', fullPath);
        }
      }
    }
  });
}

processDir(path.resolve(__dirname));
