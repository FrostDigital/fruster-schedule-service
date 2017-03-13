const log = require("fruster-log");
const scheduleService = require("./schedule-service");
const conf = require("./conf");

require("fruster-health").start();

scheduleService
	.start(conf.bus, conf.mongoUrl)
	.then(() => {
		log.info(`Schedule service started and connected to bus ${conf.bus}`);
	})
	.catch((err) => {
		log.error("Failed starting schedule service", err);
		process.exit(1);
	});