import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const article = await readFile(new URL('posts/document-showcase/all-document-elements/index.html', dist), 'utf8');
const shortArticle = await readFile(new URL('posts/document-navigation/short-document/index.html', dist), 'utf8');
const archive = await readFile(new URL('archive/index.html', dist), 'utf8');
const sitemap = await readFile(new URL('sitemap.xml', dist), 'utf8');
const rss = await readFile(new URL('rss.xml', dist), 'utf8');
const alias = await readFile(new URL('posts/document-showcase/all-elements/index.html', dist), 'utf8');

for (const [name, pattern] of Object.entries({
  '목차': /aria-label="이 글의 목차"/,
  '제목 고정 링크': /class="heading-permalink"/,
  '파일 이름이 있는 코드': /<figure class="code-figure"><figcaption>src\/core\/document\.ts<\/figcaption>/,
  '스크롤 가능한 표': /<div class="table-scroll" role="region" aria-label="좌우로 스크롤할 수 있는 표" tabindex="0">\s*<table>/,
  '표 열 제목': /<th align="right" scope="col">우선순위<\/th>/,
  '각주': /<h2 class="footnote-heading" id="footnote-label">각주<\/h2>/,
  '각주 되돌아가기': /aria-label="본문의 각주 1로 돌아가기"/,
  '각주 미리보기': /interestfor="footnote-preview-user-content-fnref-footnote"[^>]*>1<\/a><\/sup><span id="footnote-preview-user-content-fnref-footnote" popover="hint" role="tooltip"/,
  '반응형 이미지': /<picture><source type="image\/avif"[^>]+><source type="image\/webp"/,
  '고정 이미지 크기': /<img[^>]+width="1200" height="630"/,
  '브라우저 기본 재생 컨트롤': /<figure class="document-figure video-figure" style="--video-width:600px;--video-ratio:600 \/ 582"><video controls playsinline preload="none" width="600" height="582" aria-label="Geist 글꼴 소개 영상">/,
  '비디오 샘플 자산': /<source src="https:\/\/k2mkucxia43oc7fa\.public\.blob\.vercel-storage\.com\/front\/geist-font-page\/videos\/dark\/geist\.mp4" type="video\/mp4">/,
  '정적 다이어그램': /<figure class="document-figure diagram-figure"><img src="\/generated\/mermaid\/[a-f0-9]+\.svg"/,
  '이전 글': /aria-label="이전 글과 다음 글"/,
})) {
  assert.match(article, pattern, `${name} 출력이 없습니다.`);
}

for (const tone of ['note', 'tip', 'warning', 'danger']) {
  assert.match(article, new RegExp(`class="callout callout-${tone}"`));
}

assert.match(article, /<script src="\/scripts\/footnote-previews\.js" defer><\/script>/);
assert.doesNotMatch(article.replace('<script src="/scripts/footnote-previews.js" defer></script>', ''), /<script(?:\s|>)/i, '각주 미리보기 외의 클라이언트 JavaScript가 포함되었습니다.');
assert.doesNotMatch(shortArticle, /<script(?:\s|>)/i, '각주가 없는 글에 JavaScript가 포함되었습니다.');
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
await access(new URL('scripts/footnote-previews.js', dist));

console.log('실험 글과 탐색 페이지의 정적 빌드 검증 완료');
