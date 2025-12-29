const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '8080', 10);

// Create the Next.js app
const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  // Import Express app after Next.js is ready
  require('./app.js')(nextApp, handle);
}).catch((ex) => {
  console.error(ex.stack);
  process.exit(1);
});

