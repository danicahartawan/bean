import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import DATA from './forecasting-data.json';
import './new/new.css';
import './forecasting.css';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const yen = value => '¥' + Math.round(value).toLocaleString('en-US');
const rounded = value => Math.round(value / 100) * 100;

// Calendar totals use only dates covered by the eight sample weeks.
// Weekly sales are spread evenly across seven days for this demo.
const MONTHS = (() => {
  const buckets = new Map();
  for (let week = 0; week < 8; week++) {
    for (let day = 0; day < 7; day++) {
      const date = new Date(Date.UTC(2026, 10, 9 + week * 7 + day));
      const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
      if (!buckets.has(key)) buckets.set(key, { first: date, last: date, weights: Array(8).fill(0) });
      const bucket = buckets.get(key);
      bucket.weights[week]++;
      bucket.last = date;
    }
  }
  return [...buckets.values()].map(bucket => {
    const count = bucket.weights.reduce((sum, value) => sum + value, 0);
    const month = bucket.first.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const range = `${month} ${bucket.first.getUTCDate()}–${bucket.last.getUTCDate()}`;
    const lastDay = new Date(Date.UTC(bucket.first.getUTCFullYear(), bucket.first.getUTCMonth() + 1, 0)).getUTCDate();
    return { ...bucket, range, label: bucket.first.getUTCDate() === 1 && bucket.last.getUTCDate() === lastDay ? month : range,
      low: Math.round(bucket.weights.reduce((sum, weight, i) => sum + weight * DATA.weeks.lows[i], 0) / count),
      hotShare: bucket.weights.reduce((sum, weight, i) => sum + weight * DATA.weeks.hotShares[i], 0) / count };
  });
})();
function periodDetails(mode) {
  if (mode === 'month') return { labels: MONTHS.map(item => item.label), lows: MONTHS.map(item => item.low), hotShares: MONTHS.map(item => item.hotShare) };
  if (mode === 'week') return { labels: DATA.weeks.starts, lows: DATA.weeks.lows, hotShares: DATA.weeks.hotShares };
  return { labels: DAYS, lows: DATA.temperatures, hotShares: null };
}
function hotFraction(machine, mode, index, temperature) {
  const meta = periodDetails(mode);
  const baseline = mode === 'day' ? machine.hotShare : meta.hotShares[index] / 100;
  if (temperature === null) return baseline;
  const delta = meta.lows[index] - temperature;
  const hot = Math.max(.2, 1 + delta * .05), cold = Math.max(.2, 1 - delta * .05);
  return baseline * hot / (baseline * hot + (1 - baseline) * cold);
}

function makeForecast(machine, temperature) {
  return machine.dailySales.map((sales, index) => {
    if (temperature === null) return sales;
    const hotFactor = Math.max(0.2, 1 + (15 - temperature) * 0.05);
    const coldFactor = Math.max(0.2, 1 - (15 - temperature) * 0.05);
    const forecastHot = 1 + (15 - DATA.temperatures[index]) * 0.05;
    const forecastCold = Math.max(0.2, 1 - (15 - DATA.temperatures[index]) * 0.05);
    return rounded(sales * (machine.hotShare * hotFactor / forecastHot +
      (1 - machine.hotShare) * coldFactor / forecastCold));
  });
}

function summaryItems(temperature) {
  const lows = temperature === null ? DATA.temperatures : DATA.temperatures.map(() => temperature);
  const switchDay = lows.findIndex(low => low < 12);
  let stock = 24;
  const soupDay = [4, 4, 5, 5, 6, 5, 5].findIndex((sales, index) => {
    const factor = temperature === null ? 1 :
      Math.max(0.2, 1 + (15 - temperature) * 0.05) / (1 + (15 - DATA.temperatures[index]) * 0.05);
    stock -= sales * factor;
    return stock <= 0.00001;
  });
  return [
    { id: 'coins', machine: 'Station', text: 'Bring ¥5,000 in 100-yen coins to Station by Wednesday, Nov 11.', why: "Change runs out Wednesday; the machine can't take bills without it." },
    { id: 'hot', machine: 'Station', text: switchDay < 0
      ? 'Keep columns 5–8 at Station cold for Nov 9–15.'
      : `Switch columns 5–8 at Station to hot by ${temperature === null ? 'Wednesday' : DAYS[switchDay]} (coffee, cocoa, milk tea, corn soup).`,
      why: temperature === null ? 'Lows drop to 9°C Wednesday and 7°C Friday.' :
        `Every day is set to ${temperature}°C; ${switchDay < 0 ? 'cold' : 'hot'} drinks are more popular in this scenario.` },
    { id: 'park', machine: 'Park', text: 'Check the Park machine.', why: 'Last week it earned 35% less than expected; it may be jammed.' },
    { id: 'soup', machine: 'Station', text: soupDay < 0
      ? 'Corn soup at Station lasts through Sunday, Nov 15.'
      : `Load 12 more corn soup at Station; it sells out ${DAYS[soupDay]}, Nov ${9 + soupDay}.`,
      why: temperature === null ? 'Selling twice as fast since it got colder.' :
        `At ${temperature}°C, ${temperature < 14 ? 'higher' : 'lower'} hot-drink demand changes how long the stock lasts.` },
    { id: 'swap', machine: 'Office', text: 'Swap grape soda for matcha latte at Office.', why: 'Grape soda sold 3 a week for a month.' }
  ];
}

