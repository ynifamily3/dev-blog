import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const outputRoot = resolve(process.cwd(), 'public/generated');
const postsRoot = resolve(process.cwd(), 'content/posts');

function hash(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 20);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function titleFromMeta(meta) {
  return /(?:^|\s)(?:title|filename)="([^"]+)"/.exec(meta ?? '')?.[1];
}

async function renderMermaid(node) {
  const id = hash(node.value);
  const outputDir = join(outputRoot, 'mermaid');
  const output = join(outputDir, `${id}.svg`);
  await mkdir(outputDir, { recursive: true });

  if (!(await exists(output))) {
    const workDir = await mkdtemp(join(tmpdir(), 'miel-mermaid-'));
    const input = join(workDir, 'diagram.mmd');
    try {
      await writeFile(input, node.value);
      await execFileAsync(resolve(process.cwd(), 'node_modules/.bin/mmdc'), [
        '--input', input,
        '--output', output,
        '--theme', 'neutral',
        '--backgroundColor', 'transparent',
      ]);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  const title = titleFromMeta(node.meta) ?? '문서 흐름 다이어그램';
  return `<figure class="document-figure diagram-figure"><img src="/generated/mermaid/${id}.svg" alt="${escapeHtml(title)}" loading="lazy" decoding="async"><figcaption>${escapeHtml(title)}</figcaption></figure>`;
}

async function renderFigure(node, file) {
  const { src, alt, caption = '' } = node.attributes ?? {};
  if (!src || alt === undefined) {
    throw new Error(`${file.path}: figure에는 src와 alt가 필요합니다.`);
  }
  if (src.startsWith('/') || /^\w+:/.test(src)) {
    throw new Error(`${file.path}: figure src는 로컬 상대 경로여야 합니다.`);
  }

  const input = resolve(dirname(file.path), src);
  if (!input.startsWith(`${postsRoot}${sep}`)) {
    throw new Error(`${file.path}: figure 이미지는 content/posts 안에 두세요.`);
  }

  const extension = extname(input).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(extension)) {
    throw new Error(`${file.path}: figure는 PNG 또는 JPEG를 사용하세요.`);
  }

  const buffer = await readFile(input);
  const id = hash(buffer);
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`${file.path}: 이미지 크기를 읽을 수 없습니다: ${src}`);
  }

  const outputDir = join(outputRoot, 'images');
  await mkdir(outputDir, { recursive: true });
  const sourceName = `${id}${extension === '.jpeg' ? '.jpg' : extension}`;
  const sourceOutput = join(outputDir, sourceName);
  if (!(await exists(sourceOutput))) await writeFile(sourceOutput, buffer);

  const widths = [...new Set([480, 720, 1080, metadata.width].filter((width) => width <= metadata.width))].sort((a, b) => a - b);
  const sources = [];

  for (const format of ['avif', 'webp']) {
    const candidates = [];
    for (const width of widths) {
      const name = `${id}-${width}.${format}`;
      const output = join(outputDir, name);
      if (!(await exists(output))) {
        const resized = sharp(buffer).resize({ width, withoutEnlargement: true });
        await (format === 'avif' ? resized.avif({ quality: 55 }) : resized.webp({ quality: 78 })).toFile(output);
      }
      candidates.push(`/generated/images/${name} ${width}w`);
    }
    sources.push(`<source type="image/${format}" srcset="${candidates.join(', ')}" sizes="(max-width: 720px) 100vw, 720px">`);
  }

  return `<figure class="document-figure"><picture>${sources.join('')}<img src="/generated/images/${sourceName}" alt="${escapeHtml(alt)}" width="${metadata.width}" height="${metadata.height}" loading="lazy" decoding="async"></picture>${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}</figure>`;
}

async function transformChildren(parent, file) {
  if (!Array.isArray(parent.children)) return;
  const transformed = [];

  for (const node of parent.children) {
    if (node.type === 'code' && node.lang === 'mermaid') {
      transformed.push({ type: 'html', value: await renderMermaid(node) });
      continue;
    }

    if (node.type === 'code' && titleFromMeta(node.meta)) {
      const title = titleFromMeta(node.meta);
      transformed.push({ type: 'html', value: `<figure class="code-figure"><figcaption>${escapeHtml(title)}</figcaption>` });
      transformed.push({ ...node, meta: null });
      transformed.push({ type: 'html', value: '</figure>' });
      continue;
    }

    if (node.type === 'leafDirective' && node.name === 'figure') {
      transformed.push({ type: 'html', value: await renderFigure(node, file) });
      continue;
    }

    if (node.type === 'containerDirective' && node.name === 'callout') {
      const tone = node.attributes?.tone ?? 'note';
      if (!['note', 'tip', 'warning', 'danger'].includes(tone)) {
        throw new Error(`${file.path}: 지원하지 않는 callout tone: ${tone}`);
      }
      const title = node.attributes?.title ?? ({
        note: '참고', tip: '팁', warning: '주의', danger: '위험',
      })[tone];
      node.data = {
        ...node.data,
        hName: 'aside',
        hProperties: { className: ['callout', `callout-${tone}`] },
      };
      node.children.unshift({
        type: 'paragraph',
        data: { hProperties: { className: ['callout-title'] } },
        children: [{ type: 'text', value: title }],
      });
    }

    await transformChildren(node, file);
    transformed.push(node);
  }

  parent.children = transformed;
}

