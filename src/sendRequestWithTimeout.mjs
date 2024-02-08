import createRandomIdentifier from "@anio-js-core-foundation/create-random-identifier"
import createPromise from "@anio-js-core-foundation/create-promise"

export default function sendRequestWithTimeout(instance, data, timeout = 0) {
	if (!instance.ready) {
		throw new Error(`Cannot send request when protocol is not ready.`)
	} else if (instance.closed) {
		throw new Error(`Cannot send request when protocol is closed.`)
	}

	// create a request id that identifies this particular request
	const request_id = createRandomIdentifier(12)
	// create the promise returned by sendRequest()
	const request_promise = createPromise()
	// keep track of timer to clear the timeout when response arrives
	let timeout_timer = null

	if (timeout > 0) {
		timeout_timer = setTimeout(() => {
			const {reject} = request_promise

			setTimeout(reject, 0, new Error(`Timeout of '${timeout}ms' reached.`))

			instance.open_requests.delete(request_id)
		}, timeout)
	}

	instance.open_requests.set(request_id, {
		request_promise,
		timeout_timer
	})

	instance.sendJSONData({
		cmd: "request",
		request_id,
		data
	})

	return request_promise.promise
}
