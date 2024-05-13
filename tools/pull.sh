#!/bin/sh

findup() {
	filename=$1
	[ ! -f ${filename} ] && echo "no filename" && exit -1

	path=$(dirname `pwd`)
	while [ ! -z "${path}" ] && [ ! -e ${path}/${filename} ]; do
	   path=${path%/*}
	done

	[ -z "${path}" ] && exit -1;

	echo ${path}
}

ROOT=$(findup package.json)
PUBLIC=${ROOT}/public

echo "Source root: $ROOT"

mkdir -p db
mkdir -p config
mkdir -p service

mkdir -p public/dist
mkdir -p public/ui/lib
mkdir -p public/ui/css

mkdir -p kamailio/modules

echo "Pulling backend code ..."
for dir in package.json server.js common api node oauth2 views tools; do
    cp -r ${ROOT}/${dir} .
done

cp ${ROOT}/config/logger.json config/

echo "Pulling db models ..."
for dir in common models; do
    cp -r ${ROOT}/db/${dir} db/
done

echo "Pulling services ..."
for dir in sip notify; do
    cp -r ${ROOT}/service/${dir} service/
done

for file in date.js object.js string.js; do
    cp --remove-destination ${PUBLIC}/common/utils/${file} common/
done

cp ${PUBLIC}/ui/lib/marked/lib/marked.esm.js common/marked.mjs
cp ${PUBLIC}/editor/runner.js common/runner2.mjs

cp ${PUBLIC}/dist/app.min.js public/app.js
cp ${PUBLIC}/dist/app.min.css public/app.css
cp ${PUBLIC}/dist/main.min.css public/main.css

for file in site.css sw.js; do
    cp ${PUBLIC}/${file} public/
done

for file in sip.js codemirror.js webtorrent.min.js; do
    cp ${PUBLIC}/dist/${file} public/dist/
done

for font in raleway inconsolata monday-feelings super-boys; do

    src=${PUBLIC}/ui/css/${font}
    dst=public/ui/css/${font}

    mkdir -p $dst
    cp ${src}/font.ttf ${dst}/ 

done

for dir in svg png ico ogg screenshot; do
    cp -r ${PUBLIC}/ui/${dir} public/ui/
done

mkdir -p public/ui/lib/fontawesome6
cp -r ${PUBLIC}/ui/lib/fontawesome6/webfonts public/ui/lib/fontawesome6/

mkdir -p public/ui/lib/picmo
for file in data.json messages.json; do
    cp ${PUBLIC}/ui/lib/picmo/${file} public/ui/lib/picmo/
done

cp ${ROOT}/deploy/kamailio/modules/irc.so kamailio/modules/
cp ${ROOT}/deploy/kamailio/push_proxy.js kamailio/
cp -r ${ROOT}/deploy/kamailio/scripts kamailio/


# cp -r ${ROOT}
# cp -r ${ROOT}
# cp -r ${ROOT}
# cp -r ${ROOT}
