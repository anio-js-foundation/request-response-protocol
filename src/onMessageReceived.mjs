export default async function onMessageReceived(instance, message) {
	//
	// call request handler
	//
	if (message.cmd === "request") {
		const response = await instance.public_interface.requestHandler(message.data)

		instance.sendJSONData({
			cmd: "response",
			original_request_id: message.request_id,
			response
		})
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

		const request_object = instance.open_requests.get(original_request_id)

		if (request_object.timeout_timer !== null) {
			clearTimeout(request_object.timeout_timer)
		}

		const {resolve} = request_object.request_promise

		setTimeout(resolve, 0, message.response)

		instance.open_requests.delete(original_request_id)
	}
	else {

	}
}