export function App() {
  const [mode, setMode] = useState(() => {
    try { return ['day','week','month'].includes(localStorage.getItem('bean-forecast-view')) ? localStorage.getItem('bean-forecast-view') : 'day'; }
    catch { return 'day'; }
  });
  const [week, setWeek] = useState(0);
  const [month, setMonth] = useState(0);
  const [metric, setMetric] = useState('sales');
  const [view, setView] = useState('overview');
  const [chartStyle, setChartStyle] = useState('bars');
  const [askRequest, setAskRequest] = useState(null);
  useEffect(() => { try { localStorage.setItem('bean-forecast-view', mode); } catch {} }, [mode]);
  const [machineName, setMachine] = useState('Station');
  const [day, setDay] = useState(0);
  const [temperature, setTemperature] = useState(null);
  const [showLoad, setShowLoad] = useState(false);
  const dialog = useRef(null);
  const machine = DATA.machines.find(item => item.name === machineName);
  useEffect(() => {
    if (showLoad) dialog.current?.showModal();
    else dialog.current?.close();
  }, [showLoad]);
  function loadList() {
    setMachine('Station');
    setShowLoad(true);
  }
  function showTrends(name, index) {
    setMachine(name);
    if (index !== undefined) { if (mode === 'month') setMonth(index); else if (mode === 'week') setWeek(index); else setDay(index); }
    setView('trends');
  }
  const selectedIndex = mode === 'month' ? month : mode === 'week' ? week : day;
  const periodLabels = periodDetails(mode).labels;
  function selectPeriod(index) {
    if (mode === 'month') setMonth(index);
    else if (mode === 'week') setWeek(index);
    else setDay(index);
  }
  return <div className="screen" data-dashboard-view={view} data-metric={metric}>
    <main className="workspace">
      <header className="page-heading"><div><h1>Forecast Model</h1><p>Your machines, at a glance.</p></div><span {...explainData('Forecast dates', 'The daily forecast covers Monday, Nov 9 through Sunday, Nov 15. The week view extends through the week of Dec 28.')}>{mode === 'month' ? MONTHS[month].range : mode === 'week' ? DATA.weeks.starts[week] + ' – ' + new Date(Date.UTC(2026, 10, 15 + week * 7)).toLocaleDateString('en-US', {month:'short',day:'numeric',timeZone:'UTC'}) : 'Nov 9 – 15'}</span></header>
      <div className="controls">
        <div className="view-switch" role="group" aria-label="Dashboard view">
          <button aria-pressed={view === 'overview'} onClick={() => setView('overview')}>Overview</button>
          <button aria-pressed={view === 'trends'} onClick={() => setView('trends')}>Trends</button>
        </div>
        <label className="machine-control">Machine <select value={machineName} onChange={event => setMachine(event.target.value)}>
          {DATA.machines.map(item => <option key={item.name}>{item.name}</option>)}
        </select></label>
        <div className="mode-toggle" role="group" aria-label="Forecast period">
          {['day', 'week', 'month'].map(view => <button key={view} aria-pressed={mode === view} onClick={() => setMode(view)}>{view[0].toUpperCase() + view.slice(1)}</button>)}
        </div>
        <div className="data-toggle" role="group" aria-label="Forecast data">
          {[['sales','Sales'],['hot','Hot drinks'],['machines','Compare']].map(([value,label]) => <button key={value} aria-pressed={metric === value} onClick={() => setMetric(value)}>{label}</button>)}
        </div>
        <span className="day-control">
          <button disabled={selectedIndex === 0} onClick={() => selectPeriod(selectedIndex - 1)} aria-label="Previous day">‹</button>
          <select aria-label={'Select ' + mode} value={selectedIndex} onChange={event => selectPeriod(Number(event.target.value))}>
            {periodLabels.map((label,index) => <option value={index} key={label}>{mode === 'week' ? 'Week of ' : ''}{label}</option>)}
          </select>
          <button disabled={selectedIndex === periodLabels.length - 1} onClick={() => selectPeriod(selectedIndex + 1)} aria-label="Next day">›</button>
        </span>
      </div>
      {view === 'overview' ? <OverviewCards machine={machine} mode={mode} week={week} day={day} month={month} metric={metric} temperature={temperature} setMachine={setMachine} showTrends={showTrends} openLoad={loadList} setTemperature={setTemperature} /> :
        <ForecastGraph machine={machine} month={month} metric={metric} day={day} temperature={temperature} mode={mode} week={week} setMachine={setMachine} chartStyle={chartStyle} setChartStyle={setChartStyle} />}
      <div className="scenario-row">
          <div className="temperature-control">
            <label htmlFor="temperature">What if it’s colder?</label>
            <output htmlFor="temperature" {...explainData('Temperature scenario', temperature === null ? 'Using the forecast low for each day or week.' : `Every day is set to ${temperature}°C in this scenario.`)}>{temperature === null ? 'Using the weather forecast' : temperature + '°C'}</output>
            <input id="temperature" aria-label="What if it’s colder?" type="range" min="0" max="30"
              value={temperature ?? DATA.temperatures[0]} onChange={event => setTemperature(Number(event.target.value))} />
            <small>Sets every day to this temperature.</small>
            {temperature !== null && <button className="reset-temperature" onClick={() => setTemperature(null)}>Back to forecast</button>}
          </div>
      <footer>Prototype · sample data</footer>
      </div>
    </main>
    <ForecastChat machine={machine} day={day} temperature={temperature} setTemperature={setTemperature}
      setMachine={setMachine} setDay={setDay} openLoad={loadList} askRequest={askRequest} mode={mode} week={week} setWeek={setWeek} month={month} />
    <ExplainLayer onAsk={question => setAskRequest({ question, id: Date.now() })} />
    <dialog ref={dialog} onCancel={() => setShowLoad(false)} onClose={() => setShowLoad(false)}>
      <div className="load-heading"><h2>Station · Tuesday, Nov 10</h2><button onClick={() => setShowLoad(false)} aria-label="Close load list">×</button></div>
      <p>Bring ¥5,000 in 100-yen coins.</p>
      <table><thead><tr><th>Product</th><th>Units to load</th></tr></thead><tbody>
        {DATA.visitLoad.map(([name, units]) => <tr key={name}><td>{name}</td><td {...explainData('Units to load', `Bring ${units} units of ${name.toLowerCase()} to Station on Tuesday.`)}>{units}</td></tr>)}
      </tbody></table><button className="print-load" onClick={() => window.print()}>Print visit list</button>
    </dialog>
  </div>;
}

