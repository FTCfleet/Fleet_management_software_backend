#!/bin/bash
# Wrapper to launch Chrome without VPS host LD_PRELOAD
unset LD_PRELOAD
exec /usr/bin/google-chrome-stable "$@"
