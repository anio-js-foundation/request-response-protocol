import createRandomIdentifier from "@anio-js-core-foundation/create-random-identifier"
import createPromise from "@anio-js-core-foundation/create-promise"

export default function(instance, data, max_attempts = -1) {
	instance.assertReadyAndNotClosed()

	// create a request id that identifies this particular request
	const request_id = createRandomIdentifier(12)
	// create the promise returned by sendRequest()
	const request_promise = createPromise()
	// save retransmission delay for this request
	const retransmission_delay = instance.retransmission_delay

	let attempt_no = 0

	const retransmit = () => {
		if (!instance.open_requests.has(request_id)) {
			// no need for retransmit, request does not exist anymore
			// this happens when the request is either fullfilled or
			// close() was called.

			instance.debug(`no need for retransmitting request '${request_id}'`)

			return
		}

		const open_request = instance.open_requests.get(request_id)

		++attempt_no

		if (attempt_no > max_attempts && max_attempts >= 0) {
			const error_msg = `Max retransmission attempts of ${max_attempts} reached.`

			instance.debug(error_msg)

			setTimeout(request_promise.reject, 0, new Error(error_msg))

			instance.open_requests.delete(request_id)

			return
		}

		instance.debug(`retransmitting request '${request_id}'`)

		instance.sendJSONData({
			cmd: "request",
			request_id,
			data,
			max_attempts,
			attempt_no
		})

		open_request.timer = setTimeout(retransmit, retransmission_delay)
	}

	instance.open_requests.set(request_id, {
		request_promise,
		timer: setTimeout(retransmit, retransmission_delay)
	})

	instance.sendJSONData({
		cmd: "request",
		request_id,
		data,
		max_attempts,
		attempt_no
	})

	return request_promise.promise
}
