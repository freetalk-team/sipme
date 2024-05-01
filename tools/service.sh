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
		(monitor kamailio -E -DD > /dev/null 2>&1 &)
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

"stop")
	#echo "Stop"
	
	if [ "$#" -eq "0" ]; then
		for service in $services; do
			stop_service $service
		done
	else
		while [ "$#" -gt "0" ]; do
			stop_service $1
			shift
		done
	fi
	;;

"restart")
	if [ "$#" -eq "0" ]; then
		echo "Missing service name"
		exit 0
	fi

	while [ "$#" -gt "0" ]; do
		stop_service $1
		start_service $1
		shift
	done

	sleep 1
	;;

"status")
	if [ "$#" -eq "0" ]; then
		echo "Missing service name"
		exit 0
	fi

	while [ "$#" -gt "0" ]; do
		status $1
		shift
	done
	;;

"version" | "ver")
	cat $cwd/../share/manifest
	;;

"prefix")
	realpath $bin/..
	;;

"X")
	(cd $bin; $@ )
	;;

*)
	echo "Unkwnon command: $cmd"
	;;

esac