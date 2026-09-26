// Run against the seeded development API: npm run test:admin-tickets
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { MessageChannel } from 'node:worker_threads';

const apiUrl = process.env.ITSM_BASE_URL || 'http://127.0.0.1:8000';
const temporary = await mkdtemp(join(tmpdir(), 'ziko-ui-'));
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:8080/tickets' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
// React act creates channels when bundled as ESM. Close them after assertions.
const originalMessageChannel = globalThis.MessageChannel;
const channels = [];
globalThis.MessageChannel = class extends MessageChannel {
  constructor() { super(); channels.push(this); }
};
const originalFetch = globalThis.fetch;
const liveFetch = (url, options) => originalFetch(new URL(url, apiUrl), options);
globalThis.fetch = liveFetch;
let root;
let cleanupAct;
try {
  const bundle = join(temporary, 'components.mjs');
  await build({ stdin: { contents: `
    export { default as React, act } from 'react';
    export { createRoot } from 'react-dom/client';
    export { MemoryRouter, Routes, Route } from 'react-router-dom';
    export { default as Tickets } from './src/pages/Tickets.jsx';
    export { default as TicketDetail } from './src/pages/TicketDetail.jsx';
    export { api } from './src/services/api.js';
  `, resolveDir: process.cwd() }, bundle: true, outfile: bundle,
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    format: 'esm', platform: 'node', jsx: 'automatic', define: { 'import.meta.env': '{}' } });
  const { React, act, createRoot, MemoryRouter, Routes, Route, Tickets, TicketDetail, api } = await import(pathToFileURL(bundle));
  cleanupAct = act;
  const h = React.createElement;
  const pause = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 350)); }); };
  const waitFor = async (condition) => {
    for (let attempt = 0; attempt < 40; attempt++) { if (condition()) return; await pause(); }
    assert.ok(condition(), 'UI condition timed out');
  };
  const login = async (email, password) => localStorage.setItem('token', (await api.login(email, password)).access_token);
  await login('admin@example.com', 'admin123');
  const customers = await api.listCustomers();
  const devices = await api.listDevices(customers[0].id);
  const categories = await api.listCategories();
  const title = `Admin UI test ${Date.now()}`;
  const ticket = await api.createTicket({ customer_id: customers[0].id, device_id: devices[0].id,
    category_id: categories[0].id, title, description: 'Admin status integration test', priority: 'LOW' });
  const mount = async (Component, path = '/tickets') => {
    if (root) await act(async () => root.unmount());
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(h(MemoryRouter, { initialEntries: [path],
      future: { v7_startTransition: true, v7_relativeSplatPath: true } },
      h(Routes, null, h(Route, { path: Component === TicketDetail ? '/tickets/:id' : '/tickets', element: h(Component) })))));
    await pause();
  };
  const dropdown = () => document.querySelector(`[aria-label="Status for ticket #${ticket.id}"]`);
  const choose = async (value) => {
    await act(async () => {
      dropdown().value = value;
      dropdown().dispatchEvent(new window.Event('change', { bubbles: true }));
    });
  };
  const clickFilter = async (label) => {
    await act(async () => [...document.querySelectorAll('button')].find((button) => button.textContent === label).click());
    await pause();
  };
  await mount(Tickets);
  await waitFor(() => dropdown());
  for (const value of ['IN_PROGRESS', 'RESOLVED', 'CLOSED', 'OPEN']) {
    await choose(value);
    await waitFor(() => dropdown()?.value === value && !dropdown().disabled && document.querySelector('[role="status"]'));
    assert.equal((await api.getTicket(ticket.id)).status, value === 'OPEN' ? 'NEW' : value);
  }
  await clickFilter('Open');
  await waitFor(() => dropdown());
  await choose('RESOLVED');
  await waitFor(() => !dropdown() && document.querySelector('[role="status"]'));
  await clickFilter('Resolved');
  await waitFor(() => dropdown());
  assert.equal(dropdown().value, 'RESOLVED');
  await clickFilter('All');
  await waitFor(() => dropdown());
  // A failed save must keep the persisted value and expose an accessible error.
  globalThis.fetch = (url, options) => options?.method === 'PATCH'
    ? Promise.resolve(new Response(JSON.stringify({ detail: 'Forbidden test' }), { status: 403 }))
    : liveFetch(url, options);
  await choose('CLOSED');
  await waitFor(() => document.querySelector('[role="alert"]'));
  assert.equal(dropdown().value, 'RESOLVED');
  assert.match(document.querySelector('[role="alert"]').textContent, /Forbidden test/);
  globalThis.fetch = liveFetch;
  await mount(TicketDetail, `/tickets/${ticket.id}`);
  await waitFor(() => dropdown());
  await choose('CLOSED');
  await waitFor(() => dropdown()?.value === 'CLOSED' && document.querySelector('[role="status"]'));
  assert.equal((await api.getTicket(ticket.id)).status, 'CLOSED');
  assert.match(document.body.textContent, /RESOLVED → CLOSED/);
  for (const [email, password] of [['manager@example.com', 'manager123'], ['tech@example.com', 'tech123'], ['customer@example.com', 'customer123']]) {
    await login(email, password);
    await mount(Tickets);
    assert.equal(document.querySelector('select[aria-label^="Status for ticket"]'), null);
    await mount(TicketDetail, `/tickets/${ticket.id}`);
    await waitFor(() => document.body.textContent.includes(title) || document.querySelector('.error-msg'));
    assert.equal(dropdown(), null);
  }
  assert.equal(window.location.pathname, '/tickets');
  console.log(`Admin React DOM + live PostgreSQL API workflow passed (test ticket #${ticket.id}).`);
} finally {
  if (root) await cleanupAct(async () => root.unmount());
  globalThis.fetch = originalFetch;
  dom.window.close();
  await rm(temporary, { recursive: true, force: true });
  channels.forEach(({ port1, port2 }) => { port1.close(); port2.close(); });
  globalThis.MessageChannel = originalMessageChannel;
}
