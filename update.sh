#!/bin/bash

rm Public_Trolls.txt-save
mv Public_Trolls.txt Public_Trolls.txt-save
wget https://ftp.mountyhall.com/Public_Trolls.txt
node update.js

