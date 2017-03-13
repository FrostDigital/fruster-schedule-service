const bus = require("fruster-bus");
const mongo = require("mongodb");
const constants = require("./constants");
const JobRepo = require("./lib/repos/JobRepo");
const CreateJobHandler = require("./lib/CreateJobHandler");
const RemoveJobHandler = require("./lib/RemoveJobHandler");
const CronRunner = require("./lib/cron/CronRunner");
const conf = require("./conf");

module.exports.start = function(busAddress, mongoUrl)  {

	return bus.connect(busAddress)
		.then(() => mongo.connect(mongoUrl))
		.then((db) =>  {
			let jobRepo = new JobRepo(db);
			
			let cronRunner = new CronRunner(jobRepo, {
				start: true,
				syncInterval: conf.syncInterval 
			});
			
			let createJob = new CreateJobHandler(jobRepo, cronRunner);
			let removeJob = new RemoveJobHandler(jobRepo, cronRunner);
						
			bus.subscribe(constants.exposing.createJob, req => createJob.handle(req));
			bus.subscribe(constants.exposing.removeJob, req => removeJob.handle(req));
		});
};
