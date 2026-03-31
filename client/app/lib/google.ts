

async function reverseGeocode(lng: number, lat: number): Promise<string> {
	if (!window.google || !window.google.maps) {
		throw new Error("Google Maps API not loaded");
	}

	try {
		const geocoder = new google.maps.Geocoder();

		return new Promise<string>((resolve, reject) => {
			geocoder.geocode({ location: { lat, lng } }, (results, status) => {
				if (status !== google.maps.GeocoderStatus.OK) {
					reject(new Error(`Geocoding failed with status: ${status}`));
					return;
				}

				if (!results?.length) {
					reject(new Error("No geocoding results found"));
					return;
				}

				resolve(results[0].formatted_address);
			});
		});
	} catch (error) {
		throw error instanceof Error ? error : new Error("Geocoding failed");
	}
}

export {  reverseGeocode };
