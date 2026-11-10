import { ReadableChart } from './forecasting-chart.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { market, productChange, productUnits, bookValue, periodExpense, endOfLife, forecastDates, DEPRECIATION_SOURCES, validAsset } from './forecasting-models.js';
const yen = value => '¥' + Math.round(value).toLocaleString('en-US');
const pct = value => value === null ? '—' : value.toFixed(1) + '%';
const points = value => value === null ? '—' : (value > 0 ? '+' : '') + value.toFixed(1) + ' pp';

function Insight({ title, value, note, explanation, explain, action, children, primary = false, sentence }) {
  return <LedgerCard title={title} icon={primary?'book':'pie'} primary={primary} amount={value} sentence={sentence ?? <><strong>{value}</strong> {note}.</>} term={note} explanation={explanation} explain={explain} action={action}>{children}</LedgerCard>;
}

function SignalPair({ previous, current }) {
  return <div className="signal-pair" aria-label={`Previous ${pct(previous)}, latest ${pct(current)}`}>
    <div><i style={{width:previous === null ? 0 : previous + '%'}} /><span>Previous <b>{pct(previous)}</b></span></div>
    <div><i style={{width:current === null ? 0 : current + '%'}} /><span>Latest <b>{pct(current)}</b></span></div>
  </div>;
}

export function ProductPanel({ product, setProduct, machine, mode, index, labels, lows, temperature, view, metric, setMetric, setView, chartStyle, setChartStyle, explain, sources }) {
  const units = productUnits(product,machine,mode,lows,temperature);
  const metricKey = metric === 'repeat' ? 'repeat' : 'purchase';
  const previousKey = metricKey === 'repeat' ? 'previousRepeat' : 'previousPurchase';
  const change = productChange(product,metricKey);
  const source = market.sources.find(item => item.id === product.source);
  function choose(id, nextMetric = metric) { setProduct(id); setMetric(nextMetric); setView('trends'); }
  if (view === 'trends') {
    const local = metric === 'units';
    const line = chartStyle === 'lines';
    const chartLabels = local ? labels : line ? ['Previous survey','Latest survey'] : market.products.map(item => item.name);
    const series = local ? [{name:'Sample units',values:units}] : line ? [{name: metricKey === 'repeat' ? 'Repeat-buying intention' : 'Recent purchase',values:[product[previousKey], product[metricKey]]}]
      : [{name:'Previous survey',values:market.products.map(item => item[previousKey])},{name:'Latest survey',values:market.products.map(item => item[metricKey])}];
    return <SecondaryChart title={local ? product.name + ' · sample unit forecast' : product.name + ' · market signals'} labels={chartLabels} series={series} format={local ? value => String(Math.round(value)) : value => value.toFixed(1) + '%'} selected={local ? index : line ? 1 : market.products.findIndex(item => item.id === product.id)} chartStyle={chartStyle} setChartStyle={setChartStyle} onSelect={local || line ? undefined : i => setProduct(market.products[i].id)} explain={explain}
      note={local ? 'Illustrative stocking scenario · daily assumptions × location × weather · not observed brand sales.' : 'JMR consumer surveys · all retail channels · figures are respondents, not vending sales share. Missing figures are unavailable.'} />;
  }
  return <div className="overview-grid supplemental-grid">
    <Insight sentence={metric === 'units' ? <>Plan for <strong>{units[index]} units</strong> of {product.name} at {machine} this {mode}.</> : product[metricKey] === null ? <>A public {metricKey === 'repeat' ? 'repeat-buying' : 'purchase'} figure for {product.name} is <strong>unavailable</strong>.</> : <><strong>{pct(product[metricKey])}</strong> {metricKey === 'repeat' ? 'of past buyers intend to buy' : 'of respondents recently bought'} {product.name}{metricKey === 'repeat' ? ' again' : ''}.</>} title={product.name} value={metric === 'units' ? units[index] + ' units' : pct(product[metricKey])} primary note={metric === 'units' ? 'Illustrative stocking forecast · ' + mode : metricKey === 'repeat' ? 'Past buyers who intend to buy again' : 'Respondents who bought in the last 3 months'} explain={explain} explanation={`${pct(product[metricKey])} in the public ${source.publishedAt} survey. ${market.scope}.`} action={{label:'Explore market signal',onClick:()=>setView('trends')}}>
      <SignalPair previous={product[previousKey]} current={product[metricKey]} />
    </Insight>
    <Insight sentence={change === null ? <>Comparable public figures are <strong>unavailable</strong>.</> : <>The purchase signal is <strong>{points(change)}</strong> from the previous survey.</>} title="Change since previous survey" value={points(change)} attention={change !== null && change < 0} note={change === null ? 'Comparable public values unavailable' : 'Percentage points · not weekly sales growth'} explain={explain} explanation={`The latest value minus the previous survey value is ${points(change)}. The two surveys use different samples and dates.`} action={{label:'Compare all products',onClick:()=>setView('trends')}} />
    <Insight sentence={<>Plan for <strong>{units[index]} units</strong> of {product.name} at {machine} this {mode}.</>} title={`${machine} · sample stocking`} value={units[index] + ' units'} note={`Illustrative ${mode} · ${product.name}`} explain={explain} explanation={`A sample ${product.sampleUnitsPerDay}-unit daily baseline is scaled by machine location, the period length, and weather. This is a stocking experiment, not measured brand sales.`} action={{label:'View sample forecast',onClick:()=>{setMetric('units');setView('trends');}}} />
    <Insight sentence={<>The research snapshot was collected on <strong>{naturalDate(market.collectedAt)}</strong>.</>} title="Market research snapshot" value="10 Nov" note="Collected 2026 · publisher dates in Sources" explain={explain} explanation="A dated snapshot of the published public research. Open Sources to see dates, metric definitions, and original articles." action={{label:'Sources & definitions',onClick:sources}}><span className="snapshot-count">{market.products.length} products · {market.sources.length} public reports</span></Insight>
    {['mitsuya','yakan','monster','iyemon'].map(id => {
      const item = market.products.find(value => value.id === id);
      const key = id === 'yakan' ? 'repeat' : 'purchase';
      const delta = productChange(item,key);
      return <Insight sentence={<>The {key === 'repeat' ? 'repeat-buying' : 'purchase'} signal for {item.name} changed by <strong>{points(delta)}</strong>.</>} key={id} title={item.name} value={points(delta)} note={key === 'repeat' ? 'Change in repeat-buying intention' : 'Change in recent-purchase rate'} attention={delta < 0} explain={explain} explanation={`${item.name}: ${pct(item[key])} versus ${pct(item[key === 'repeat' ? 'previousRepeat' : 'previousPurchase'])} in the previous public survey. These are national consumer signals, not this machine’s transactions.`} action={{label:'Explore product',onClick:()=>choose(id,key)}}>
        <SignalPair previous={item[key === 'repeat' ? 'previousRepeat' : 'previousPurchase']} current={item[key]} />
      </Insight>;
    })}
  </div>;
}

