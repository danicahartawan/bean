import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL, URL as NodeURL } from 'node:url';
import { resolve, dirname } from 'node:path';

const snapshotPath = fileURLToPath(new NodeURL('../forecasting-products.json', import.meta.url));
export function publicText(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(?:li|p|div|h[1-6]|tr)>|<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_,hex,decimal) => String.fromCodePoint(parseInt(hex || decimal, hex ? 16 : 10)))
    .normalize('NFKC');
}
export function parsePublicRanking(html, brand) {
  const text = publicText(html);
  const beginning = text.indexOf('注目ランキング');
  if (beginning < 0) throw new Error('Public ranking section was not found; the source layout may have changed.');
  const section = text.slice(beginning).split('グラフの閲覧')[0];
  const purchaseStart = section.indexOf('3ヶ月内購入');
  const repeatStart = section.indexOf('再購入意向');
  if (purchaseStart < 0 || repeatStart < 0) throw new Error('Expected public metric headings were not found.');
  const normalized = brand.normalize('NFKC').replace(/\s/g, '');
  function rate(block) {
    const line = block.split('\n').find(value => value.replace(/\s/g, '').includes(normalized) && /\d+(?:\.\d+)?\s*%/.test(value));
    return line ? Number(line.match(/(\d+(?:\.\d+)?)\s*%/)[1]) : null;
  }
  return { purchase: rate(section.slice(purchaseStart, repeatStart)), repeat: rate(section.slice(repeatStart)) };
}

export async function refresh({ inputDirectory } = {}) {
  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
  const responses = await Promise.all(snapshot.sources.map(async source => {
    if (inputDirectory) return [source.id, await readFile(resolve(inputDirectory, source.id + '.html'), 'utf8')];
    const response = await fetch(source.url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'BeanResearch/1.0 (public article rankings only)' } });
    if (!response.ok) throw new Error(`${source.id}: HTTP ${response.status}. Saved snapshot is unchanged.`);
    return [source.id, await response.text()];
  }));
  const pages = new Map(responses);
  const products = snapshot.products.map(product => {
    const current = parsePublicRanking(pages.get(product.source), product.match);
    const previous = parsePublicRanking(pages.get(product.previousSource), product.match);
    return { ...product, ...current, previousPurchase: previous.purchase, previousRepeat: previous.repeat };
  });
  if (products.filter(product => product.purchase !== null || product.repeat !== null).length !== products.length) {
    throw new Error('A product has no public metrics. Review the source before replacing the saved snapshot.');
  }
  const next = { ...snapshot, collectedAt: new Date().toISOString().slice(0,10), collectionMethod: inputDirectory ? 'Parsed locally captured public article HTML' : 'Fetched and parsed public article HTML', products };
  const temporary = resolve(dirname(snapshotPath), '.forecasting-products.tmp.json');
  await writeFile(temporary, JSON.stringify(next,null,2) + '\n');
  await rename(temporary,snapshotPath);
  return next;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const flag = process.argv.indexOf('--input-dir');
  refresh({ inputDirectory: flag >= 0 ? process.argv[flag + 1] : undefined }).then(result => console.log(`Updated ${result.products.length} products from ${result.sources.length} public reports.`)).catch(error => {
    console.error(error.message);
    console.error('No paid content is accessed. The dated snapshot remains available when publishers reject automated requests.');
    process.exitCode = 1;
  });
}
