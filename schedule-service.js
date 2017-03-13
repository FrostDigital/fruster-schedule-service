const bus = require("fruster-bus");
const mongo = require("mongodb");
const constants = require("./constants");
const JobRepo = require("./lib/repos/JobRepo");
const CreateJobHandler = require("./lib/CreateJobHandler");
const CronRunner = require("./lib/cron/CronRunner");

module.exports.start = function(busAddress, mongoUrl)  {

	return bus.connect(busAddress)
		.then(() => mongo.connect(mongoUrl))
		.then((db) =>  {
			let jobRepo = new JobRepo(db);
			let createJob = new CreateJobHandler(jobRepo);
				
			bus.subscribe(constants.exposing.createJob, req => createJob.handle(req));

			return new CronRunner(jobRepo).synchronize();
		});
};
