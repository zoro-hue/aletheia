const http = require('http');

const PORT = 8123;

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const query = (urlObj.searchParams.get('query') || body || '').trim();
    
    console.log(`[ClickHouse Mock] ${req.method} ${req.url}`);
    if (query) {
      console.log(`[ClickHouse Mock] SQL: ${query}`);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });

    if (query.toLowerCase().includes('version()')) {
      if (query.toLowerCase().includes('jsoneachrow')) {
        res.end(JSON.stringify({ version: '24.3.1.2' }) + '\n');
      } else {
        res.end(JSON.stringify({
          meta: [{ name: 'version', type: 'String' }],
          data: [{ version: '24.3.1.2' }],
          rows: 1
        }) + '\n');
      }
    } else if (query.toLowerCase().includes('show tables') || query.toLowerCase().includes('system.tables')) {
      res.end(JSON.stringify({
        meta: [{ name: 'name', type: 'String' }],
        data: [
          { name: 'traces' },
          { name: 'observations' },
          { name: 'scores' },
          { name: 'dataset_items' },
          { name: 'dataset_runs' },
          { name: 'dataset_run_items' },
          { name: 'event_log' },
          { name: 'blob_storage_file_log' },
          { name: 'dataset_run_items_rmt' }
        ],
        rows: 9
      }) + '\n');
    } else {
      if (query.toLowerCase().includes('jsoneachrow')) {
        res.end('');
      } else {
        res.end(JSON.stringify({
          meta: [],
          data: [],
          rows: 0
        }) + '\n');
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`[ClickHouse Mock] Server running on http://localhost:${PORT}`);
});
