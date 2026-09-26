FROM node:20-bookworm-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html
RUN printf '%s\n' \
  'server {' \
  '  listen 8080;' \
  '  server_tokens off;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  add_header X-Content-Type-Options "nosniff" always;' \
  '  add_header X-Frame-Options "DENY" always;' \
  '  add_header Referrer-Policy "no-referrer" always;' \
  '  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;' \
  '  add_header Content-Security-Policy "default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com; font-src \'self\' https://fonts.gstatic.com; img-src \'self\' data: https:; frame-src https://www.youtube-nocookie.com https://www.youtube.com; connect-src \'self\' https: http://localhost:3000 http://127.0.0.1:3000" always;' \
  '  location / {' \
  '    try_files $uri $uri/ /index.html;' \
  '  }' \
  '  location ~* \\.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {' \
  '    expires 7d;' \
  '    add_header Cache-Control "public, immutable";' \
  '  }' \
  '}' > /etc/nginx/conf.d/default.conf

USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
