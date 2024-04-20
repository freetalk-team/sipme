#!/bin/sh

if [ "$#" -lt "2" ]; then
	echo "Usage:\n$0 SERVICE EXECUTABLE [ARGS]"
	exit 0
fi

onexit() {
	echo 'Script terminated'
}

#trap onexit INT TERM;

path=/var/run
#path=.

service=$1
shift

echo "Starting service: $service"
#exit 0

#echo "Own pid: $$"
echo -n $$ > $path/$service-monitor.pid

while true; do
	$@ > /dev/null 2>&1 &
	pid=$!
	echo -n $pid > $path/$service.pid
	wait $pid

	ret=$?
	echo "$service exited with: $ret"

	if [ "$ret" -eq "0" ]; then
		rm -rf $path/$service.pid
		break
	fi

	echo "Restarting service: $service"
	
	sleep 5
done

rm -rf $path/$service-monitor.pid