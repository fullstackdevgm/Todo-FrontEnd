#!/bin/bash
grep '"version"' package.json | cut -d\" -f4
