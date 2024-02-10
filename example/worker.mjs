import createRequestResponseProtocol from "../dist/package.mjs"

export function NodeWorkerMain(...args) {
	console.log("NodeWorkerMain", args)

	const protocol = createRequestResponseProtocol(this, "WorkerMain")

	protocol.requestHandler = async (data) => {
		await (new Promise(r => setTimeout(r, 2000)))

		return "from worker:" + JSON.stringify(data)
	}

	console.log("protocol worker", protocol)
}
