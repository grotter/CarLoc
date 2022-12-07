#!/bin/sh

rsync -av . grotter@ssh.ocf.berkeley.edu:/services/http/users/g/grotter/prius/ --exclude=".*" --exclude="LICENSE" --exclude="*.sh" --exclude="*.md"
