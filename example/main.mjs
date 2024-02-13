import createRequestResponseProtocol from "../dist/package.mjs"

import path from "node:path"
import {fileURLToPath} from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

import nodeCreateWorker from "@anio-js-foundation/node-create-worker"

const worker = await nodeCreateWorker(
	path.join(__dirname, "worker.mjs"), [], {
		silent: false
	}
)

const protocol = createRequestResponseProtocol(worker, "main.mjs")

protocol.requestHandler = (data) => {
	return "from main:" + JSON.stringify(data)
}

await protocol.ready()

console.log("protocol ready")

protocol.sendRequest(1).catch((e) => {console.log("e",e.message)})

protocol.close()
