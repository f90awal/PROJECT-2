export function serializePayload(payload: unknown) {
	return typeof payload === "string" ? payload : JSON.stringify(payload);
}
