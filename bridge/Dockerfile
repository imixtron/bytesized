FROM node:22-alpine
RUN apk add --no-cache tzdata
WORKDIR /app
COPY server.mjs .
USER node
EXPOSE 9100
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:9100/health || exit 1
CMD ["node", "server.mjs"]
