const constants = {

	collections: {
		invocations: "invocations",
		jobs: "jobs"
	},

	exposing: {
		foo: "schedule-service.get-foos",
		createJob: "schedule-service.create-job"
	},

	publishing: {
		jobCreated: "schedule-service.job-created"
	},

	consuming: {}
};

module.exports = constants;

