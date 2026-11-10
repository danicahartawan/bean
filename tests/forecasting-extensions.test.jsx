import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFile } from 'node:fs/promises';
import { URL as NodeURL } from 'node:url';
import { App } from '../forecasting.jsx';
import { DEFAULT_ASSETS, bookValue, periodExpense, validAsset, productChange } from '../forecasting-models.js';
import { parsePublicRanking, refresh } from '../scripts/refresh-product-trends.mjs';

beforeAll(() => {
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open',''); };
});
afterEach(() => {
  cleanup();localStorage.clear();sessionStorage.clear();history.replaceState(null,'','/');
  vi.restoreAllMocks();vi.unstubAllGlobals();
});
function choosePage(label) { fireEvent.click(within(screen.getByRole('navigation',{name:'Forecast pages'})).getByRole('button',{name:label,exact:true})); }

describe('forecast page extensions', () => {
  it('switches between three forecasts and keeps missing market figures blank', () => {
    render(<App />);
    choosePage('Product Trends');
    expect(screen.getByRole('heading',{name:'Product Trends',exact:true})).toBeTruthy();
    expect(document.querySelectorAll('.insight-card').length).toBe(8);
    fireEvent.click(screen.getByRole('combobox',{name:'Forecast data'}));
    fireEvent.click(screen.getByRole('option',{name:'Repeat',exact:true}));
    expect(document.querySelector('.primary-insight .insight-stat').textContent).toContain('—');
    fireEvent.click(screen.getByRole('combobox',{name:'Product',exact:true}));
    fireEvent.click(screen.getByRole('option',{name:'Monster Energy'}));
    expect(document.querySelector('.primary-insight .insight-stat').textContent).toContain('58.2%');
    expect(document.querySelector('.supplemental-grid').textContent).toContain('-10.2 pp');
    choosePage('Depreciation');
    expect(screen.getByRole('heading',{name:'Machine Depreciation'})).toBeTruthy();
    choosePage('Sales');
    expect(screen.getByRole('heading',{name:'Forecast Model'})).toBeTruthy();
  });
  it('shows linked research and records the difference between surveys and sample units', () => {
    render(<App />);choosePage('Product Trends');
    fireEvent.click(screen.getByRole('button',{name:'Sources & method',exact:true}));
    const sourceDialog = screen.getByRole('dialog');
    expect(sourceDialog.textContent).toContain('across retail channels');
    expect(within(sourceDialog).getAllByRole('link').length).toBe(8);
    expect(sourceDialog.textContent).toContain('Missing public figures stay blank');
  });
  it('saves asset assumptions and recalculates depreciation without losing the chat', () => {
    render(<App />);choosePage('Depreciation');
    const before = document.querySelector('.primary-insight .insight-stat').textContent;
    fireEvent.click(screen.getByRole('button',{name:'See how it’s calculated'}));
    const editor = screen.getByRole('dialog');
    fireEvent.change(within(editor).getByLabelText('Purchase cost (¥)'),{target:{value:'1200000'}});
    fireEvent.click(within(editor).getByRole('button',{name:'Save assumptions'}));
    expect(JSON.parse(localStorage.getItem('bean-forecast-assets'))[0].cost).toBe(1200000);
    expect(document.querySelector('.primary-insight .insight-stat').textContent).not.toBe(before);
    fireEvent.change(screen.getByRole('textbox',{name:'Ask about your forecast'}),{target:{value:'How is depreciation calculated?'}});
    fireEvent.click(screen.getByRole('button',{name:'Send message',exact:true}));
    expect(screen.getByRole('log',{name:'Conversation'}).textContent).toContain('¥1,200,000');
    choosePage('Product Trends');
    expect(screen.getByRole('log',{name:'Conversation'}).textContent).toContain('¥1,200,000');
  });
});

describe('depreciation planning model', () => {
  it('never depreciates below residual or charges expense before acquisition', () => {
    const asset={...DEFAULT_ASSETS[0],residual:50000};
    expect(bookValue(asset,'2023-03-31')).toBe(0);
    expect(bookValue(asset,asset.acquired)).toBe(asset.cost);
    expect(bookValue(asset,'2040-01-01')).toBe(50000);
    expect(periodExpense(asset,'2022-01-01','2022-02-01')).toBe(0);
    expect(periodExpense(asset,'2040-01-01','2041-01-01')).toBe(0);
    expect(periodExpense(asset,'2023-04-01','2023-05-01')).toBeCloseTo(15000);
    expect(validAsset({...asset, acquired:'2023-02-31'})).toBe(false);
    expect(validAsset({...asset, lifeYears:0})).toBe(false);
  });
  it('keeps unavailable purchase comparisons unavailable',()=>{
    expect(productChange({purchase:null,previousPurchase:10},'purchase')).toBeNull();
    expect(productChange({purchase:10,previousPurchase:14.3},'purchase')).toBe(-4.3);
  });
});

describe('public source scraper', () => {
  it('reads only the public ranking block and leaves unpublished figures null', () => {
    const html='<script>Brand 99%</script><h3>注目ランキング</h3><h4>3ヶ月内購入</h4><p>1. Brand（Maker） ２９.５％</p><h4>再購入意向</h4><p>1. Other（Maker） 66.8%</p><p>グラフの閲覧には登録が必要です</p>';
    expect(parsePublicRanking(html,'Brand')).toEqual({purchase:29.5,repeat:null});
  });
  it('does not overwrite the dated snapshot when a publisher blocks a refresh', async () => {
    const path=new NodeURL('../forecasting-products.json',import.meta.url);
    const before=await readFile(path,'utf8');
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:503}));
    await expect(refresh()).rejects.toThrow('HTTP 503');
    expect(await readFile(path,'utf8')).toBe(before);
  });
});
