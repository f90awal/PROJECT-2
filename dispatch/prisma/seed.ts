import { getPrismaClient } from "..";
import {
	DispatchStatus,
	StationType,
	VehicleStatus,
	VehicleType,
} from "../src/generated/prisma/enums";

const prisma = getPrismaClient();

const now = Date.now();
const minutesAgo = (mins: number) => new Date(now - mins * 60 * 1000);

async function seedHospitals() {
	await prisma.hospital.createMany({
		data: [
			{
				name: "Korle Bu Teaching Hospital",
				location: {
					address: "Korle Bu, Accra",
					lat: 5.5363,
					lng: -0.2265,
				},
				totalBeds: 1200,
				availableBeds: 310,
				totalAmbulances: 18,
				availableAmbulances: 6,
			},
			{
				name: "37 Military Hospital",
				location: {
					address: "Liberation Road, Accra",
					lat: 5.586,
					lng: -0.1713,
				},
				totalBeds: 400,
				availableBeds: 96,
				totalAmbulances: 8,
				availableAmbulances: 3,
			},
		],
	});
}

async function seedStations() {
	return prisma.station.createManyAndReturn({
		data: [
			{
				name: "Accra Central EMS Station",
				type: StationType.ambulance,
				location: {
					address: "Ring Road Central, Accra",
					lat: 5.5602,
					lng: -0.2056,
				},
			},
			{
				name: "Airport Fire Station",
				type: StationType.fire,
				location: {
					address: "Kotoka International Airport, Accra",
					lat: 5.6049,
					lng: -0.1668,
				},
			},
			{
				name: "Cantonments Police Station",
				type: StationType.police,
				location: {
					address: "Cantonments, Accra",
					lat: 5.5738,
					lng: -0.1659,
				},
			},
		],
	});
}

type Station = {
	name: string;
	type: StationType;
	location: {
		address: string;
		lat: number;
		lng: number;
	};
};

async function main() {
	// Dev-only reset for deterministic local seeding.
	await prisma.$transaction([
		prisma.outbox.deleteMany(),
		prisma.driverLocation.deleteMany(),
		prisma.vehicleLocation.deleteMany(),
		prisma.dispatch.deleteMany(),
		prisma.driver.deleteMany(),
		prisma.vehicle.deleteMany(),
		prisma.station.deleteMany(),
		prisma.hospital.deleteMany(),
	]);

	await seedHospitals();

	const stations = await seedStations();
	const ambulanceStation = stations.find(
		(s: Station) => s.type === StationType.ambulance,
	);
	const fireStation = stations.find(
		(s: Station) => s.type === StationType.fire,
	);
	const policeStation = stations.find(
		(s: Station) => s.type === StationType.police,
	);

	if (!ambulanceStation || !fireStation || !policeStation) {
		throw new Error("Expected all station types to be created");
	}

	const vehicles = await prisma.vehicle.createManyAndReturn({
		data: [
			{
				callSign: "AMB-101",
				type: VehicleType.ambulance,
				status: VehicleStatus.dispatched,
				stationId: ambulanceStation.id,
			},
			{
				callSign: "AMB-202",
				type: VehicleType.ambulance,
				status: VehicleStatus.available,
				stationId: ambulanceStation.id,
			},
			{
				callSign: "FIRE-11",
				type: VehicleType.fire_truck,
				status: VehicleStatus.available,
				stationId: fireStation.id,
			},
			{
				callSign: "POL-7",
				type: VehicleType.police_car,
				status: VehicleStatus.available,
				stationId: policeStation.id,
			},
		],
	});

	const [amb101, amb202, fire11, pol7] = vehicles;

	const drivers = await prisma.driver.createManyAndReturn({
		data: [
			{
				name: "Kwame Mensah",
				phone: "+233201111111",
				vehicleId: amb101.id,
			},
			{
				name: "Efua Asante",
				phone: "+233202222222",
				vehicleId: amb202.id,
			},
			{
				name: "Kojo Badu",
				phone: "+233203333333",
				vehicleId: fire11.id,
			},
		],
	});

	await prisma.vehicleLocation.createMany({
		data: [
			{
				vehicleId: amb101.id,
				lat: 5.5535,
				lng: -0.1968,
				speed: 42,
				heading: 84,
				recordedAt: minutesAgo(6),
			},
			{
				vehicleId: amb101.id,
				lat: 5.5582,
				lng: -0.1895,
				speed: 37,
				heading: 71,
				recordedAt: minutesAgo(2),
			},
			{
				vehicleId: amb202.id,
				lat: 5.5658,
				lng: -0.2074,
				speed: 0,
				heading: 0,
				recordedAt: minutesAgo(1),
			},
			{
				vehicleId: fire11.id,
				lat: 5.6043,
				lng: -0.1762,
				speed: 0,
				heading: 90,
				recordedAt: minutesAgo(3),
			},
			{
				vehicleId: pol7.id,
				lat: 5.5794,
				lng: -0.1712,
				speed: 22,
				heading: 180,
				recordedAt: minutesAgo(2),
			},
		],
	});

	await prisma.driverLocation.createMany({
		data: [
			{
				driverId: drivers[0].id,
				lat: 5.5582,
				lng: -0.1895,
				recordedAt: minutesAgo(2),
			},
			{
				driverId: drivers[1].id,
				lat: 5.5658,
				lng: -0.2074,
				recordedAt: minutesAgo(1),
			},
			{
				driverId: drivers[2].id,
				lat: 5.6043,
				lng: -0.1762,
				recordedAt: minutesAgo(3),
			},
		],
	});

	await prisma.dispatch.create({
		data: {
			incidentId: "seed-incident-accra-001",
			vehicleId: amb101.id,
			status: DispatchStatus.active,
			dispatchedAt: minutesAgo(5),
		},
	});

	console.log("Dispatch seed complete");
	console.log(
		JSON.stringify(
			{
				stations: stations.length,
				vehicles: vehicles.length,
				drivers: drivers.length,
				hospitals: 2,
				dispatches: 1,
			},
			null,
			2,
		),
	);
}

main()
	.catch((error) => {
		console.error("Seed failed:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
