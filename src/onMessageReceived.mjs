import pruneHandledRequestsCache from "./pruneHandledRequestsCache.mjs"

export default async function onMessageReceived(instance, message) {
	//
	// call request handler
	//
	if (message.cmd === "request") {
		//
		// make sure every request is handled sequentially
		// this is needed for the response cache
		//
		const release = await instance.mutex.acquire()

		let response = null, from_cache = false

		if (instance.handled_requests.has(message.request_id)) {
			response = instance.handled_requests.get(message.request_id)

			from_cache = true
		} else {
			response = await instance.public_interface.requestHandler(message.data)
		}

		instance.sendJSONData({
			cmd: "response",
			original_request_id: message.request_id,
			response,
			from_cache
		})

		if (!from_cache) {
			instance.handled_requests.set(message.request_id, response)
		}

		pruneHandledRequestsCache(instance)

		await release()
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
	else {

	}
}
