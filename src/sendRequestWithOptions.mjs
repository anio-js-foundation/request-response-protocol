import createRandomIdentifier from "@anio-js-foundation/create-random-identifier"
import createPromise from "@anio-js-foundation/create-promise"
import retransmitTimerValuesGenerator from "@anio-js-foundation/retransmit-timer-values-generator"

export default async function(instance, options, request_data) {
	instance.assertReadyAndNotClosed()

	const {timeout, max_retransmissions} = options
	const request_id = createRandomIdentifier(12)
	const request_promise = createPromise()

	instance.trace(
		`i will be sending message '${JSON.stringify(request_data)}' with request_id = '${request_id}', ` +
		`timeout = '${timeout}ms' and max_retransmissions = '${max_retransmissions}'`
	)

	// keep track of timer to clear the timeout when response arrives
	let timeout_timer = null

	const transmitRequestInformation = async (attempt_no) => {
		const max_attempts = (max_retransmissions === Infinity ? -1 : max_retransmissions)

		await instance.sendJSONData({
			cmd: "request",
			request_id,
			data: request_data,
			attempt_no,
			max_attempts
		})
	}

	if (timeout > 0) {
		const generator = retransmitTimerValuesGenerator(max_retransmissions)

		const cancelRequest = (reason) => {
			const {reject} = request_promise

			setTimeout(reject, 0, new Error(reason))

			instance.open_requests.delete(request_id)
		}

		const timer_handler = (is_first_call = false) => {
			// it's an error if the request does not exist anymore
			if (!instance.open_requests.has(request_id)) {
				throw new Error(`Detected request (${request_id}) that was not properly disposed. This is a bug.`)
			}

			const request_object = instance.open_requests.get(request_id)

			// 'is_first_call' indicates that the timer handler was
			// called the first time which means the request
			// time'd out

			const attempts_left = generator.getNumberOfAttemptsLeft()

			if (is_first_call) {
				// now we need to decide whether to reject the
				// request or retransmit it
				instance.debug(`request (${request_id}) has reached timeout of ${timeout}ms.`)

				if (!attempts_left) {
					return cancelRequest(`Timeout of '${timeout}ms' reached.`)
				}

				return timer_handler(false)
			}

			if (!instance.open_requests.has(request_id)) {
				instance.debug(`request (${request_id}) has been settled. No need for further retransmission.`)

				return
			}

			if (attempts_left > 0) {
				const delay = generator.getNextTimeoutValue()
				const attempts_left_str = (attempts_left === Infinity) ? "*unlimited*" : attempts_left

				instance.trace(
					`we have ${attempts_left_str} more attempts left to settle the request '${request_id}' ; ` +
					`will retransmit request in ${delay}ms.`
				)

				request_object.timer = setTimeout(async () => {
					await transmitRequestInformation(generator.getNumberOfAttemptsTaken())
					await timer_handler()
				}, delay, false)

				return
			}

			return cancelRequest(
				`Reached maximum amount of retransmission attempts ${max_retransmissions}.`
			)
		}

		timeout_timer = setTimeout(timer_handler, timeout, true)
	}

	instance.open_requests.set(request_id, {
		request_promise,
		timer: timeout_timer
	})

	await transmitRequestInformation(0)

	return request_promise.promise
}
