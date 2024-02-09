import createRequestResponseProtocol from "../dist/package.mjs"

import path from "node:path"
import {fileURLToPath} from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

import createWorker from "@anio-js-foundation/create-worker"

const worker = await createWorker(
	path.join(__dirname, "worker.mjs"), [], "WorkerMain", {
		silent: false
	}
)

const protocol = createRequestResponseProtocol(worker, "main.mjs")

protocol.requestHandler = (data) => {
	return "from main:" + JSON.stringify(data)
}

await protocol.ready()

console.log("protocol ready")

protocol.withTimeout(150).sendSingleShotRequest(1).catch((e) => {console.log("e",e.message)})

protocol.close()
