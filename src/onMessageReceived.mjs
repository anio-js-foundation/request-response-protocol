import pruneRequestsCache from "./pruneRequestsCache.mjs"

async function handleMessage(instance, message) {
	instance.trace(`i will be handling the following message '${JSON.stringify(message)}'`)

	//
	// call request handler
	//
	if (message.cmd === "request") {
		let response = null, from_cache = false

		if (instance.handled_requests.has(message.request_id)) {
			response = instance.handled_requests.get(message.request_id)

			from_cache = true
		} else {
			if (!instance.received_requests.has(message.request_id)) {

				if (!instance.debug_options.disable_saving_received_requests) {
					instance.received_requests.set(message.request_id, 1)
				}

				response = await instance.public_interface.requestHandler(message.data, null, {
					debug: {
						instance,
						message
					}
				})
			} else {
				instance.debug(`i already received this request: '${message.request_id}'`)

				return
			}
		}

		let from_cache_str = from_cache ? " (from cache)" : ""

		instance.trace(`i have already handled the message '${JSON.stringify(message)}'. my response is '${JSON.stringify(response)}'${from_cache_str}`)

		instance.sendJSONData({
			cmd: "response",
			original_request_id: message.request_id,
			response,
			from_cache
		})

		if (!from_cache) {
			instance.handled_requests.set(message.request_id, response)
		}

		pruneRequestsCache(instance)
	}
	//
	// handle incoming response
	//
	else if (message.cmd === "response") {
		const {original_request_id} = message

		if (!instance.open_requests.has(message.original_request_id)) {
			instance.debug(`no pending request with id '${original_request_id}'`)

			return
		}

		const open_request = instance.open_requests.get(original_request_id)

		if (open_request.timer !== null) {
			clearTimeout(open_request.timer)
		}

		const {resolve} = open_request.request_promise

		setTimeout(resolve, 0, message.response)

		instance.open_requests.delete(original_request_id)
	}
}

export default async function onMessageReceived(instance, message) {
	//
	// make sure every request is handled sequentially
	// this is needed for the response cache
	//
	let release = () => {}

	if (!instance.debug_options.disable_mutex) {
		release = await instance.mutex.acquire()
	}

	try {
		await handleMessage(instance, message)
	} finally {
		await release()
	}
}
