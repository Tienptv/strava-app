const html = require('fs').readFileSync('test_public.html', 'utf8');
const match = html.match(/"profileImageUrl":"([^"]+)"/g);
if (match) {
  console.log(match.join('\n'));
}
