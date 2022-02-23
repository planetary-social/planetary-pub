#!/bin/sh
BRANCH=`git rev-parse --abbrev-ref HEAD`

if [[ "$BRANCH" == "main" || "$BRANCH" == "staging" || "$BRANCH" == "dev" ]]; then
    npm test
    exit $?
fi

exit 0
