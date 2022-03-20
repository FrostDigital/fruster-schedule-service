const constants = require("../constants");
const bus = require("fruster-bus");

class CreateJobHandler {

	constructor(jobRepo, cronRunner) {
		this.repo = jobRepo;
		this.cronRunner = cronRunner;
	}

	handle(req) {
		return this.repo.create(req.data).then(job => {

			this._publishJobCreated(req.reqId, job);

			if (this.cronRunner) {
				this.cronRunner.synchronize();
			}

			return {
				status: 200,
				reqId: req.reqId,
				data: job
			};
		});
	}

	/**
	 * Publish notification to any other instances of scheduler
	 * so they are able to updates sync their in-memory jobs
	 * with the ones in database.
	 */
	_publishJobCreated(reqId, job) {
		bus.publish(constants.publishing.jobCreated, {
			reqId: reqId,
			data: job
		});
	}

}

module.exports = CreateJobHandler;
