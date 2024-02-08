import createRequestResponseProtocol from "../dist/package.mjs"

export function WorkerMain(...args) {
	console.log("WorkerMain", args)

	const protocol = createRequestResponseProtocol(this, "WorkerMain")

	protocol.requestHandler = async (data) => {
		await (new Promise(r => setTimeout(r, 2000)))

		return "from worker:" + JSON.stringify(data)
	}

	console.log("protocol worker", protocol)
}
