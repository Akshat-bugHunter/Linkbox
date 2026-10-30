import { useEffect, useState } from 'react';

export default function App() {
  const [items, setItems] = useState([]);
  const [source, setSource] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const res = await fetch('/api/bookmarks');
    const json = await res.json();
    setItems(json.data || []);
    setSource(json.source || '');
  }

  useEffect(() => {
    load().catch(() => setError('Cannot reach API'));
  }, []);

  async function add(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, url }),
    });
    if (!res.ok) {
      const j = await res.json();
      return setError(j.error || 'Failed');
    }
    setTitle('');
    setUrl('');
    load();
  }

  async function remove(id) {
    await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="wrap">
      <h1>LinkBox</h1>
      <p className="sub">Save links. Served from: <b>{source || '...'}</b></p>

      <form onSubmit={add}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type="submit">Save</button>
      </form>
      {error && <p className="err">{error}</p>}

      <ul>
        {items.map((b) => (
          <li key={b.id}>
            <a href={b.url} target="_blank" rel="noreferrer">{b.title}</a>
            <button onClick={() => remove(b.id)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