export function remarkDocument() {
  return async (tree, file) => {
    await transformChildren(tree, file);
  };
}

function plainText(node) {
  if (node.type === 'text') return node.value;
  return (node.children ?? []).map(plainText).join('');
}

function transformHtml(node) {
  if (!Array.isArray(node.children)) return;

  for (const child of node.children) {
    if (child.type === 'element' && /^h[2-6]$/.test(child.tagName) && child.properties?.id && child.properties.id !== 'footnote-label') {
      const title = plainText(child);
      child.children.push({
        type: 'element',
        tagName: 'a',
        properties: {
          className: ['heading-permalink'],
          href: `#${child.properties.id}`,
          ariaLabel: `${title} 항목 링크`,
        },
        children: [{ type: 'text', value: '#' }],
      });
    }

    if (child.type === 'element' && child.tagName === 'a' && /^https?:\/\//.test(String(child.properties?.href ?? ''))) {
      const url = new URL(String(child.properties.href));
      if (url.hostname !== 'blog.miel.ing') {
        child.properties.className = [...(child.properties.className ?? []), 'external-link'];
        child.properties.rel = ['external'];
        child.children.push({
          type: 'element', tagName: 'span', properties: { ariaHidden: 'true' },
          children: [{ type: 'text', value: ' ↗' }],
        });
      }
    }

    transformHtml(child);
  }

  node.children = node.children.map((child) => {
    if (child.tagName !== 'table') return child;

    const head = child.children?.find((section) => section.tagName === 'thead');
    if (head) {
      visit(head, (cell) => {
        if (cell.tagName === 'th') cell.properties = { ...cell.properties, scope: 'col' };
      });
    }

    return {
      type: 'element', tagName: 'div',
      properties: { className: ['table-scroll'], role: 'region', ariaLabel: '좌우로 스크롤할 수 있는 표', tabIndex: 0 },
      children: [child],
    };
  });
}

function visit(node, callback) {
  callback(node);
  for (const child of node.children ?? []) visit(child, callback);
}

function footnoteText(node) {
  if (node.properties && (Object.hasOwn(node.properties, 'dataFootnoteBackref') || Object.hasOwn(node.properties, 'data-footnote-backref'))) return '';
  if (node.properties?.ariaHidden === 'true') return '';
  if (node.type === 'text') return node.value;
  const content = (node.children ?? []).map(footnoteText).join('');
  return ['p', 'li', 'blockquote', 'pre'].includes(node.tagName) ? `${content} ` : content;
}

function addFootnotePreviews(tree) {
  const notes = new Map();
  visit(tree, (node) => {
    if (node.tagName === 'li' && String(node.properties?.id ?? '').startsWith('user-content-fn-')) {
      notes.set(node.properties.id, footnoteText(node).replace(/\s+/g, ' ').trim());
    }
  });

  let hasPreviews = false;
  function addToChildren(parent) {
    if (!Array.isArray(parent.children)) return;
    const children = [];
    for (const child of parent.children) {
      children.push(child);
      const ref = child.tagName === 'sup' && child.children?.find((node) =>
        node.tagName === 'a' && node.properties && (Object.hasOwn(node.properties, 'dataFootnoteRef') || Object.hasOwn(node.properties, 'data-footnote-ref')));
      const noteId = ref?.properties?.href?.slice(1);
      let decodedId = noteId;
      try { decodedId = decodeURIComponent(noteId ?? ''); } catch { /* Keep the original fragment. */ }
      const note = notes.get(noteId) ?? notes.get(decodedId);
      if (note && ref.properties.id) {
        const previewId = `footnote-preview-${ref.properties.id}`;
        const characters = Array.from(note);
        const excerpt = characters.length > 320 ? `${characters.slice(0, 319).join('').trimEnd()}…` : note;
        ref.properties.interestfor = previewId;
        const describedBy = ref.properties.ariaDescribedBy ?? ref.properties['aria-describedby'] ?? 'footnote-label';
        delete ref.properties['aria-describedby'];
        ref.properties.ariaDescribedBy = `${Array.isArray(describedBy) ? describedBy.join(' ') : describedBy} ${previewId}`;
        children.push({
          type: 'element', tagName: 'span',
          properties: { id: previewId, popover: 'hint', role: 'tooltip', className: ['footnote-preview'] },
          children: [
            { type: 'element', tagName: 'span', properties: { className: ['footnote-preview-label'] }, children: [{ type: 'text', value: `각주 ${plainText(ref)}` }] },
            { type: 'element', tagName: 'span', properties: { className: ['footnote-preview-text'] }, children: [{ type: 'text', value: excerpt }] },
          ],
        });
        hasPreviews = true;
      }
      addToChildren(child);
    }
    parent.children = children;
  }
  addToChildren(tree);
  if (hasPreviews) {
    tree.children.push({
      type: 'element', tagName: 'script',
      properties: { src: '/scripts/footnote-previews.js', defer: true }, children: [],
    });
  }
}

export function rehypeDocument() {
  return (tree) => {
    transformHtml(tree);
    addFootnotePreviews(tree);
  };
}
