#!/bin/bash

./install.sh

cwd=${PWD}
trap 'cd "$cwd"' EXIT
cd /home/dys/dev/miaou
./restart.sh