function forecastSeries(machine, temperature, mode) {
  if (mode === 'day') return makeForecast(machine, temperature);
  const weeks = machine.weeklySales.map((sales, index) => {
    if (temperature === null) return sales;
    const low = DATA.weeks.lows[index];
    const share = DATA.weeks.hotShares[index] / 100;
    const hot = Math.max(.2, 1 + (15 - temperature) * .05) / (1 + (15 - low) * .05);
    const cold = Math.max(.2, 1 - (15 - temperature) * .05) / Math.max(.2, 1 - (15 - low) * .05);
    return rounded(sales * (share * hot + (1 - share) * cold));
  });
  return mode === 'month' ? MONTHS.map(bucket => rounded(bucket.weights.reduce((sum, weight, i) => sum + weeks[i] * weight / 7, 0))) : weeks;
}

function ForecastGraph({ machine, month, metric, day, temperature, mode, week, setMachine, chartStyle, setChartStyle }) {
  const weekly = mode !== 'day';
  const index = mode === 'month' ? month : mode === 'week' ? week : day;
  const labels = periodDetails(mode).labels.map(label => mode === 'day' ? label.slice(0,3) : label);
  const lows = periodDetails(mode).lows;
  const period = mode === 'week' ? 'Week of ' + labels[index] : labels[index];
  const fullSales = forecastSeries(machine, temperature, mode);
  const series = metric === 'hot' ? fullSales.map((value,i) => Math.round(value * hotFraction(machine,mode,i,temperature))) : fullSales;
  const busy = series.map(value => rounded(value * 1.25));
  const shareAt = (item,i) => hotFraction(item,mode,i,temperature);
  const hotShares = lows.map((_, i) => shareAt(machine, i));
  const hotSales = fullSales.map((value, i) => Math.round(value * hotShares[i]));
  const machineTotals = DATA.machines.map(item => ({ name: item.name, value: forecastSeries(item, temperature, mode)[index] }));
  const total = machineTotals.reduce((sum, item) => sum + item.value, 0);
  const fleetSeries = labels.map((_, i) => DATA.machines.reduce((sum, item) => sum + forecastSeries(item, temperature, mode)[i], 0));
  const fleetHot = labels.map((_, i) => DATA.machines.reduce((sum, item) => sum + forecastSeries(item, temperature, mode)[i] * shareAt(item, i), 0));
  const headlineInfo = `${period}’s expected sales at ${machine.name}. Based on recent sales and a ${temperature ?? lows[index]}°C low.`;
  const description = i => {
    if (weekly && machine.name === 'Office' && i === 7) return 'Offices close Dec 29 to Jan 3, so sales drop to about a third.';
    if (weekly && machine.name === 'Station' && i === 6) return 'Year-end travel raises station traffic, so sales rise about 6%.';
    return `${machine.name}, ${mode === 'month' ? labels[i] : weekly ? 'week of ' + labels[i] : DAYS[i]}: expected sales ${yen(series[i])}, including ${yen(hotSales[i])} in hot drinks.`;
  };
  const comparison = DATA.machines.map(item => ({name:item.name,values:forecastSeries(item,temperature,mode)}));
  const max = Math.ceil(Math.max(...busy, ...(metric === 'machines' ? comparison.flatMap(item => item.values) : [])) / 1000) * 1000;
  const point = (value, i) => [60 + i * 670 / (series.length - 1), 230 - value / max * 195];
  const path = values => values.map((value, i) => point(value, i).join(',')).map((value, i) => (i ? 'L' : 'M') + value).join(' ');
  const change = index ? Math.round((series[index] / series[index - 1] - 1) * 100) : null;
  return <div className="forecast-dashboard">
    <div className="dashboard-top">
      <div className="metric-stack">
        <section className="visual-card metric-card">
          <div className="metric-label">Expected sales <span>{machine.name}</span></div>
          <div className="metric-content"><div>
            <div className="revenue"><strong {...explainData(`${machine.name}, ${period}’s expected sales`, headlineInfo)}>{yen(series[index])}<button className="permanent-info" aria-label="Explain expected sales">ⓘ</button></strong></div>
            <p>{period}</p><small {...explainData('Busy-period sales', `Sales can reach ${yen(busy[index])} on a busy ${weekly ? 'week' : 'day'}. About 1 in 10 goes above it.`)}>Up to {yen(busy[index])} when busy</small>
          </div><MiniSales values={series} selected={index} color="blue" label="Expected sales trend" /></div>
          {change !== null && <span className={'metric-change ' + (change >= 0 ? 'positive' : '')} {...explainData('Change from the previous period', `Expected sales are ${Math.abs(change)}% ${change >= 0 ? 'higher' : 'lower'} than the previous ${weekly ? 'week' : 'day'}.`)}>{change > 0 ? '+' : ''}{change}%</span>}
        </section>
        <section className="visual-card metric-card">
          <div className="metric-label">Hot drink sales <span>{machine.name}</span></div>
          <div className="metric-content"><div>
            <strong className="metric-value" {...explainData('Expected hot drink sales', `${yen(hotSales[index])} of ${machine.name} sales comes from hot drinks in this sample forecast.`)}>{yen(hotSales[index])}</strong>
            <p>{Math.round(hotShares[index] * 100)}% of expected sales</p><small>Coffee, cocoa, tea & soup</small>
          </div><MiniSales values={hotSales} selected={index} color="pink" label="Hot drink sales trend" /></div>
        </section>
      </div>
      <section className="visual-card report-card">
        <div className="report-stats"><div className="metric-label">All machines</div>
          <strong className="report-value" {...explainData('All machines’ expected sales', `${period}: ${yen(total)} in expected sales across Station, Office, and Park.`)}>{yen(total)}</strong>
          <span className="report-period">{period}</span>
          <div className="report-legend"><span><i className="blue-dot" />Expected sales</span><span><i className="pink-dot" />Hot drinks</span></div>
          <div className="machine-totals">{machineTotals.map(item => <button key={item.name} onClick={() => setMachine(item.name)} aria-label={'Show ' + item.name + ' forecast'}><span>{item.name}</span><i /><b {...explainData(item.name + ' expected sales', `${item.name}: about ${yen(item.value)} for ${period.toLowerCase()}.`)}>{yen(item.value)}</b></button>)}</div>
        </div>
        <RadarSales values={fleetSeries} hot={fleetHot} labels={labels} />
      </section>
    </div>
    <section className="visual-card overview-card">
      <div className="overview-heading"><h2>{metric === 'machines' ? 'Compare machines' : metric === 'hot' ? 'Hot drink sales' : 'Sales over time'} <span>{metric === 'machines' ? 'All machines' : machine.name}</span></h2><div className="chart-view-toggle" role="group" aria-label="Chart style">{['bars','lines'].map(style => <button key={style} aria-pressed={chartStyle === style} onClick={() => setChartStyle(style)}>{style === 'bars' ? 'Bars' : 'Lines'}</button>)}</div><div className="overview-legend">{metric === 'machines' ? comparison.map((item,i) => <span key={item.name}><i className={'compare-key key-' + i} />{item.name}</span>) : <><span><i className="blue-dot" />Expected sales</span><span><i className="pink-dot" />Hot drinks</span><span><i className="dash-line" />Busy {mode}</span></>}</div></div>
      <svg className="overview-chart" viewBox="0 0 780 280" preserveAspectRatio="none" role="img" aria-label={`${machine.name} ${mode === 'month' ? 'monthly' : weekly ? 'eight-week' : 'seven-day'} sales overview`}>
        {[0, .25, .5, .75, 1].map(value => <g key={value}><path d={`M60 ${230 - value * 195}H750`} className="overview-grid" /><text x="48" y={234 - value * 195} textAnchor="end" {...explainData('Sales scale', `${yen(value * max)} on the sales chart.`)}>{yen(value * max)}</text></g>)}
        <path d={path(busy) + ' L730,230 L60,230Z'} className="busy-area" />
        {chartStyle === 'lines' && <><path d={path(series)} className="expected-trend" /><path d={path(hotSales)} className="hot-trend" /></>}
        <path d={path(busy)} className="busy-curve" {...explainData('Busy sales forecast', `About 1 ${mode} in 10 reaches or exceeds this line.`)} />
        {metric === 'machines' && comparison.map((item, machineIndex) => <g key={item.name} className={'compare-plot machine-' + machineIndex}>
          {chartStyle === 'lines' ? <path d={path(item.values)} fill="none" strokeWidth="2.5" /> : item.values.map((value,i) => <path key={i} d={`M${point(value,i)[0] - 7 + machineIndex * 7},230V${point(value,i)[1]}`} fill="none" strokeWidth="5" strokeLinecap="round" />)}
        </g>)}
        {series.map((value, i) => {
          const [x, y] = point(value, i);
          return <g key={i}>
            {i === index && <rect x={x - 19} y="30" width="38" height="200" rx="7" className="selected-period" />}
            {chartStyle === 'bars' && <path d={`M${x - 4},230V${y}`} className="expected-bar" />}
            {chartStyle === 'bars' && <path d={`M${x + 5},230V${point(hotSales[i], i)[1]}`} className="hot-bar" />}
            <rect x={x - 15} y="28" width="30" height="202" fill="transparent" tabIndex="0" role="button" aria-label={description(i)} data-explain={JSON.stringify({title: machine.name + ', ' + labels[i], body: description(i), question: 'Tell me more about ' + machine.name + ' ' + labels[i] + ' sales.'})} />
            <text x={x} y="252" textAnchor="middle" {...explainData('Forecast period', description(i))}>{labels[i]}</text>
            <text x={x} y="273" textAnchor="middle" {...explainData('Forecast low', 'The average low for this day or week, from the weather forecast.')}>{weekly ? 'Low ' : ''}{temperature ?? lows[i]}°C</text>
          </g>;
        })}
      </svg>
    </section>
  </div>;
}

