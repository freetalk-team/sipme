#!/bin/bash

ROOT=https://www.gstatic.com/firebasejs/
VER=10.7.0

LIB=${ROOT}${VER}
UI="./ui/lib/firebase-${VER}"

for filename in *.js; do
	echo "Converting file: $filename"
	for mod in app auth storage database messaging; do
		src="${LIB}/firebase-${mod}.js"
		dst="${UI}/${mod}.js"
		echo "# ${src}"
		echo "## ${dst}"
		
		sed -i "s%$src%$dst%" $filename
	done
done


