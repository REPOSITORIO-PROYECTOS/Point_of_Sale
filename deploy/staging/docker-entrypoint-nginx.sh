#!/bin/sh
set -e

A="${STAGING_LOCAL_A_HOST:-local-a.tu-dominio.com}"
B="${STAGING_LOCAL_B_HOST:-local-b.tu-dominio.com}"

sed -e "s#\${STAGING_LOCAL_A_HOST}#${A}#g" \
    -e "s#\${STAGING_LOCAL_B_HOST}#${B}#g" \
    /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