function MiniSales({ values, selected, color, label }) {
  const max = Math.max(...values) * 1.1;
  const min = Math.min(...values) * .7;
  const points = values.map((value, i) => [5 + i * 150 / (values.length - 1), 85 - (value - min) / (max - min) * 70]);
  const line = points.map(([x, y], i) => {
    if (!i) return `M${x},${y}`;
    const [previousX, previousY] = points[i - 1];
    const middleX = (previousX + x) / 2;
    return `C${middleX},${previousY} ${middleX},${y} ${x},${y}`;
  }).join(' ');
  return <svg viewBox="0 0 165 100" preserveAspectRatio="none" className={'mini-sales ' + color} role="img" aria-label={label} {...explainData(label, 'A small view of the forecast across the periods shown below.')}>
    <defs><linearGradient id={'mini-fill-' + color} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color === 'blue' ? '#4e88ed' : '#d74fce'} stopOpacity=".2" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient></defs>
    <path d={line + ' L155,95 L5,95Z'} fill={'url(#mini-fill-' + color + ')'} />
    <path d={line} fill="none" strokeWidth="2.2" className="mini-line" />
    <circle cx={points[selected][0]} cy={points[selected][1]} r="3.5" />
  </svg>;
}

function RadarSales({ values, hot, labels }) {
  const radius = 92, cx = 135, cy = 125, max = Math.max(...values) * 1.1;
  const point = (fraction, i) => {
    const angle = -Math.PI / 2 + i * 2 * Math.PI / values.length;
    return [cx + radius * fraction * Math.cos(angle), cy + radius * fraction * Math.sin(angle)];
  };
  const polygon = data => data.map((value, i) => point(value / max, i).join(',')).join(' ');
  return <svg className="radar-chart" viewBox="0 0 270 250" role="img" aria-label="Expected sales and hot drink sales across all machines">
    {[.25, .5, .75, 1].map(fraction => <polygon key={fraction} points={values.map((_, i) => point(fraction, i).join(',')).join(' ')} className="radar-grid" />)}
    {labels.map((label, i) => <g key={label}><path d={`M${cx},${cy}L${point(1, i).join(',')}`} className="radar-grid" /><text x={point(1.2, i)[0]} y={point(1.2, i)[1] + 3} textAnchor="middle">{label}</text></g>)}
    <polygon points={polygon(values)} className="radar-total" {...explainData('All machines’ sales pattern', 'Blue shows expected sales across all three machines for each period.')} />
    <polygon points={polygon(hot)} className="radar-hot" {...explainData('Hot drink sales pattern', 'Pink shows the part of expected sales from hot drinks.')} />
  </svg>;
}

