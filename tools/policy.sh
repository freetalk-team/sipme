#!/bin/sh

APP_NAME="**Web Messenger**" \
COMPANY_NAME="**Freetalk Team**" \
CONTACT_EMAIL="team.freetalk@gmail.com" \
DATE="12 Dec 2023" \
envsubst '$APP_NAME $COMPANY_NAME $DATE $CONTACT_EMAIL' < $1
