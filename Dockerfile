FROM node:18-alpine AS builder

# Copy the app
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
COPY tsconfig.json /app/tsconfig.json
COPY src /app/src

# build the app
RUN cd /app && npm ci && npm run build

FROM debian:bullseye-slim

# Add CouchDB user account to make sure the IDs are assigned consistently
RUN groupadd -g 5984 -r couchdb && useradd -u 5984 -d /opt/couchdb -g couchdb couchdb

# be sure GPG and apt-transport-https are available and functional
RUN set -ex; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        apt-transport-https \
        ca-certificates \
        dirmngr \
        gnupg \
     ; \
    rm -rf /var/lib/apt/lists/*

# grab tini for signal handling and zombie reaping
# see https://github.com/apache/couchdb-docker/pull/28#discussion_r141112407
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends tini; \
    rm -rf /var/lib/apt/lists/*; \
    tini --version

# http://docs.couchdb.org/en/latest/install/unix.html#installing-the-apache-couchdb-packages
ENV GPG_COUCH_KEY \
# gpg: rsa8192 205-01-19 The Apache Software Foundation (Package repository signing key) <root@apache.org>
    390EF70BB1EA12B2773962950EE62FB37A00258D
RUN set -eux; \
    apt-get update; \
    apt-get install -y curl; \
    export GNUPGHOME="$(mktemp -d)"; \
    curl -fL -o keys.asc https://couchdb.apache.org/repo/keys.asc; \
    gpg --batch --import keys.asc; \
    gpg --batch --export "${GPG_COUCH_KEY}" > /usr/share/keyrings/couchdb-archive-keyring.gpg; \
    command -v gpgconf && gpgconf --kill all || :; \
    rm -rf "$GNUPGHOME"; \
    apt-key list; \
    apt purge -y --autoremove curl; \
    rm -rf /var/lib/apt/lists/*

ENV COUCHDB_VERSION 3.3.1

RUN . /etc/os-release; \
    echo "deb [signed-by=/usr/share/keyrings/couchdb-archive-keyring.gpg] https://apache.jfrog.io/artifactory/couchdb-deb/ ${VERSION_CODENAME} main" | \
        tee /etc/apt/sources.list.d/couchdb.list >/dev/null

# https://github.com/apache/couchdb-pkg/blob/master/debian/README.Debian
RUN set -eux; \
    apt-get update; \
    \
    echo "couchdb couchdb/mode select none" | debconf-set-selections; \
# we DO want recommends this time
    DEBIAN_FRONTEND=noninteractive apt-get install -y --allow-downgrades --allow-remove-essential --allow-change-held-packages \
            couchdb="$COUCHDB_VERSION"~bullseye \
    ; \
# Undo symlinks to /var/log and /var/lib
    rmdir /var/lib/couchdb /var/log/couchdb; \
    rm /opt/couchdb/data /opt/couchdb/var/log; \
    mkdir -p /opt/couchdb/data /opt/couchdb/var/log; \
    chown couchdb:couchdb /opt/couchdb/data /opt/couchdb/var/log; \
    chmod 777 /opt/couchdb/data /opt/couchdb/var/log; \
# Remove file that sets logging to a file
    rm /opt/couchdb/etc/default.d/10-filelog.ini; \
# Check we own everything in /opt/couchdb. Matches the command in dockerfile_entrypoint.sh
    find /opt/couchdb \! \( -user couchdb -group couchdb \) -exec chown -f couchdb:couchdb '{}' +; \
# Setup directories and permissions for config. Technically these could be 555 and 444 respectively
# but we keep them as 755 and 644 for consistency with CouchDB defaults and the dockerfile_entrypoint.sh.
    find /opt/couchdb/etc -type d ! -perm 0755 -exec chmod -f 0755 '{}' +; \
    find /opt/couchdb/etc -type f ! -perm 0644 -exec chmod -f 0644 '{}' +; \
# only local.d needs to be writable for the docker_entrypoint.sh
    chmod -f 0777 /opt/couchdb/etc/local.d;
    
RUN curl -sL https://deb.nodesource.com/setup_18.x | bash - 
RUN apt-get install -y nodejs; \
    # apt clean-up
    rm -rf /var/lib/apt/lists/*;

# Add configuration
COPY --chown=couchdb:couchdb 10-docker-default.ini /opt/couchdb/etc/default.d/
COPY --chown=couchdb:couchdb vm.args /opt/couchdb/etc/

COPY docker-entrypoint.sh /usr/local/bin
RUN ln -s usr/local/bin/docker-entrypoint.sh /docker-entrypoint.sh # backwards compat

# Copy the app
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json
COPY --from=builder /app/dist /app/dist

# Copy the config template
COPY .config.js.template /app/.config.js.template

# npm install without dev dependencies
RUN cd /app && npm ci --omit=dev

# clean up
RUN npm cache clean --force

# Create a data directory
RUN mkdir /teesidian && chown couchdb:couchdb /teesidian

# Link the data directory
VOLUME /teesidian

# Expose app ports
EXPOSE 5985

# setup the entrypoint
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]

CMD [ "boot" ]
