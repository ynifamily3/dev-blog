import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const article = await readFile(new URL('posts/document-showcase/all-document-elements/index.html', dist), 'utf8');
const archive = await readFile(new URL('archive/index.html', dist), 'utf8');
const sitemap = await readFile(new URL('sitemap.xml', dist), 'utf8');
const rss = await readFile(new URL('rss.xml', dist), 'utf8');
const alias = await readFile(new URL('posts/document-showcase/all-elements/index.html', dist), 'utf8');

for (const [name, pattern] of Object.entries({
  '목차': /aria-label="이 글의 목차"/,
  '제목 고정 링크': /class="heading-permalink"/,
  '파일 이름이 있는 코드': /<figure class="code-figure"><figcaption>src\/core\/document\.ts<\/figcaption>/,
  '표': /<table>/,
  '각주': /<h2 class="footnote-heading" id="footnote-label">각주<\/h2>/,
  '각주 되돌아가기': /aria-label="본문의 각주 1로 돌아가기"/,
  '반응형 이미지': /<picture><source type="image\/avif"[^>]+><source type="image\/webp"/,
  '고정 이미지 크기': /<img[^>]+width="1200" height="630"/,
  '정적 다이어그램': /<figure class="document-figure diagram-figure"><img src="\/generated\/mermaid\/[a-f0-9]+\.svg"/,
  '이전 글': /aria-label="이전 글과 다음 글"/,
})) {
  assert.match(article, pattern, `${name} 출력이 없습니다.`);
}

for (const tone of ['note', 'tip', 'warning', 'danger']) {
  assert.match(article, new RegExp(`class="callout callout-${tone}"`));
}

assert.doesNotMatch(article, /<script(?:\s|>)/i, '글을 읽는 데 클라이언트 JavaScript가 포함되었습니다.');
assert.doesNotMatch(article, /<a href="#footnote-label"[^>]*>각주<\/a>/, '각주가 본문 목차에 포함되었습니다.');
assert.match(archive, /document-showcase\/all-document-elements/);
assert.match(sitemap, /document-showcase\/all-document-elements/);
assert.doesNotMatch(sitemap, /document-showcase\/all-elements/);
assert.match(rss, /문서 표현 실험실/);
assert.match(alias, /all-document-elements/);

const diagram = article.match(/src="(\/generated\/mermaid\/[^\"]+\.svg)"/)?.[1];
assert.ok(diagram);
await access(new URL(diagram.slice(1), dist));
const svg = await readFile(new URL(diagram.slice(1), dist), 'utf8');
assert.match(svg, /<svg\b/);

const assets = await readdir(new URL('_astro/', dist));
assert.ok(assets.some((name) => name.endsWith('.webp')), '최적화된 Markdown 이미지가 없습니다.');
assert.ok(!assets.some((name) => name.endsWith('.js')), '본문용 JavaScript 파일이 생성되었습니다.');

console.log('실험 글과 탐색 페이지의 정적 빌드 검증 완료');
