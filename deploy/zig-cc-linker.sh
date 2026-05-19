#!/bin/bash
exec /opt/homebrew/bin/zig cc -target x86_64-linux-gnu "$@"
