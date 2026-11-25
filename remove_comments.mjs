import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isTargetFile(ext) {
  return ['.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.css', '.scss', '.vue'].includes(ext);
}

function stripComments(content, ext) {
  let result = content;
  if (['.js', '.jsx', '.ts', '.tsx', '.css', '.scss'].includes(ext)) {
    // Remove // line comments
    result = result.replace(/\s*\/\/.*(?=\n)/g, '\n');
    // Remove /* block comments */
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  }
  if (['.html', '.htm', '.vue'].includes(ext)) {
    // Remove HTML comments
    result = result.replace(/<!--[\s\S]*?-->/g, '');
  }
  return result;
}

function processDirectory(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (isTargetFile(ext)) {
        const original = fs.readFileSync(fullPath, 'utf8');
        const stripped = stripComments(original, ext);
        if (original !== stripped) {
          fs.writeFileSync(fullPath, stripped, 'utf8');
          console.log('Stripped comments from', fullPath);
        }
      }
    }
  }
}

processDirectory(__dirname);