function OverviewCards({ machine, mode, week, day, month, metric, temperature, setMachine, showTrends, openLoad, setTemperature }) {
  const weekly = mode !== 'day';
  const index = mode === 'month' ? month : mode === 'week' ? week : day;
  const labels = periodDetails(mode).labels;
  const lows = periodDetails(mode).lows;
  const period = mode === 'week' ? 'Week of ' + labels[index] : labels[index];
  const visibleSales = item => forecastSeries(item,temperature,mode).map((value,i) => metric === 'hot' ? Math.round(value * hotFraction(item,mode,i,temperature)) : value);
  const sales = visibleSales(machine);
  const fleet = DATA.machines.map(item => ({ ...item, series: visibleSales(item) }));
  const mix = i => Math.round(hotFraction(machine,mode,i,temperature) * 100);
  const hotShare = mix(index);
  const best = sales.indexOf(Math.max(...sales));
  const previous = index ? sales[index - 1] : null;
  const change = previous ? Math.round((sales[index] / previous - 1) * 100) : null;
  const park = DATA.machines.find(item => item.name === 'Park');
  const gap = Math.round((1 - park.actual / park.expected) * 100);
  return <div className="overview-grid">
    <section className="insight-card primary-insight">
      <div className="insight-title">{metric === 'hot' ? 'Hot drink sales' : 'Expected sales'} <span>{machine.name}</span></div>
      <div className="metric-content"><div className="revenue"><strong {...explainData(`${machine.name}, ${period}’s expected sales`, `Expected sales for ${period.toLowerCase()} at ${machine.name}, based on sample sales and weather.`)}>{yen(sales[index])}<button className="permanent-info" aria-label="Explain expected sales">ⓘ</button></strong></div><p className="period-caption">{period}</p></div>
      <span className="insight-note">{change === null ? 'Up to ' + yen(rounded(sales[index] * 1.25)) + ' when busy' : Math.abs(change) + '% ' + (change < 0 ? 'less' : 'more') + ' than the previous ' + mode}</span>
      <button className="card-action" onClick={() => showTrends(machine.name)}>Explore sales ↗</button>
    </section>
    <section className="insight-card">
      <div className="insight-title">Hot drink demand</div>
      <div className="insight-stat" {...explainData('Hot drink share', `The sample mix is ${hotShare}% hot drinks for ${period.toLowerCase()}. This reflects the drink mix and the selected weather scenario.`)}>{hotShare}<span>%</span></div>
      <span className="insight-note">of sales in the forecast mix</span>
      <TinyBars values={lows.map((_, i) => mix(i))} selected={index} />
      <button className="card-action" onClick={() => showTrends(machine.name)}>See demand over time ↗</button>
    </section>
    <section className="insight-card">
      <div className="insight-title">Peak {mode}</div>
      <div className="insight-stat period-stat">{labels[best]}</div>
      <span className="insight-note" {...explainData('Peak expected sales', `${yen(sales[best])} is the highest expected sales in the periods shown for ${machine.name}.`)}>{yen(sales[best])} expected at {machine.name}</span>
      <MiniSales values={sales} selected={best} color="blue" label="Sales outlook" />
      <button className="card-action" onClick={() => showTrends(machine.name, best)}>View this {mode} ↗</button>
    </section>
    <section className="insight-card check-card">
      <div className="insight-title"><i className="attention-dot" />Needs a check <span>Park</span></div>
      <div className="insight-stat" {...explainData('Park’s sales gap', 'Park earned ¥6,900 less than expected last week. Sales stopped on Wednesday afternoon, which looks like a jam.')} aria-label={gap + '% below expected'}>−{gap}<span>%</span></div>
      <span className="insight-note">below expected last week</span>
      <div className="last-week-pair"><span>Expected <b>{yen(park.expected)}</b></span><span>Actual <b>{yen(park.actual)}</b></span></div>
      <button className="card-action" onClick={() => showTrends('Park')}>Look at Park ↗</button>
    </section>
    {fleet.map(item => <section className={'insight-card machine-insight ' + (machine.name === item.name ? 'is-selected' : '')} key={item.name}>
      <div className="insight-title">{item.name}<span>{period}</span></div>
      <div className="insight-stat" {...explainData(item.name + ' expected sales', `${yen(item.series[index])} in expected sales for ${period.toLowerCase()}.`)}>{yen(item.series[index])}</div>
      <span className="insight-note">Up to {yen(rounded(item.series[index] * 1.25))} when busy</span>
      <MiniSales values={item.series} selected={index} color="blue" label={item.name + ' sales trend'} />
      <div className="machine-actions"><button className="card-action" onClick={() => { setMachine(item.name); showTrends(item.name); }}>Explore forecast ↗</button>{item.name === 'Station' && <button className="card-action" onClick={openLoad}>Load list ↗</button>}</div>
    </section>)}
    <section className="insight-card weather-insight">
      <div className="insight-title">Weather & demand</div>
      <div className="insight-stat">{temperature ?? lows[index]}<span>°C</span></div>
      <span className="insight-note">{mode === 'day' ? 'Daily low' : 'Average low for this ' + mode}</span>
      <div className="weather-strip">{lows.map((low, i) => <div key={i} className={i === index ? 'selected-low' : ''} {...explainData('Forecast low', 'The average low for this day or week, from the weather forecast.')}><span>{weekly ? labels[i].replace('Nov ', 'N').replace('Dec ', 'D') : labels[i].slice(0, 1)}</span><b>{temperature ?? low}°</b></div>)}</div>
      <button className="card-action" onClick={() => setTemperature(temperature === null ? 5 : null)}>{temperature === null ? 'Try a colder forecast ↗' : 'Back to weather forecast ↗'}</button>
    </section>
  </div>;
}

