const validator = require("fruster-validator")();
const RequestHandler = require("./RequestHandler");
const errors = require("./errors");

class RemoveJobHandler extends RequestHandler {

	constructor(jobRepo, cronRunner) {
		super(validator.validateRemoveJob);
		this.repo = jobRepo;
		this.cronRunner = cronRunner;
	}

	handle(req) {
		super.handle(req);

		return this.repo.remove(req.data.id).then(job => {

			if (this.cronRunner) {
				this.cronRunner.synchronize();
			}

			if (!job) {
				throw errors.notFound(`Job "${req.data.id}" to remove does not exist`);
			}

			return {
				status: 200,
				reqId: req.reqId,
				data: job
			};
		});
	}

}

module.exports = RemoveJobHandler;
