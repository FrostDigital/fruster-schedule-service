const bus = require("fruster-bus");
const log = require("fruster-log");
const mongo = require("mongodb");
const constants = require("./constants");
const JobRepo = require("./lib/repos/JobRepo");
const CreateJobHandler = require("./lib/CreateJobHandler");
const RemoveJobHandler = require("./lib/RemoveJobHandler");
const CronRunner = require("./lib/cron/CronRunner");
const conf = require("./conf");
const docs = require("./lib/docs");

module.exports.start = (busAddress, mongoUrl) => {

	return bus.connect(busAddress)
		.then(() => mongo.connect(mongoUrl))
		.then((db) => createIndexes(db))
		.then((db) => {
			const jobRepo = new JobRepo(db);

			const cronRunner = new CronRunner(jobRepo, {
				start: true,
				syncInterval: conf.syncInterval,
				maxFailures: conf.maxFailures
			});

			const CreateJobRequest = require("./lib/schemas/CreateJobRequest");
			const RemoveJobRequest = require("./lib/schemas/RemoveJobRequest");

			const createJob = new CreateJobHandler(jobRepo, cronRunner);
			const removeJob = new RemoveJobHandler(jobRepo, cronRunner);

			bus.subscribe({
				subject: constants.exposing.createJob,
				requestSchema: CreateJobRequest,
				docs: docs.service.CREATE_JOB,
				handle: req => createJob.handle(req)
			});

			bus.subscribe({
				subject: constants.exposing.removeJob,
				requestSchema: RemoveJobRequest,
				docs: docs.service.REMOVE_JOB,
				handle: req => removeJob.handle(req)
			});
		});
};

async function createIndexes(db) {
	try {
		await db.collection(constants.collections.jobs).createIndex({ id: 1 }, true);
		await db.collection(constants.collections.invocations).createIndex({ id: 1 }, true);
		await db.collection(constants.collections.invocations).createIndex({ created: 1 }, {
			expireAfterSeconds: conf.invocationsTTL / 1000
		});
	} catch (err) {
		log.warn("Failed creating db indexes", err);
	}

	return db;
}