function TinyBars({ values, selected }) {
  const maximum = Math.max(...values);
  return <div className="tiny-bars" role="img" aria-label="Hot drink demand over the forecast"><span className="tiny-bar-baseline" />{values.map((value, index) => <i key={index} className={index === selected ? 'selected' : ''} style={{ height: Math.max(4, value / maximum * 44) }} />)}</div>;
}

function ForecastChat({ machine, day, temperature, setTemperature, setMachine, setDay, openLoad, askRequest, mode, week, setWeek, month }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('bean-forecast-chat') || '[]');
      return Array.isArray(saved) ? saved.filter(item => item && typeof item.text === 'string') : [];
    } catch { return []; }
  });
  useEffect(() => { try { sessionStorage.setItem('bean-forecast-chat', JSON.stringify(messages)); } catch {} }, [messages]);
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const log = useRef(null), mic = useRef(null), input = useRef(null);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages]);
  useEffect(() => () => mic.current?.abort(), []);
  useEffect(() => {
    if (askRequest) { setDraft(askRequest.question); input.current?.focus(); }
  }, [askRequest]);
  const chips = mode === 'week' ? [`How will ${machine.name} sales change over the next 8 weeks?`, `What should I change at ${machine.name} for winter?`, `Why does Office drop in the week of Dec 28?`] : [`Why is ${machine.name} ${machine.name === 'Office' ? 'above' : 'below'} expected?`, `When should I visit ${machine.name} next?`, `What sells best at ${machine.name} when it’s cold?`];
  function answer(prompt) {
    if (!prompt.trim()) return;
    const query = prompt.toLowerCase();
    const target = DATA.machines.find(item => query.includes(item.name.toLowerCase())) ?? machine;
    const requestedDay = DAYS.findIndex(name => query.includes(name.toLowerCase()));
    const degrees = query.match(/(-?\d+)\s*(?:°|degrees|c\b)/);
    let reply;
    if (target.name !== machine.name) setMachine(target.name);
    if (requestedDay >= 0) setDay(requestedDay);
    const namedWeek = DATA.weeks.starts.findIndex(start => query.includes(start.toLowerCase()));
    if (mode === 'week' && namedWeek >= 0) setWeek(namedWeek);
    if (mode === 'week' && /week|winter|8 weeks|sales change/.test(query)) {
      const matching = WEEK_ITEMS.find(item => item.machine === target.name);
      reply = query.includes('matcha') ? WEEK_ITEMS[4].text + ' ' + WEEK_ITEMS[4].why :
        query.includes('hot') || query.includes('winter') ? WEEK_ITEMS[0].text + ' ' + WEEK_ITEMS[0].why :
        matching.text + ' ' + matching.why;
    } else if (/back to forecast|reset.*temperature/.test(query)) {
      setTemperature(null); reply = 'I restored the daily weather forecast.';
    } else if (degrees || /make it colder|make it warmer/.test(query)) {
      const next = Math.max(0, Math.min(30, degrees ? Number(degrees[1]) : (temperature ?? 14) + (query.includes('colder') ? -5 : 5)));
      setTemperature(next); reply = `Every day is now set to ${next}°C.`;
    } else if (/load|pack/.test(query)) {
      if (target.name === 'Station') { openLoad(); reply = 'Station’s Tuesday load list is open. Bring ¥5,000 in 100-yen coins too.'; }
      else reply = `Review ${target.name} stock on your next visit. ${target.name === 'Office' ? summaryItems(temperature).find(item => item.id === 'swap').text : summaryItems(temperature).find(item => item.id === 'park').why}`;
    } else if (/below|above|expected|jam|sales gap/.test(query)) {
      const gap = Math.round((target.actual / target.expected - 1) * 100);
      reply = `Last week ${target.name} expected ${yen(target.expected)} and earned ${yen(target.actual)}, ${Math.abs(gap)}% ${gap < 0 ? 'less' : 'more'}. ` + (target.name === 'Park' ? 'It may be jammed; check the machine.' : 'This sample data does not give a cause for the difference.');
    } else if (/sells best|cold|hot|weather/.test(query)) {
      reply = `At ${target.name}, coffee, cocoa, milk tea, and corn soup are the hot drinks to prepare when it gets colder. ` + summaryItems(temperature).find(item => item.id === 'hot').why;
    } else if (/visit|next/.test(query)) {
      reply = target.name === 'Station' ? 'Visit Station Tuesday, Nov 10, before change runs out Wednesday.' : target.name === 'Park' ? 'Check Park Thursday, Nov 12; last week’s sales gap may mean a jam.' : 'Visit Office Saturday, Nov 14, to swap grape soda for matcha latte.';
    } else if (/coin|change/.test(query)) reply = summaryItems(temperature).find(item => item.id === 'coins').text;
    else if (/soup/.test(query)) reply = summaryItems(temperature).find(item => item.id === 'soup').text;
    else if (/grape|matcha|swap/.test(query)) reply = summaryItems(temperature).find(item => item.id === 'swap').text;
    else {
      const index = requestedDay >= 0 ? requestedDay : day;
      const sales = makeForecast(target, temperature)[index];
      reply = `${target.name} on ${DAYS[index]}: about ${yen(rounded(sales))}, up to ${yen(rounded(sales * 1.25))} on a busy day. Ask about sales, visits, stock, or coins.`;
    }
    setMessages(previous => [...previous, { user: true, text: prompt }, { text: reply }]);
    setDraft('');
  }
  function voice() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const notice = text => setMessages(previous => [...previous, { text }]);
    if (!Recognition) { notice('Voice input is unavailable in this browser. Type your question below.'); return; }
    if (listening) { mic.current.stop(); return; }
    const recognition = new Recognition(); mic.current = recognition; recognition.lang = 'en-US';
    recognition.onresult = event => { setDraft(event.results[0][0].transcript); input.current?.focus(); };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); notice('Check microphone access, or type your question.'); };
    try { recognition.start(); setListening(true); } catch { notice('The microphone could not start.'); }
  }
  return <aside className="assistant">
    <div className="assistant-head"><div><strong>Ask Bean</strong><span>Ask about any machine or period.</span></div>{messages.length > 0 && <button className="new-conversation" onClick={() => setMessages([])}>New conversation</button>}</div>
    <div className="chat-body" ref={log}>
      <div className={'question-chips ' + (messages.length ? 'has-conversation' : '')}>{chips.map(chip => <button key={chip} onClick={() => answer(chip)}>{chip}</button>)}</div>
      <div role="log" aria-label="Conversation">{messages.map((message, index) => <div key={index} className={'message ' + (message.user ? 'user-message' : 'response-message')}><div>{message.text}</div></div>)}</div>
    </div>
    <form className="composer" onSubmit={event => { event.preventDefault(); answer(draft); }}>
      <textarea ref={input} aria-label="Ask about your forecast" placeholder="Try 'What should I load at Station Tuesday?'" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); answer(draft); } }} />
      <div className="composer-foot"><span role="status">{listening ? 'Listening…' : ''}</span><div>
        <button type="button" className={'mic-button ' + (listening ? 'listening' : '')} onClick={voice} aria-label={listening ? 'Stop listening' : 'Use voice input'}><svg width="16" height="18" viewBox="0 0 16 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="1" width="6" height="11" rx="3" /><path d="M2 9a6 6 0 0012 0M8 15v4M5 19h6" /></svg></button>
        <button className="send-button" aria-label="Send message">↑</button>
      </div></div>
    </form>
  </aside>;
}
const explainData = (title, body, question = `Tell me more about ${title.toLowerCase()}.`) => ({
  'data-explain': JSON.stringify({ title, body, question }),
  tabIndex: 0
});

