import pruneJavaScriptMapObject from "./pruneJavaScriptMapObject.mjs"

export default function(instance) {
	pruneJavaScriptMapObject(instance.handled_requests)
}
