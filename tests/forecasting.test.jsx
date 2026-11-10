import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App, ExplainLayer } from '../forecasting.jsx';

beforeAll(() => {
  // jsdom does not implement the native dialog methods used by browsers.
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.useRealTimers();
});

describe('sales forecast', () => {
  it('remembers week mode and updates its visual cards while stepping', () => {
    const view = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Week', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Next day' }));
    expect(document.querySelector('.revenue').textContent).toContain('¥99,800');
    expect(document.querySelector('.metric-content').textContent).toContain('Week of Nov 16');
    expect(document.querySelector('.compact-summary')).toBeNull();
    expect(document.querySelectorAll('.insight-card').length).toBe(8);
    fireEvent.click(screen.getByRole('button', { name: 'Trends', exact: true }));
    expect(screen.getByRole('img', { name: 'Station eight-week sales overview' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Lines', exact: true }));
    expect(document.querySelector('.expected-trend')).toBeTruthy();
    expect(document.querySelector('.expected-bar')).toBeNull();
    view.unmount();
    render(<App />);
    expect(screen.getByRole('button', { name: 'Week', exact: true }).getAttribute('aria-pressed')).toBe('true');
  });

  it('supports keyboard selection and dismisses custom menus', () => {
    render(<App />);
    const picker = screen.getByRole('combobox', { name: 'Machine' });
    fireEvent.keyDown(picker, {key:'ArrowDown'});
    expect(picker.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(picker, {key:'End'});
    fireEvent.keyDown(picker, {key:'Enter'});
    expect(picker.value).toBe('Park');
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.click(picker);
    fireEvent.keyDown(picker, {key:'Escape'});
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.click(picker);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('jumps to a selected week and updates the machine cards together', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Week', exact: true }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Select week' }));
    fireEvent.click(screen.getByRole('option', { name: 'Week of Dec 28' }));
    expect(document.querySelector('.revenue').textContent).toContain('¥88,400');
    const machineCards = [...document.querySelectorAll('.machine-insight')];
    expect(machineCards[1].textContent).toContain('¥9,800');
    expect(machineCards[2].textContent).toContain('¥17,900');
    expect(screen.getByRole('button', { name: 'Next day' }).disabled).toBe(true);
    fireEvent.click(machineCards[1].querySelector('.card-action'));
    expect(screen.getByRole('combobox', { name: 'Machine' }).value).toBe('Office');
    expect(screen.getByRole('button', { name: 'Trends', exact: true }).getAttribute('aria-pressed')).toBe('true');
  });

  it('offers calendar months, hot drink values, and machine comparison', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Forecast Model' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Month', exact: true }));
    const picker = screen.getByRole('combobox', { name: 'Select month' });
    fireEvent.click(picker);
    expect(screen.getAllByRole('option').length).toBe(3);
    expect(screen.getAllByRole('option')[0].textContent).toContain('Nov 9–30');
    expect(document.querySelector('.revenue').textContent).toContain('¥313,400');
    fireEvent.click(screen.getByRole('option', { name: 'Jan 1–3' }));
    expect(document.querySelector('.revenue').textContent).toContain('¥37,900');
    fireEvent.click(screen.getByRole('combobox',{name:'Forecast data'}));
    fireEvent.click(screen.getByRole('option',{name:'Hot drinks',exact:true}));
    expect(document.querySelector('.primary-insight .insight-title').textContent).toContain('Hot drink sales');
    expect(document.querySelector('.revenue').textContent).not.toContain('¥37,900');
    fireEvent.click(screen.getByRole('combobox',{name:'Forecast data'}));
    fireEvent.click(screen.getByRole('option',{name:'Compare',exact:true}));
    fireEvent.click(screen.getByRole('button', { name: 'Trends', exact: true }));
    expect(document.querySelectorAll('.compare-plot').length).toBe(3);
    expect(document.querySelector('.overview-heading').textContent).toContain('Compare machines');
    expect(document.body.textContent).not.toContain('NaN');
  });

  it('keeps a conversation when periods change and after a page remount', () => {
    const view = render(<App />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Ask about your forecast' }), { target: { value: 'Why is Park below expected?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message', exact: true }));
    expect(screen.getByRole('log', { name: 'Conversation' }).textContent).toContain('may be jammed');
    fireEvent.click(screen.getByRole('button', { name: 'Week', exact: true }));
    expect(screen.getByRole('log', { name: 'Conversation' }).textContent).toContain('Why is Park below expected?');
    view.unmount();
    render(<App />);
    expect(screen.getByRole('log', { name: 'Conversation' }).textContent).toContain('may be jammed');
  });

  it('opens an explanation with Enter and hands its question to chat', () => {
    render(<App />);
    const number = document.querySelector('.revenue [data-explain]');
    fireEvent.keyDown(number, { key: 'Enter' });
    expect(screen.getByRole('dialog', { name: 'Station, Monday’s expected sales' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ask Bean more ›' }));
    expect(screen.getByRole('textbox', { name: 'Ask about your forecast' }).value).toContain('station, monday');
    expect(screen.queryByRole('dialog', { name: 'Station, Monday’s expected sales' })).toBeNull();
  });

  it('offers the delayed icon and keeps a touch explanation open after its generated click', () => {
    vi.useFakeTimers();
    const details = JSON.stringify({ title: 'Test sales', body: 'Sales from the sample data.', question: 'Why?' });
    render(<><span data-explain={details} tabIndex={0}>¥2,900</span><ExplainLayer onAsk={() => {}} /></>);
    const target = screen.getByText('¥2,900');
    const move = new Event('pointermove', { bubbles: true });
    Object.assign(move, { clientX: 100, clientY: 100, pointerType: 'mouse' });
    fireEvent(target, move);
    expect(screen.queryByRole('button', { name: 'Explain this' })).toBeNull();
    act(() => vi.advanceTimersByTime(499));
    expect(screen.queryByRole('button', { name: 'Explain this' })).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('button', { name: 'Explain this' })).toBeTruthy();
    // Touch must open directly and survive the follow-up click sent by browsers.
    const touch = new Event('pointerup', { bubbles: true, cancelable: true });
    Object.assign(touch, { pointerType: 'touch' });
    fireEvent(target, touch);
    fireEvent.click(target);
    expect(screen.getByRole('dialog', { name: 'Test sales' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Test sales' })).toBeNull();
  });
});
