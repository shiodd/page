// 由 .github/workflows/friend-link.yml 的 approve job 调用：
// 解析 Issue 正文，下载名片正/反面图片到 image/meishi/，并追加到 html/data/friends.js。
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const body = process.env.ISSUE_BODY || '';
const issueNumber = process.env.ISSUE_NUMBER || '0';

function field(label) {
  const m = body.match(new RegExp('###\\s*' + label + '\\s*\\n([\\s\\S]*?)(?=\\n###|$)'));
  return m ? m[1].trim() : '';
}

const name = field('名称');
const front = field('名片正面图片链接');
const back = field('名片反面图片链接');

if (!name || !front || !back) {
  console.error('缺少必要字段');
  process.exit(1);
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const get = (u, redirects) => {
      proto.get(u, { headers: { 'User-Agent': 'friend-link-bot' } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          if (redirects > 5) return reject(new Error('重定向过多'));
          const next = new URL(res.headers.location, u).toString();
          return get(next, redirects + 1);
        }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        const ct = res.headers['content-type'] || '';
        const ext = ct.includes('jpeg') ? 'jpg' : 'png';
        const file = dest.replace(/\.(png|jpg)$/i, '.' + ext);
        const f = fs.createWriteStream(file);
        res.pipe(f);
        f.on('finish', () => f.close(() => resolve(file)));
      }).on('error', reject);
    };
    get(url, 0);
  });
}

(async () => {
  const imgDir = path.join(process.cwd(), 'image', 'friends');
  fs.mkdirSync(imgDir, { recursive: true });

  const frontFile = path.join(imgDir, `friend-${issueNumber}-front.png`);
  const backFile = path.join(imgDir, `friend-${issueNumber}-back.png`);
  await download(front, frontFile);
  await download(back, backFile);

  const frontRel = `../image/friends/friend-${issueNumber}-front.png`;
  const backRel = `../image/friends/friend-${issueNumber}-back.png`;

  const dataFile = path.join(process.cwd(), 'html', 'data', 'friends.js');
  let content = fs.readFileSync(dataFile, 'utf8');
  const entry = `    { name: ${JSON.stringify(name)}, front: ${JSON.stringify(frontRel)}, back: ${JSON.stringify(backRel)} },\n    // NEW_FRIEND`;

  if (content.includes('// NEW_FRIEND')) {
    content = content.replace('// NEW_FRIEND', entry);
  } else {
    // 兜底：没有锚点就在末尾 ]; 前插入
    content = content.replace(/];\s*$/, entry + '\n];\n');
  }
  fs.writeFileSync(dataFile, content);
  console.log('已写入友链：' + name);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
