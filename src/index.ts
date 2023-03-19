import Fastify from 'fastify';
import { CONFIG } from './config';
import { userRequest } from './handlers/user';
import cors from '@fastify/cors';
import { deleteDB, putDB } from './handlers/elevated';
import { checkDatabaseConnection, createDatabaseIfNotExists, createIndex, findDocuments } from './db/database';
import { getVaults } from './apis/vaults';

const main = async () => {
  // wait for couchdb to start, retry for 5 seconds
  let retries = 50;
  while (retries > 0) {
    try {
      await checkDatabaseConnection();
      break;
    } catch (e) {
      console.log('Waiting for CouchDB to start...');
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries--;
    }
    
    if (retries === 0) {
      console.log('CouchDB failed to start, exiting...');
      process.exit(1);
    }
  }

  // database check and creation
  await createDatabaseIfNotExists('i+vaults');
  await createIndex('i+vaults', {
    index: {
      fields: ['user'],
    },
    name: 'user-index',
    type: 'json',
  });

  const app = Fastify({
    ignoreTrailingSlash: true,
    // 128M
    bodyLimit: 134217728,
  });

  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body: string, done) => {
    if (body === '' || body == null) {
      return done(null, undefined);
    }
    let json;
    try {
      json = JSON.parse(body);
    } catch (err) {
      err.statusCode = 400;
      return done(err, undefined);
    }
    done(null, json);
  });

  await app.register(cors, {
    origin: ['app://obsidian.md', 'capacitor://localhost', 'http://localhost'],
    allowedHeaders: 'accept, authorization, content-type, origin, referer',
    exposedHeaders:
      'content-type, cache-control, accept-ranges, etag, server, x-couch-request-id, x-couch-update-newrev, x-couchdb-body-time',
    methods: 'GET, PUT, POST, HEAD, DELETE',
    maxAge: 3600,
    credentials: true,
    strictPreflight: false,
  });

  /** CouchDB wrapper */
  app.all('/sync/', userRequest(/^\/sync/));
  app.all('/sync/*', userRequest(/^\/sync/));

  app.delete('/sync/:db', deleteDB(/^\/sync/));
  app.put('/sync/:db', putDB(/^\/sync/));

  // /** API */
  app.get('/api/vaults', getVaults);

  const address = await app.listen({ port: CONFIG.port, host: CONFIG.host });
  console.log(`Server listening at ${address}`);
};

main();
