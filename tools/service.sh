#!/bin/sh

bin=$(dirname $0)
#path=.

ident="                "
ilen=${#ident}



start_service() {
	service=$1

	echo "Starting $service"

	case $service in

	"nginx")
		(monitor nginx -g'daemon off;' > /dev/null 2>&1 &)
		;;

	"kamailio")
		(monitor kamailio -E -n1 -N1 -DD > /dev/null 2>&1 &)
		;;

	"tracker")
		(monitor bittorrent-tracker --ws --http > /dev/null 2>&1 &)
		;;

	"push")
		(monitor push_proxy 9012 > /dev/null 2>&1 &)
		;;

	*)
		echo "Unknown service name: $service"
		return
		;;

	esac
}



usage() {
	echo "Usage:\n$0 COMMAND [ARGS]"
	echo
	echo "Examples:"
	echo "\t# Start Push Proxy"
	echo "\tservice start push"
	echo

	exit 0
}

if [ "$#" -eq "0" ]; then
	usage
fi

cmd=$1
shift

case "$cmd" in
	
"start")
	if [ "$#" -eq "0" ]; then
		echo "Missing service name"
		exit 0
	fi

	while [ "$#" -gt "0" ]; do
		start_service $1
		shift
	done

	sleep 1
	;;


*)
	echo "Unkwnon command: $cmd"
	;;

esac
