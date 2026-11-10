import market from './forecasting-products.json';
export { market };
export const DEFAULT_ASSETS = [
  { name: 'Station', cost: 950000, acquired: '2023-04-01', lifeYears: 5, residual: 0 },
  { name: 'Office', cost: 880000, acquired: '2024-04-01', lifeYears: 5, residual: 0 },
  { name: 'Park', cost: 760000, acquired: '2021-12-01', lifeYears: 5, residual: 0 }
];
export const DEPRECIATION_SOURCES = [
  { title: 'National Tax Agency — depreciation overview', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2100.htm' },
  { title: 'Ina City — asset lives, vending machines: 5 years', url: 'https://www.inacity.jp/kurashi/zeikin/koteishisanzei/tetsuzuki/syoukyakusisan002.html' }
];
export function validAsset(asset) {
  return asset && DEFAULT_ASSETS.some(item => item.name === asset.name) && Number.isFinite(asset.cost) && asset.cost > 0 &&
    Number.isFinite(asset.residual) && asset.residual >= 0 && asset.residual < asset.cost &&
    Number.isInteger(asset.lifeYears) && asset.lifeYears >= 1 && asset.lifeYears <= 20 &&
    /^\d{4}-\d{2}-\d{2}$/.test(asset.acquired) && Number.isFinite(Date.parse(asset.acquired)) && new Date(asset.acquired + 'T00:00:00Z').toISOString().slice(0,10) === asset.acquired;
}
export function readAssets() {
  try {
    const saved = JSON.parse(localStorage.getItem('bean-forecast-assets') || '[]');
    return DEFAULT_ASSETS.map(asset => Array.isArray(saved) ? saved.find(item => item.name === asset.name && validAsset(item)) ?? asset : asset);
  } catch { return DEFAULT_ASSETS; }
}
export function monthPosition(date) {
  const value = new Date(date + 'T00:00:00Z');
  const days = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
  return value.getUTCFullYear() * 12 + value.getUTCMonth() + (value.getUTCDate() - 1) / days;
}
export function bookValue(asset, date) {
  const elapsed = Math.max(0, monthPosition(date) - monthPosition(asset.acquired));
  // Assets enter the planning ledger on the acquisition date.
  if (date < asset.acquired) return 0;
  return Math.max(asset.residual, asset.cost - elapsed * (asset.cost - asset.residual) / (asset.lifeYears * 12));
}
export function periodExpense(asset, start, endExclusive) {
  const from = start < asset.acquired ? asset.acquired : start;
  if (endExclusive <= asset.acquired) return 0;
  return Math.max(0, bookValue(asset, from) - bookValue(asset, endExclusive));
}
export function endOfLife(asset) {
  const date = new Date(asset.acquired + 'T00:00:00Z');
  const year = date.getUTCFullYear() + asset.lifeYears, month = date.getUTCMonth();
  const day = Math.min(date.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}
export function forecastDates(mode) {
  const date = offset => new Date(Date.UTC(2026, 10, 9 + offset)).toISOString().slice(0,10);
  if (mode === 'day') return Array.from({length:7},(_,i)=>({start:date(i),end:date(i+1),days:1}));
  if (mode === 'week') return Array.from({length:8},(_,i)=>({start:date(i*7),end:date((i+1)*7),days:7}));
  return [{start:'2026-11-09',end:'2026-12-01',days:22},{start:'2026-12-01',end:'2027-01-01',days:31},{start:'2027-01-01',end:'2027-01-04',days:3}];
}
export function productChange(product, metric) {
  const key = metric === 'repeat' ? 'repeat' : 'purchase';
  const previous = key === 'repeat' ? product.previousRepeat : product.previousPurchase;
  return product[key] === null || previous === null ? null : Math.round((product[key] - previous) * 10) / 10;
}
export function productUnits(product, machine, mode, lows, temperature) {
  const scale = {Station:1.2,Office:1,Park:.65}[machine];
  return forecastDates(mode).map((period,i) => {
    const weather = temperature ?? lows[i];
    const season = Math.max(.45, 1 + (weather - 14) * .025);
    const officeWeekend = machine === 'Office' && mode === 'day' && i > 4 ? .3 : 1;
    return Math.max(0, Math.round(product.sampleUnitsPerDay * scale * period.days * season * officeWeekend));
  });
}
export function secondaryReply(topic, prompt, context) {
  const query = prompt.toLowerCase();
  if (topic === 'products') {
    const product = market.products.find(item => query.includes(item.name.toLowerCase()) || query.includes(item.id)) ?? context.product;
    const change = productChange(product, 'purchase');
    if (/which products|stronger|weaker|best|worst|declin|riser/.test(query)) {
      const sorted = market.products.filter(item => productChange(item,'purchase') !== null).sort((a,b)=>productChange(b,'purchase')-productChange(a,'purchase'));
      const strongest=sorted[0], weakest=sorted[sorted.length-1];
      return `In this snapshot, ${strongest.name} has the strongest increase in recent-purchase rate (+${productChange(strongest,'purchase')} percentage points), while ${weakest.name} has the largest fall (${productChange(weakest,'purchase')} points). These compare published national consumer surveys across categories. Use a small stocking trial to check your own machine.`;
    }
    if (/source|internet|scrap|research|where/.test(query)) return `The saved snapshot was collected on ${market.collectedAt} from public JMR consumer surveys. These measure recent purchases and repeat-buying intention across retail channels. They do not measure this vending machine’s sales. Open Sources for publication dates and original links.`;
    const selectedMachine = ['Station','Office','Park'].find(name=>query.includes(name.toLowerCase())) ?? context.machine;
    if (/unit|load|sell|forecast|stock/.test(query)) return `${product.name} at ${selectedMachine}: about ${productUnits(product,selectedMachine,context.mode,context.lows,context.temperature)[context.index]} units in the selected ${context.mode}. This is a sample stocking scenario using a ${product.sampleUnitsPerDay}-unit daily assumption, location and weather; it is not a published sales forecast.`;
    return `${product.name}: ${product.purchase === null ? 'recent-purchase rate is not publicly listed in this excerpt' : product.purchase + '% bought it in the survey’s previous three months'}. ${change === null ? 'No comparable public purchase pair is available.' : 'That is ' + Math.abs(change) + ' percentage points ' + (change >= 0 ? 'higher' : 'lower') + ' than the previous survey.'} ${product.repeat === null ? '' : product.repeat + '% of past buyers intended to buy again.'}`;
  }
  const asset = context.assets.find(item => query.includes(item.name.toLowerCase())) ?? context.asset;
  const period = forecastDates(context.mode)[context.index];
  const dateLabel = date => new Date(date+'T00:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
  const yen = value => '¥' + Math.round(value).toLocaleString('en-US');
  if (/each machine|paid off/.test(query)) return context.assets.map(item=>`${item.name} reaches its residual book value on ${dateLabel(endOfLife(item))}.`).join(' ') + ' These are accounting dates; they do not tell us whether a loan is paid off.';
  if (/all machines/.test(query)) return context.assets.map(item=>`${item.name}: ${yen(periodExpense(item,period.start,period.end))} depreciation for the selected ${context.mode}.`).join(' ') + ' This is cost allocated on the books, not cash leaving your account.';
  if (/replace/.test(query)) return 'Being fully written off does not mean a machine needs replacing. Compare its condition, repair costs and downtime before planning a replacement. The sample asset records do not include those details.';
  if (/cost|life|assum|method|source|tax|calculat/.test(query)) return `${asset.name} uses a sample purchase cost of ${yen(asset.cost)}, acquired ${dateLabel(asset.acquired)}, with a ${asset.lifeYears}-year life and ${yen(asset.residual)} residual. The planning model spreads the cost evenly by month. Book value is an accounting estimate, not a resale quote or a tax filing calculation. Edit asset to use your records.`;
  return `${asset.name} has an estimated book value of ${yen(bookValue(asset,period.start))} on ${dateLabel(period.start)}. Depreciation over the selected ${context.mode} is ${yen(periodExpense(asset,period.start,period.end))}. It reaches its residual value on ${dateLabel(endOfLife(asset))}; this does not mean the machine stops working then.`;
}
