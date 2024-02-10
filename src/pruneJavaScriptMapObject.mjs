export default function(map, max_size = 1000) {
	if (max_size > map.size) {
		return
	}

	const map_keys = Array.from(map.keys())
	const keys_to_be_removed = map_keys.slice(
		0, map.size - max_size
	)

	for (const key of keys_to_be_removed) {
		map.delete(key)
	}
}
