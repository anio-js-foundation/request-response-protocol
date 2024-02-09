import createRandomIdentifier from "@anio-js-core-foundation/create-random-identifier"
import createPromise from "@anio-js-core-foundation/create-promise"
import createAsyncMutex from "@anio-js-core-foundation/create-async-mutex"
import sendSingleShotRequestWithTimeout from "./sendSingleShotRequestWithTimeout.mjs"
import onMessageReceived from "./onMessageReceived.mjs"

export default function createRequestResponseProtocol(api, label = "") {
	const synchronize_token = createRandomIdentifier(32)
	let synchronized_promise = createPromise()
	let current_state = "init"

	let instance = {
		open_requests: new Map(),
		mutex: createAsyncMutex(),
		/*
		 * Keep a map of handled requests so if the same
		 * request is received a second time, the result is re-used
		 * and the request handler isn't called a second time.
		 */
		handled_requests: new Map(),
		ready: false,
		closed: false,

		debug(...args) {
			console.log(label, ...args)
		},

		sendJSONData(data) {
			api.sendMessage(`start{` + JSON.stringify(data) + `}end`)
		},

		messageHandler(message) {
			if (message.startsWith(`@anio-js-foundation/requestResponseProtocol:`)) {
				message = message.slice(`@anio-js-foundation/requestResponseProtocol:`.length)

				if (message.startsWith("sync:")) {
					const sync_token = message.slice("sync:".length)

					api.sendMessage(`@anio-js-foundation/requestResponseProtocol:ack:${sync_token}`)
				} else if (message.startsWith("ack:")) {
					const sync_token = message.slice("ack:".length)

					if (sync_token === synchronize_token && !instance.ready) {
						instance.ready = true

						synchronized_promise.resolve()
					}
				} else {
					instance.debug("bad message", message)
				}
			} else if (instance.ready && message.startsWith("start{") && message.endsWith("}end")) {
				message = message.slice("start{".length)
				message = message.slice(0, message.length - "}end".length)

				onMessageReceived(instance, JSON.parse(message))
			} else {
				instance.debug("bad message", message)
			}
		},

		assertReadyAndNotClosed() {
			if (!instance.ready) {
				throw new Error(`Cannot send request when protocol is not ready.`)
			} else if (instance.closed) {
				throw new Error(`Cannot send request when protocol is closed.`)
			}
		},

		public_interface: {
			ready() {
				return synchronized_promise.promise
			},

			requestHandler() {},

			withTimeout(timeout_value) {
				return {
					sendSingleShotRequest(request_data) {
						instance.assertReadyAndNotClosed()

						return sendSingleShotRequestWithTimeout(instance, request_data, timeout_value)
					}
				}
			},

			sendSingleShotRequest(request_data) {
				instance.assertReadyAndNotClosed()

				return sendSingleShotRequestWithTimeout(instance, request_data, 0)
			},

			closeAllPendingRequests(reason = `closeAllPendingRequests() was called.`) {
				for (const [request_id, open_request] of instance.open_requests) {
					const {reject} = open_request.request_promise

					setTimeout(reject, 0, new Error(reason))

					// make sure to cancel timer
					if (open_request.timer !== null) {
						clearTimeout(open_request.timer)
					}

					instance.open_requests.delete(request_id)
				}
			},

			close() {
				if (instance.closed) return

				instance.closed = true

				setTimeout(
					instance.public_interface.closeAllPendingRequests, 0, "close() was called."
				)

				api.removeEventListener("message", instance.messageHandler)
			}
		}
	}

	api.on("message", instance.messageHandler)

	/**
	 * Slave can miss this message so repeat it
	 * every once in a while to get the master and slave
	 * synced up.
	 */
	const delay_map = [50, 50, 50, 100, 100, 150, 150, 150, 250, 500, 750, 1000]
	let delay_index = 0

	const synchronize = () => {
		if (instance.closed) return
		if (instance.ready) return

		instance.debug("attempt to synchronize")

		api.sendMessage(`@anio-js-foundation/requestResponseProtocol:sync:${synchronize_token}`)


		// by default use the last value from the delay map
		let amount = delay_map[delay_map.length - 1]

		if (delay_map.length > delay_index) {
			amount = delay_map[delay_index]

			++delay_index
		}

		instance.debug(`will be calling synchronize() in ${amount}ms`)

		setTimeout(synchronize, amount)
	}

	setTimeout(synchronize, 0)

	return instance.public_interface
}
