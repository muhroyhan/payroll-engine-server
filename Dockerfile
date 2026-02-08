FROM oven/bun:latest AS base
WORKDIR /opt/app
COPY . .
RUN bun i
RUN bun run build

# FROM base AS nodejs
# WORKDIR /opt/app
# COPY --from=base /opt/app/node_modules ./node_modules/
# COPY --from=base /opt/app/dist ./dist/
# RUN groupadd -r sysuser && useradd -r -g sysuser sysuser \
#     && mkdir -p /home/sysuser/Downloads \
#     && chown -R sysuser:sysuser /home/sysuser \
#     && chown -R sysuser:sysuser /opt/app
# USER sysuser
EXPOSE 3000
CMD ["bun", "start:dev"]