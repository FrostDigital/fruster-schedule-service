const validator = require("fruster-validator")();
const RequestHandler = require("./RequestHandler");
const constants = require("../constants");
const bus = require("fruster-bus");

class CreateJobHandler extends RequestHandler {

	constructor(jobRepo, cronRunner) {
		super(validator.validateCreateJob);
		this.repo = jobRepo;
		this.cronRunner = cronRunner;
	}

	async handle(req) {
		super.handle(req);

		const job = await this.repo.create(req.data);

		this._publishJobCreated(req.reqId, job);

		if (this.cronRunner) {
			this.cronRunner.synchronize();
		}

		return {
			status: 200,
			data: job
		};
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
