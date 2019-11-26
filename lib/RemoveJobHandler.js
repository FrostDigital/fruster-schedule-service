const errors = require("./errors");

class RemoveJobHandler {

	constructor(jobRepo, cronRunner) {
		this.repo = jobRepo;
		this.cronRunner = cronRunner;
	}

	handle(req) {
		return this.repo.remove(req.data.id).then(job => {

			if (this.cronRunner) {
				this.cronRunner.synchronize();
			}

			if (!job) {
				errors.throw("NOT_FOUND", `Job "${req.data.id}" to remove does not exist`);
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
