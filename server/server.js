require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/personas', require('./routes/personas'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/ai', require('./routes/ai'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// ── Native HTTP server ────────────────────────────────────────────────────────
const port = normalizePort(process.env.PORT || '5001');
app.set('port', port);

const server = http.createServer(app);
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function normalizePort(val) {
  const n = parseInt(val, 10);
  if (isNaN(n)) return val;
  if (n >= 0) return n;
  return false;
}

function onError(error) {
  if (error.syscall !== 'listen') throw error;
  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
  if (error.code === 'EACCES') { console.error(bind + ' requires elevated privileges'); process.exit(1); }
  if (error.code === 'EADDRINUSE') { console.error(bind + ' is already in use'); process.exit(1); }
  throw error;
}

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  const url = typeof addr === 'string' ? addr : 'http://localhost:' + addr.port;
  console.log('Server listening on ' + bind + ' (' + url + ')');
}

module.exports = app;
