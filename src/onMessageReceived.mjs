import pruneRequestsCache from "./pruneRequestsCache.mjs"

async function handleIncomingRequest(instance, message) {
	let response = null, from_cache = false

	if (instance.handled_requests.has(message.request_id)) {
		response = instance.handled_requests.get(message.request_id)

		from_cache = true
	} else if (instance.pending_responses.has(message.request_id)) {
		instance.trace(
			`received a request (${message.request_id}) that is still being processed.`
		)

		return
	} else {
		instance.pending_responses.set(message.request_id, 1)

		response = await instance.public_interface.requestHandler(message.data, null, {
			debug: {
				instance,
				message
			}
		})

		instance.handled_requests.set(message.request_id, response)
		instance.pending_responses.delete(message.request_id)
	}

	let from_cache_str = from_cache ? " (from cache)" : ""

	instance.trace(`for the message '${JSON.stringify(message)}' my response is '${JSON.stringify(response)}'${from_cache_str}`)

	instance.sendJSONData({
		cmd: "response",
		original_request_id: message.request_id,
		response,
		from_cache
	})

	pruneRequestsCache(instance)
}

async function handleIncomingResponse(instance, message) {
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

export default async function onMessageReceived(instance, message) {
	instance.trace(`i will be handling the following message '${JSON.stringify(message)}'`)

	if (message.cmd === "request") {
		await handleIncomingRequest(instance, message)
	} else if (message.cmd === "response") {
		await handleIncomingResponse(instance, message)
	} else {
		instance.debug(`bad message`, message)
	}
}
