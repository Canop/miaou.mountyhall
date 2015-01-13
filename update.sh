#!/bin/bash

rm Public_Trolls.txt-save
mv Public_Trolls.txt Public_Trolls.txt-save
lftp ftp://ftp.mountyhall.com/ -e "get /Public_Trolls.txt -o Public_Trolls.txt; quit"
node update.js

