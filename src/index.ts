import Fastify from 'fastify';
import { CONFIG } from './config';
import { passthrough } from './handlers/passthrough';
import cors from '@fastify/cors';
import { elevated } from './handlers/elevate';

const main = async () => {
  const app = Fastify({ ignoreTrailingSlash: true });

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

  app.all('/sync/', passthrough(/^\/sync/));
  app.all('/sync/*', passthrough(/^\/sync/));

  app.delete('/sync/:db', elevated(/^\/sync/));
  app.put('/sync/:db', elevated(/^\/sync/));

  const address = await app.listen({ port: CONFIG.port });
  console.log(`Server listening at ${address}`);
};

main();
