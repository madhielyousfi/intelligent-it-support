// Run against the seeded development API: npm run test:knowledge-base
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
    export { default as KnowledgeBase } from './src/pages/KnowledgeBase.jsx';
    export { Simulate } from 'react-dom/test-utils';
    export { default as TicketDetail } from './src/pages/TicketDetail.jsx';
    export { api } from './src/services/api.js';
  `, resolveDir: process.cwd() }, bundle: true, outfile: bundle,
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    format: 'esm', platform: 'node', jsx: 'automatic', define: { 'import.meta.env': '{}' } });
  const { React, act, createRoot, MemoryRouter, Routes, Route, KnowledgeBase, Simulate, api } = await import(pathToFileURL(bundle));
  cleanupAct = act;
  const h = React.createElement;
  const pause = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 350)); }); };
  const waitFor = async (condition) => {
    for (let attempt = 0; attempt < 40; attempt++) { if (condition()) return; await pause(); }
    assert.ok(condition(), 'UI condition timed out');
  };
  const login = async (email, password) => localStorage.setItem('token', (await api.login(email, password)).access_token);
  await login('admin@example.com', 'admin123');
  const article = await api.createArticle({ title: `KB edit test ${Date.now()}`, content: "Original content", category_id: null });
  try {
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(h(KnowledgeBase)));
    await waitFor(() => document.querySelector('article'));
    const card = () => [...document.querySelectorAll('article')].find((item) => item.textContent.includes(article.title));
    const button = (label) => [...document.querySelectorAll('button')].find((item) => item.textContent === label);
    await act(async () => card().querySelector('button').click());
    assert.equal(document.querySelector('[aria-label="Edit article"] input').value, article.title);
    const setField = async (selector, value) => {
      await act(async () => {
        const field = document.querySelector(selector);
        field.value = value;
        Simulate.change(field, { target: { value } });
      });
    };
    await setField('[aria-label="Edit article"] input', 'Cancelled title');
    await act(async () => button('Cancel').click());
    assert.equal(document.querySelector('[aria-label="Edit article"]'), null);
    assert.equal((await api.listArticles()).find((item) => item.id === article.id).title, article.title);
    await act(async () => card().querySelector('button').click());
    const newTitle = article.title + ' updated';
    const newContent = 'Updated instructions\nSecond line';
    await setField('[aria-label="Edit article"] input', newTitle);
    await setField('[aria-label="Edit article"] textarea', newContent);
    await act(async () => Simulate.submit(document.querySelector('[aria-label="Edit article"]')));
    await waitFor(() => document.querySelector('[role="status"]'));
    const stored = (await api.listArticles()).find((item) => item.id === article.id);
    assert.equal(stored.title, newTitle);
    assert.equal(stored.content, newContent);
    assert.match(document.body.textContent, /Second line/);
    await act(async () => card().querySelector('button').click());
    globalThis.fetch = (url, options) => options?.method === 'PATCH'
      ? Promise.resolve(new Response(JSON.stringify({ detail: 'Save failed test' }), { status: 500 }))
      : liveFetch(url, options);
    await setField('[aria-label="Edit article"] input', 'Keep this draft');
    await act(async () => Simulate.submit(document.querySelector('[aria-label="Edit article"]')));
    await waitFor(() => document.querySelector('[role="alert"]'));
    assert.equal(document.querySelector('[aria-label="Edit article"] input').value, 'Keep this draft');
    assert.match(document.querySelector('[role="alert"]').textContent, /Save failed test/);
    console.log('Knowledge Base Edit, Cancel, persisted Save, multiline content and error recovery passed.');
  } finally {
    globalThis.fetch = liveFetch;
    await api.deleteArticle(article.id);
  }
} finally {
  if (root) await cleanupAct(async () => root.unmount());
  globalThis.fetch = originalFetch;
  dom.window.close();
  await rm(temporary, { recursive: true, force: true });
  channels.forEach(({ port1, port2 }) => { port1.close(); port2.close(); });
  globalThis.MessageChannel = originalMessageChannel;
}
