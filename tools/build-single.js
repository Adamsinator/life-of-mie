// Bundles the game into one self-contained HTML file: dist/mies-atelier.html
// Usage: node tools/build-single.js [--fragment]   (--fragment omits <html>/<head>/<body> wrappers)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const fragment = process.argv.includes('--fragment');

const fonts = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600&family=Nunito:wght@400;600;700;800;900&family=Pacifico&display=swap';
const css = read('css/style.css');
const js = ['js/data.js', 'js/logic.js', 'js/render.js', 'js/audio.js', 'js/profiles.js', 'js/minigames.js', 'js/ui.js'].map(read).join('\n');
const body = `<div id="app"></div>\n<script>\n${js}\n</script>`;
const head = `<title>Mie's Atelier</title>\n<link rel="stylesheet" href="${fonts}">\n<style>\n${css}\n</style>`;

const html = fragment
  ? `${head}\n${body}\n`
  : `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="theme-color" content="#2f1d2b">\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', fragment ? 'mies-atelier.fragment.html' : 'mies-atelier.html');
fs.writeFileSync(out, html);
console.log(`wrote ${path.relative(root, out)} (${(html.length / 1024).toFixed(1)} KB)`);
