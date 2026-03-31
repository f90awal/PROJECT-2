function toRadians(value: number) {
	return (value * Math.PI) / 180;
}

export function toMap(fields: string[]) {
	const out: Record<string, string> = {};
	for (let i = 0; i < fields.length; i += 2) {
		out[fields[i]] = fields[i + 1] ?? "";
	}
	return out;
}

export function haversineDistanceKm(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number,
) {
	const dLat = toRadians(lat2 - lat1);
	const dLng = toRadians(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRadians(lat1)) *
			Math.cos(toRadians(lat2)) *
			Math.sin(dLng / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return 6371 * c;
}
