const validator = require("fruster-validator")();
const RequestHandler = require("./RequestHandler");
const constants = require("../constants");
const bus = require("fruster-bus");

class CreateJobHandler extends RequestHandler {

	constructor(jobRepo) {
		super(validator.validateCreateJob);		
		this.repo = jobRepo;
	}

	handle(req) {
		super.handle(req);

		return this.repo.upsert(req.data).then(job => {

			this._publishJobCreated(req.reqId, job);

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