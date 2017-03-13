const constants = {

	collections: {
		invocations: "invocations",
		jobs: "jobs"
	},

	exposing: {
		foo: "schedule-service.get-foos",
		createJob: "schedule-service.create-job",
		removeJob: "schedule-service.remove-job"
	},

	publishing: {
		jobCreated: "schedule-service.job-created"
	},

	consuming: {},

	jobStates: {
		initial: "initial",
		scheduled: "scheduled",
		running: "running",
		completed: "completed",
		failed: "failed",
		removed: "removed"
	}
};

module.exports = constants;

