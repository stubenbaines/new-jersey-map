function copyComputedStyles(source: Element, target: Element): void {
  const computed = window.getComputedStyle(source);
  const styleProps = [
    'fill',
    'stroke',
    'stroke-width',
    'stroke-linejoin',
    'stroke-linecap',
    'vector-effect',
    'paint-order',
    'font-family',
    'font-size',
    'font-weight',
    'letter-spacing',
    'text-anchor',
    'text-transform',
    'opacity',
  ];

  const styleText = styleProps
    .map((prop) => `${prop}:${computed.getPropertyValue(prop)};`)
    .join('');

  if (styleText) {
    target.setAttribute('style', styleText);
  }

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  for (let index = 0; index < sourceChildren.length; index += 1) {
    if (!targetChildren[index]) {
      continue;
    }
    copyComputedStyles(sourceChildren[index], targetChildren[index]);
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formatDateForFile(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function appendProgressLabel(svgElement: SVGSVGElement, label: string): void {
  const namespace = 'http://www.w3.org/2000/svg';
  const viewBoxParts = svgElement.getAttribute('viewBox')?.split(/\s+/).map(Number) ?? [];
  const width = Number.isFinite(viewBoxParts[2]) && viewBoxParts[2] > 0
    ? viewBoxParts[2]
    : Number(svgElement.getAttribute('width')) || 900;
  const padding = 14;
  const labelWidth = Math.min(width - padding * 2, Math.max(190, label.length * 7.2 + 24));
  const labelHeight = 30;
  const x = width - padding - labelWidth;
  const y = padding;

  const group = document.createElementNS(namespace, 'g');
  group.setAttribute('aria-label', 'Visited municipality progress');

  const background = document.createElementNS(namespace, 'rect');
  background.setAttribute('x', `${x}`);
  background.setAttribute('y', `${y}`);
  background.setAttribute('width', `${labelWidth}`);
  background.setAttribute('height', `${labelHeight}`);
  background.setAttribute('rx', '15');
  background.setAttribute('fill', '#ffffff');
  background.setAttribute('stroke', '#c8d4e5');
  background.setAttribute('stroke-width', '1');

  const text = document.createElementNS(namespace, 'text');
  text.textContent = label;
  text.setAttribute('x', `${x + labelWidth / 2}`);
  text.setAttribute('y', `${y + 20}`);
  text.setAttribute('fill', '#1a2432');
  text.setAttribute('font-family', 'Avenir Next, Trebuchet MS, Segoe UI, sans-serif');
  text.setAttribute('font-size', '13');
  text.setAttribute('font-weight', '700');
  text.setAttribute('text-anchor', 'middle');

  group.append(background, text);
  svgElement.append(group);
}

export async function exportSvgAsPng(svgElement: SVGSVGElement, progressLabel?: string): Promise<void> {
  const rect = svgElement.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const ratio = window.devicePixelRatio > 1 ? window.devicePixelRatio : 1;

  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  copyComputedStyles(svgElement, clonedSvg);
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clonedSvg.setAttribute('width', `${width}`);
  clonedSvg.setAttribute('height', `${height}`);
  if (progressLabel) {
    appendProgressLabel(clonedSvg, progressLabel);
  }

  const serialized = new XMLSerializer().serializeToString(clonedSvg);
  const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;

  const image = new Image();
  image.decoding = 'async';

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Could not rasterize map SVG for export.'));
    image.src = encoded;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width * ratio));
  canvas.height = Math.max(1, Math.floor(height * ratio));
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not initialize canvas for export.');
  }

  context.scale(ratio, ratio);
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('Could not produce PNG data from canvas.');
  }

  triggerDownload(blob, `nj-visits-${formatDateForFile(new Date())}.png`);
}
