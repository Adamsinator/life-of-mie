// Bundles the game into one self-contained HTML file: dist/life-of-mie.html
// Usage: node tools/build-single.js [--fragment]   (--fragment omits <html>/<head>/<body> wrappers)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const fragment = process.argv.includes('--fragment');

const fonts = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Quicksand:wght@300..700&family=Fredoka:wght@400;500;600&family=Nunito:wght@400;600;700;800;900&family=Pacifico&display=swap';
const css = read('css/style.css') + '\n' + read('css/akvarel.css');
// the watercolour filters live in index.html, just before the app
const filters = (read('index.html').match(/<svg width="0"[\s\S]*?<\/svg>/) || [''])[0];
const js = ['js/i18n.js', 'js/lang-da.js', 'js/data.js', 'js/logic.js', 'js/stories.js', 'js/render.js', 'js/audio.js', 'js/profiles.js', 'js/minigames.js', 'js/ui.js'].map(read).join('\n');
const body = `<i id="single-file" hidden></i>\n${filters}\n<div id="app"></div>\n<script>\n${js}\n</script>`;
const b64 = f => fs.readFileSync(path.join(root, f)).toString('base64');
const icons = `<link rel="icon" href="data:image/svg+xml;base64,${b64('icons/icon.svg')}">\n<link rel="apple-touch-icon" href="data:image/png;base64,${b64('icons/apple-touch-icon.png')}">`;
const head = `<title>Life of Mie</title>\n${icons}\n<link rel="stylesheet" href="${fonts}">\n<style>\n${css}\n</style>`;

const html = fragment
  ? `${head}\n${body}\n`
  : `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="theme-color" content="#2f1d2b">\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', fragment ? 'life-of-mie.fragment.html' : 'life-of-mie.html');
fs.writeFileSync(out, html);
console.log(`wrote ${path.relative(root, out)} (${(html.length / 1024).toFixed(1)} KB)`);
