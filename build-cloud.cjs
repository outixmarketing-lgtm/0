const fs=require('node:fs');
let html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('style.css','utf8');
const js=['core.js','app.js','cloud.js'].map(p=>fs.readFileSync(p,'utf8')).join('\n');
html=html.slice(0,html.indexOf('<style>')+7)+css+html.slice(html.indexOf('</style>'));
html=html.slice(0,html.indexOf('<script>')+8)+js+html.slice(html.indexOf('</script>'));
fs.mkdirSync('public',{recursive:true});fs.writeFileSync('public/index.html',html);
fs.copyFileSync('airix-logo.svg','public/airix-logo.svg');
