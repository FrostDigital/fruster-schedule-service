module.exports = {

	// NATS servers, set multiple if using cluster
	// Example: `nats://10.23.45.1:4222,nats://10.23.41.8:4222`
	bus: process.env.BUS || "nats://localhost:4222",

	// Mongo database URL
	mongoUrl: process.env.MONGO_URL || "mongodb://localhost:27017/schedule-service",

	masterCheckInterval: process.env.MASTER_CHECK_INTERVAL || "500ms",

	// Default timezone used if none is provided
	defaultTimeZone: process.env.DEFAULT_TIMEZONE || "Europe/Stockholm",

	// Interval when jobs are synced from db
	syncInterval: process.env.SYNC_INTERVAL || "10s"
	
};