export default function(instance) {
	const max_size = 1000

	if (max_size > instance.handled_requests.size) {
		return
	}

	const map_keys = Array.from(instance.handled_requests.keys())
	const keys_to_be_removed = map_keys.slice(
		0, instance.handled_requests.size - max_size
	)

	for (const key of keys_to_be_removed) {
		instance.handled_requests.delete(key)
	}
}
