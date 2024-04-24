

function buildMessage(from, topic, body) {

	KSR.info("Hello World from $fU\n");
	// KSR.info("Hello World from $fU\n");

	const m = {
		message:{
			topic,
			notification : {
				// body : "This is a Firebase Cloud Messaging Topic Message!",
				body,
				title: 'New message: ' + from.slice(1, -1)
			}
		}
	};

	KSR.pv.sets("$var(fcm_msg)", JSON.stringify(m));

	// return JSON.stringify(m);
}

function extract_tU(body) {
	const m = body.match(/\[(.+)\]:\s+(.+)/);
	if (!m) {
		//console.error('Message not matching room format:', msg);
		return;
	}

	const user = m[1], msg = m[2];

	KSR.pv.sets("$var(fU)", user);
	KSR.pv.sets("$var(rb)", msg);
	KSR.pv.sets("$var(ct)", /^\{.*\}$/.test(msg) ? 'application/json' : 'text/plain');
}