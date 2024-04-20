FROM alpine:3.18

RUN apk add --update \
    curl \
    vim \
    iproute2 \
    sqlite \
    postgresql14-client \
    kamailio \
    kamailio-extras \
    kamailio-debugger \
    kamailio-authephemeral \
    kamailio-geoip2 \
    kamailio-http_async \
    kamailio-json \
    kamailio-postgres \
    kamailio-presence \
    kamailio-sqlite \
    kamailio-websocket \
    kamailio-xml \
    kamailio-jsdt

COPY ./modules/irc.so /usr/lib/kamailio/modules/irc.so

ENTRYPOINT ["kamailio", "-DD", "-E"]
