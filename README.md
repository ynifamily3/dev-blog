# miel.ing 개발 블로그

Astro로 생성하는 정적 기술 문서 블로그입니다. 글의 원본은 `content/posts/`의 Markdown 파일입니다.

## 실행

```sh
npm install
npm run dev
npm run check
npm run build
npm run preview
```

## 글 발행

1. `templates/post.md`를 `content/posts/원하는파일명.md`로 복사합니다.
2. 제목, 설명, 태그, 날짜와 본문을 직접 작성합니다.
3. `postId`는 한 번 발행한 뒤 바꾸지 않습니다. `slug`를 바꾸면 이전 값을 `aliases`에 넣습니다.
4. 글을 공개할 때 `draft: false`로 바꾸고 `npm run build`를 확인합니다.

`postId`, `slug`, `aliases`에는 소문자 영문·숫자·하이픈을 사용합니다. 초안은 글 목록, 태그 페이지, RSS, sitemap, 글 경로 어디에도 출력되지 않습니다.

주소는 `/posts/{postId}/{slug}/`입니다. `aliases`는 정적 리디렉션 HTML을 생성합니다. 실제 HTTP 301 응답을 적용하려면 배포 호스트의 리디렉션 규칙이 필요합니다.

사이트 이름과 설명은 `src/site.ts`, 도메인은 `astro.config.mjs`와 `public/robots.txt`에서 관리합니다.

## 이후 단계

- Phase 1: 목차, figure, callout, Mermaid SVG, 이미지 최적화
- Phase 2: 정적 검색, 분석
- Phase 3: 별도 동적 댓글 페이지와 기본 HTML 폼
- Phase 4: 글별 Git revision과 정적 과거 버전 페이지

본문에는 클라이언트 JavaScript가 필요하지 않도록 유지합니다.
