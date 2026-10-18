from pathlib import Path
root = Path(__file__).resolve().parent
p = root / 'index.html'
s = p.read_text()
start = s.index('<style>') + len('<style>')
end = s.index('</style>', start)
s = s[:start] + (root / 'style.css').read_text() + s[end:]
start = s.index('<script>') + len('<script>')
end = s.index('</script>', start)
s = s[:start] + (root / 'core.js').read_text() + '\n' + (root / 'app.js').read_text() + s[end:]
p.write_text(s)
print('Built standalone index.html')
