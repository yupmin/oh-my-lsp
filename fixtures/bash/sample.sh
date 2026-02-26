#!/usr/bin/env bash

add() {
  local a="$1"
  local b="$2"
  echo $((a + b))
}

result="$(add 1 2)"
echo "$result"
