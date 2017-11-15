const bus = require("fruster-bus");
const mongo = require("mongodb");
const constants = require("./constants");
const JobRepo = require("./lib/repos/JobRepo");
const CreateJobHandler = require("./lib/CreateJobHandler");
const RemoveJobHandler = require("./lib/RemoveJobHandler");
const CronRunner = require("./lib/cron/CronRunner");
const conf = require("./conf");

module.exports.start = (busAddress, mongoUrl) => {

	return bus.connect(busAddress)
		.then(() => mongo.connect(mongoUrl))
		.then((db) => createIndexes(db))
		.then((db) =>  {
			let jobRepo = new JobRepo(db);
			
			let cronRunner = new CronRunner(jobRepo, {
				start: true,
				syncInterval: conf.syncInterval,
				maxFailures: conf.maxFailures
			});
			
			let createJob = new CreateJobHandler(jobRepo, cronRunner);
			let removeJob = new RemoveJobHandler(jobRepo, cronRunner);
						
			bus.subscribe(constants.exposing.createJob, req => createJob.handle(req));
			bus.subscribe(constants.exposing.removeJob, req => removeJob.handle(req));
		});
};


async function createIndexes(db) {
	try {
		await db.collection(constants.collections.jobs).createIndex({id: 1}, true);
		await db.collection(constants.collections.invocations).createIndex({id: 1}, true);        
		await db.collection(constants.collections.invocations).createIndex({created: 1}, {
			expireAfterSeconds: conf.invocationsTTL / 1000
		});
	} catch(err) {
		log.warn("Failed creating db indexes", err);
	}
	return db;
}