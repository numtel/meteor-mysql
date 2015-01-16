#!/bin/sh
meteor "$@" --settings test/travis/settings.$TEST_SETTINGS.json || exit $?