export function ExplainLayer({ onAsk }) {
  const [hover, setHover] = useState(null);
  const [card, setCard] = useState(null);
  const current = useRef(null);
  const timer = useRef(null);
  const cardRef = useRef(null);
  const lastTouch = useRef(0);
  useEffect(() => {
    function clear() { clearTimeout(timer.current); timer.current = null; }
    function details(target) {
      try { return JSON.parse(target.dataset.explain); } catch { return null; }
    }
    function open(target) {
      const data = details(target);
      if (!data) return;
      const rect = target.getBoundingClientRect();
      const width = Math.min(330, innerWidth - 24);
      const left = rect.right + width + 12 <= innerWidth ? rect.right + 10 : Math.max(12, rect.left - width - 10);
      setCard({ ...data, left, top: Math.min(Math.max(12, rect.top), Math.max(12, innerHeight - 290)), target });
      setHover(null); clear();
    }
    function move(event) {
      if (event.pointerType === 'touch' || cardRef.current?.contains(event.target) || event.target.closest('.explain-icon')) return;
      const target = event.target.closest('[data-explain]');
      if (target === current.current?.target && Math.hypot(event.clientX - current.current.x, event.clientY - current.current.y) < 4) return;
      clear(); setHover(null);
      current.current = target ? { target, x: event.clientX, y: event.clientY } : null;
      if (!target || card) return;
      timer.current = setTimeout(() => setHover({ target, x: Math.min(innerWidth - 42, event.clientX + 12), y: Math.max(8, event.clientY - 38) }), 500);
    }
    function click(event) {
      if (Date.now() - lastTouch.current < 700) return;
      const icon = event.target.closest('.explain-icon');
      if (icon) { if (current.current?.target) open(current.current.target); return; }
      if (cardRef.current?.contains(event.target)) return;
      const target = event.target.closest('[data-explain]');
      if (target && event.target.closest('.permanent-info')) open(target);
      else { setCard(null); setHover(null); }
    }
    function touch(event) {
      if (event.pointerType !== 'touch') return;
      const target = event.target.closest('[data-explain]');
      if (target) { event.preventDefault(); lastTouch.current = Date.now(); open(target); }
    }
    function key(event) {
      if (event.key === 'Escape') { setCard(null); setHover(null); card?.target?.focus(); }
      if (event.key === 'Enter' && event.target.matches('[data-explain]')) { event.preventDefault(); open(event.target); }
    }
    function leave() { clear(); setHover(null); }
    document.addEventListener('pointermove', move);
    document.addEventListener('click', click);
    document.addEventListener('pointerup', touch);
    document.addEventListener('keydown', key);
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      clear(); document.removeEventListener('pointermove', move); document.removeEventListener('click', click);
      document.removeEventListener('pointerup', touch); document.removeEventListener('keydown', key);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, [card]);
  useEffect(() => { if (card) cardRef.current?.focus(); }, [card]);
  return <>
    {hover && !card && <button className="explain-icon" style={{ left: hover.x, top: hover.y }} aria-label="Explain this" onPointerDown={event => event.preventDefault()}>?</button>}
    {card && <section ref={cardRef} tabIndex={-1} role="dialog" aria-modal="false" aria-label={card.title} className="explain-card" style={{ left: card.left, top: card.top }}>
      <button className="explain-close" aria-label="Close explanation" onClick={() => { setCard(null); card.target?.focus(); }}>×</button>
      <h2>{card.title}</h2><p>{card.body}</p>
      <button className="ask-more" onClick={() => { onAsk(card.question); setCard(null); }}>Ask Bean more ›</button>
    </section>}
  </>;
}

const WEEK_ITEMS = [
  { id: 'week-hot', machine: 'All', text: 'Switch 4 more columns to hot at every machine by the week of Nov 23.', why: 'Hot drinks pass 55% of sales once lows stay under 8°C.' },
  { id: 'week-office', machine: 'Office', text: 'Office will sell about two-thirds less the week of Dec 28.', why: 'Offices close for the New Year holiday. Load less and skip one visit.' },
  { id: 'week-station', machine: 'Station', text: 'Station picks up the week of Dec 21.', why: 'Year-end travel brings more people through the station. Plan an extra visit.' },
  { id: 'week-park', machine: 'Park', text: 'Park is slipping about 3% a week.', why: 'Cold drinks are falling faster than hot drinks are rising there. Swap two cold columns to hot.' },
  { id: 'week-matcha', machine: 'All', text: 'Matcha latte is the fastest riser: up 20% a week since launch.', why: 'Give it a second column at Station and Office.' }
];

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
