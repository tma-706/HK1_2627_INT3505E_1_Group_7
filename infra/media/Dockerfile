FROM alpine:3.22 AS download
ARG TARGETARCH
RUN set -eu; \
    case "$TARGETARCH" in \
      amd64) checksum=f156c609eeaf9e5fcfeea33fd70411222005f83760aa95893c9d58eff006b45c ;; \
      arm64) checksum=ced87c09a2a5e87c7c94fd25e36c421670b97fded064026738a69f13ee8c7b96 ;; \
      *) exit 1 ;; \
    esac; \
    wget -qO /tmp/seaweed.tar.gz "https://github.com/seaweedfs/seaweedfs/releases/download/4.55/linux_${TARGETARCH}.tar.gz"; \
    echo "$checksum  /tmp/seaweed.tar.gz" | sha256sum -c -; \
    tar -xzf /tmp/seaweed.tar.gz -C /tmp weed

FROM alpine:3.22
RUN apk add --no-cache su-exec && addgroup -S seaweed && adduser -S -G seaweed seaweed
COPY --from=download /tmp/weed /usr/local/bin/weed
COPY start.sh /usr/local/bin/start-media
ENTRYPOINT ["/bin/sh", "/usr/local/bin/start-media"]
