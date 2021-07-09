#!/bin/sh

# Run from project root
docker buildx build \
--push \
--no-cache \
--platform linux/arm64,linux/arm/v7,linux/amd64 \
--tag vaxann/torrentlassoedgeimg:latest \
-f docker/Dockerfile .