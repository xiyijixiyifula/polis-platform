# ============================================================================
# Polis 多阶段构建
# ============================================================================

# ---- Builder ----
FROM rust:1.81-alpine AS builder
RUN apk add --no-cache musl-dev pkg-config openssl-dev perl make

WORKDIR /app

# 复制 manifests
COPY Cargo.toml Cargo.lock* ./
COPY crates/polis-core/Cargo.toml crates/polis-core/
COPY crates/polis-gateway/Cargo.toml crates/polis-gateway/
COPY crates/polis-user/Cargo.toml crates/polis-user/
COPY crates/polis-space/Cargo.toml crates/polis-space/
COPY crates/polis-content/Cargo.toml crates/polis-content/
COPY crates/polis-search/Cargo.toml crates/polis-search/
COPY crates/polis-video/Cargo.toml crates/polis-video/
COPY crates/polis-chat/Cargo.toml crates/polis-chat/
COPY crates/polis-code/Cargo.toml crates/polis-code/
COPY crates/polis-pay/Cargo.toml crates/polis-pay/
COPY crates/polis-store/Cargo.toml crates/polis-store/
COPY crates/polis-aggregate/Cargo.toml crates/polis-aggregate/
COPY crates/polis-notify/Cargo.toml crates/polis-notify/
COPY crates/polis-admin/Cargo.toml crates/polis-admin/
COPY crates/polis-plugin-engine/Cargo.toml crates/polis-plugin-engine/

ARG SERVICE

# 创建 dummy 源文件用于缓存依赖
RUN for crate in polis-core polis-gateway polis-user polis-space polis-content polis-search polis-video polis-chat polis-code polis-pay polis-store polis-aggregate polis-notify polis-admin polis-plugin-engine; do \
  mkdir -p crates/$crate/src && echo "// dummy" > crates/$crate/src/lib.rs && \
  if [ "$crate" != "polis-core" ]; then echo "fn main() {}" > crates/$crate/src/main.rs; fi; \
  done
RUN cargo build --release -p $SERVICE 2>/dev/null || true

# 复制实际源码并编译
COPY . .
RUN cargo build --release -p $SERVICE

# ---- Runtime ----
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
ARG SERVICE
COPY --from=builder /app/target/release/$SERVICE /usr/local/bin/service
EXPOSE 3000
CMD ["/usr/local/bin/service"]