export function LedgerIcon({kind='book'}) {
  const paths = {book:'M4 3h12v14H4z M7 3v14 M10 7h3 M10 10h3',calendar:'M3 5h14v12H3z M6 3v4 M14 3v4 M3 9h14',pie:'M10 2v8h8 M7 4a8 8 0 1 0 9 9',hourglass:'M5 2h10 M5 18h10 M6 2v4l8 8v4 M14 2v4l-8 8v4',machine:'M5 2h10v16H5z M8 5h4v5H8z M8 14h4',gear:'M10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M10 2v2 M10 16v2 M2 10h2 M16 10h2 M4 4l2 2 M14 14l2 2 M4 16l2-2 M14 6l2-2',note:'M4 2h12v16H4z M7 6h6 M7 10h6 M7 14h4',speaker:'M3 8h3l4-4v12l-4-4H3z M13 7q4 3 0 6'};
  return <svg className="ledger-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>;
}
const naturalDate = (date,monthOnly=false) => new Date(date+'T00:00:00Z').toLocaleDateString('en-US',monthOnly ? {month:'long',year:'numeric',timeZone:'UTC'} : {month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
function LedgerCard({title,icon,sentence,term,action,children,primary=false,amount,explain,explanation}) {
  return <section className={'insight-card ledger-card '+(primary?'primary-insight':'')}>
    <div className="insight-title"><LedgerIcon kind={icon} />{title}</div>
    <p className="ledger-sentence" {...(explanation ? explain(title,explanation) : {})}>{sentence}</p>
    {primary && <div className="insight-stat ledger-amount">{amount}</div>}
    {term && <small className="ledger-term">{term}</small>}{children}
    {action && <button className="card-action" onClick={action.onClick}>{action.label}</button>}
  </section>;
}

export function DepreciationPanel({ assets, machine, mode, index, labels, view, metric, setView, setMachine, edit, chartStyle, setChartStyle, explain, sources }) {
  const [dismissed,setDismissed] = useState(false);
  const [speaking,setSpeaking] = useState(false);
  useEffect(()=>()=>{window.speechSynthesis?.cancel();},[]);
  const periods = forecastDates(mode);
  const asset = assets.find(item => item.name === machine);
  const period = periods[index];
  const value = bookValue(asset,period.start);
  const expense = periodExpense(asset,period.start,period.end);
  const writtenDown = period.start < asset.acquired ? 0 : asset.cost - value;
  const used = Math.round(writtenDown / (asset.cost - asset.residual) * 100);
  if (view === 'trends') {
    const compare = metric === 'compare';
    const lines = compare ? assets : [asset];
    return <SecondaryChart title={compare ? 'Compare machine book values' : machine + (metric === 'expense' ? ' · depreciation expense' : ' · book value')} labels={labels} series={lines.map(item => ({name:item.name,values:periods.map(p => metric === 'expense' ? periodExpense(item,p.start,p.end) : bookValue(item,p.start))}))} format={yen} selected={index} chartStyle={chartStyle} setChartStyle={setChartStyle} explain={explain} note="Sample asset records · straight-line planning estimate · book value is not resale value." />;
  }
  const completed = item => period.start >= endOfLife(item);
  const station=assets.find(item=>item.name==='Station'), office=assets.find(item=>item.name==='Office'), park=assets.find(item=>item.name==='Park');
  const noteText = `${completed(park) ? 'Park is fully written off.' : 'Park will be fully written off by '+naturalDate(endOfLife(park),true)+'.'} Station will be by ${naturalDate(endOfLife(station),true)}; Office by ${new Date(endOfLife(office)).getUTCFullYear()}.`;
  function listen() {
    if(!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    window.speechSynthesis.cancel();
    if(speaking) {setSpeaking(false);return;}
    const utterance = new SpeechSynthesisUtterance(noteText);
    utterance.rate=.9;utterance.onend=()=>setSpeaking(false);utterance.onerror=()=>setSpeaking(false);
    window.speechSynthesis.speak(utterance);setSpeaking(true);
  }
  return <div className="overview-grid supplemental-grid ledger-grid">
    <section className="insight-card ledger-card bean-note">
      <div className="insight-title"><LedgerIcon kind="note" />Bean’s note</div>
      <p className="ledger-sentence">{dismissed ? 'Your note is tucked away.' : noteText}</p>
      <div className="note-actions">{!dismissed && <button onClick={listen} disabled={typeof window.speechSynthesis === 'undefined'}><LedgerIcon kind="speaker" />{speaking?'Stop':'Listen'}</button>}<button onClick={()=>{setDismissed(!dismissed);window.speechSynthesis?.cancel();setSpeaking(false);}}>{dismissed?'Show note':'Dismiss'}</button></div>
    </section>
    <LedgerCard title={machine} icon="book" primary amount={yen(value)} sentence={<>{machine} is worth <strong>{yen(value)}</strong> on the books, as of {naturalDate(period.start)}.</>} term="Book value" explain={explain} explanation={`Cost ${yen(asset.cost)}, acquired ${naturalDate(asset.acquired)}. Cost is spread over ${asset.lifeYears} years to ${yen(asset.residual)} residual value.`} action={{label:'See machine',onClick:()=>setView('trends')}} />
    <LedgerCard title="Cost over time" icon="calendar" sentence={<>This {mode}’s depreciation is <strong>{yen(expense)}</strong>. No cash leaves your account.</>} term="Depreciation expense" action={{label:'See how it’s calculated',onClick:()=>edit(machine)}} />
    <LedgerCard title="Cost written off" icon="pie" sentence={<><strong>{Math.min(100,used)}%</strong> of {machine}’s cost is written off (<strong>{yen(writtenDown)}</strong>).</>} term="Accumulated depreciation" action={{label:'See the breakdown',onClick:()=>edit(machine)}}>
      <div className="asset-life-track"><i style={{width:Math.min(100,used)+'%'}} /></div>
    </LedgerCard>
    <LedgerCard title="End of the planned life" icon="hourglass" sentence={<>{machine} {completed(asset)?'was':'is'} {asset.residual===0?'fully written off':'at its remaining book value'} by <strong>{naturalDate(endOfLife(asset),true)}</strong>. It can keep working after.</>} term={asset.residual===0?'Useful life':'Residual value '+yen(asset.residual)} action={{label:'Review useful life',onClick:()=>edit(machine)}} />
    {assets.filter(item=>item.name!==machine).map(item=><LedgerCard key={item.name} title={item.name} icon="machine" sentence={<>{completed(item)&&item.residual===0 ? <strong>Fully written off.</strong> : <>Worth <strong>{yen(bookValue(item,period.start))}</strong> on the books.</>} Cost {yen(item.cost)}, {item.lifeYears}-year life.</>} term="Book value" action={{label:'See machine',onClick:()=>{setMachine(item.name);setView('trends');}}}>
      <div className="asset-life-track"><i style={{width:Math.min(100,Math.max(0,100*(item.cost-bookValue(item,period.start))/(item.cost-item.residual)))+'%'}} /></div>
    </LedgerCard>)}
    <LedgerCard title="How it works" icon="gear" sentence={<>Calculated <strong>straight-line</strong> over {asset.lifeYears} years. You can change the life.</>} term="Straight-line" action={{label:'See the method',onClick:sources}} />
  </div>;
}

export function SecondaryChart({ title, labels, series, format, selected, chartStyle, setChartStyle, onSelect, explain, note }) {
  const values = series.flatMap(item => item.values).filter(value => value !== null && Number.isFinite(value));
  const maximum = Math.max(...values,1) * 1.12;
  const x = index => 65 + (labels.length === 1 ? 335 : index * 665 / (labels.length - 1));
  const y = value => 230 - value / maximum * 195;
  function path(data) {
    let previous = false;
    return data.map((value,index) => {
      if (value === null) { previous = false; return ''; }
      const command = previous ? 'L' : 'M'; previous = true;
      return `${command}${x(index)},${y(value)}`;
    }).join(' ');
  }
  return <div className="forecast-dashboard secondary-chart-wrapper"><section className="visual-card overview-card">
    <div className="overview-heading"><h2>{title}</h2><div className="chart-view-toggle" role="group" aria-label="Chart style">{['bars','lines'].map(style => <button key={style} aria-pressed={chartStyle===style} onClick={()=>setChartStyle(style)}>{style === 'bars' ? 'Bars' : 'Lines'}</button>)}</div>
      <div className="overview-legend">{series.map((item,index)=><span key={item.name}><i className={'compare-key key-'+index} />{item.name}</span>)}</div>
    </div>
    <ReadableChart className="overview-chart" viewBox="0 0 800 290" preserveAspectRatio="none" role="img" aria-label={title}>
      {[0,.25,.5,.75,1].map(fraction=><g key={fraction}><path d={`M65 ${y(maximum*fraction)}H750`} className="overview-grid" /><text x="52" y={y(maximum*fraction)+4} textAnchor="end">{format(maximum*fraction)}</text></g>)}
      {series.map((item,seriesIndex)=><g key={item.name} className={'secondary-series series-'+seriesIndex}>
        {chartStyle === 'lines' && <path d={path(item.values)} className="secondary-line" />}
        {item.values.map((value,index)=>value === null ? null : <g key={index}>
          {chartStyle === 'bars' ? <path d={`M${x(index)+(seriesIndex-(series.length-1)/2)*9},230V${y(value)}`} className="secondary-bar" /> : <circle cx={x(index)} cy={y(value)} r={selected===index?5:3} />}
          <rect x={x(index)-15} y={Math.max(20,y(value)-12)} width="30" height={Math.max(25,242-y(value))} fill="transparent" role="button" aria-label={`${item.name}, ${labels[index]}, ${format(value)}`} {...explain(item.name+', '+labels[index],`${format(value)}. ${note}`)} onClick={()=>onSelect?.(index)} />
        </g>)}
      </g>)}
      {labels.map((label,index)=><text key={label} x={x(index)} y="255" textAnchor="middle" className={labels.length>6?'dense-chart-label':''} {...explain(label,note)}>{label.length > 15 ? label.slice(0,13)+'…' : label}</text>)}
    </ReadableChart><p className="source-scope-note">{note}</p>
  </section></div>;
}

export function ResearchDialog({ open, onClose }) {
  const ref = useRef(null);
  useEffect(()=>{if(open)ref.current?.showModal();else ref.current?.close();},[open]);
  return <dialog className="research-dialog" ref={ref} onCancel={onClose} onClose={onClose}>
    <div className="load-heading"><h2>Sources & assumptions</h2><button aria-label="Close sources" onClick={onClose}>×</button></div>
    <p>Product snapshot collected {market.collectedAt}. Public JMR surveys cover Japanese consumers across retail channels. A purchase rate is the percentage who bought a brand in the prior three months; repeat intention is measured among past buyers.</p>
    <p>Changes are percentage points between published surveys, not week-on-week machine sales. Missing public figures stay blank. Sample unit forecasts use sample stocking assumptions and weather.</p>
    <table><thead><tr><th>Product</th><th>Recent purchase</th><th>Previous</th><th>Change</th><th>Repeat intention</th></tr></thead><tbody>{market.products.map(item=><tr key={item.id}><td>{item.name}</td><td>{pct(item.purchase)}</td><td>{pct(item.previousPurchase)}</td><td>{points(productChange(item,'purchase'))}</td><td>{pct(item.repeat)}</td></tr>)}</tbody></table>
    <h3>Original public articles</h3><ul>{market.sources.map(source=><li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · published {source.publishedAt}{source.sampleSize ? ' · n='+source.sampleSize.toLocaleString() : ''}</li>)}</ul>
    <h3>Depreciation model</h3><p>Sample purchase records. Straight-line cost allocation by calendar month, prorated within a month, with an editable residual value. The book value is not a resale estimate or a tax filing calculation.</p><ul>{DEPRECIATION_SOURCES.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul>
  </dialog>;
}

export function AssetEditor({ asset, onClose, onSave }) {
  const ref = useRef(null);
  const [draft,setDraft] = useState(asset);
  const [error,setError] = useState('');
  useEffect(()=>{setDraft(asset);setError('');if(asset)ref.current?.showModal();else ref.current?.close();},[asset]);
  function submit(event) {
    event.preventDefault();
    if(!validAsset(draft)){setError('Use a positive cost, a residual below cost, a valid date, and a life from 1 to 20 years.');return;}
    onSave(draft);onClose();
  }
  return <dialog ref={ref} className="asset-editor" onCancel={onClose} onClose={onClose}>
    <div className="load-heading"><h2>{asset?.name} · asset assumptions</h2><button aria-label="Close asset editor" onClick={onClose}>×</button></div>
    {draft && <form onSubmit={submit}><label>Purchase cost (¥)<input required type="number" min="1" step="1" value={draft.cost} onChange={event=>setDraft({...draft,cost:Number(event.target.value)})} /></label>
      <label>Acquisition date<input required type="date" value={draft.acquired} onChange={event=>setDraft({...draft,acquired:event.target.value})} /></label>
      <label>Useful life (years)<input required type="number" min="1" max="20" step="1" value={draft.lifeYears} onChange={event=>setDraft({...draft,lifeYears:Number(event.target.value)})} /></label>
      <label>Residual value (¥)<input required type="number" min="0" max={draft.cost-1} step="1" value={draft.residual} onChange={event=>setDraft({...draft,residual:Number(event.target.value)})} /></label>
      <p className="source-scope-note">Saved in this browser. Sample records until you enter your own figures.</p>{error&&<p role="alert">{error}</p>}<button type="submit" className="print-load">Save assumptions</button>
    </form>}
  </dialog>;
}
