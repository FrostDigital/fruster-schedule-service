module.exports = {
	type: "object",
	id: "CreateJobRequest",
	description: "Request for creating a scheduled job",
	additionalProperties: false,
	properties: {
		id: {
			type: "string",
			description: "Unique id of job",
			default: "fruster-user-service.sync-birthdays"
		},
		name: {
			type: "string",
			description: "Daily usage report",
			default: "fruster user service birthday sync"
		},
		subject: {
			type: "string",
			description: "Subject to invoke",
			default: "fruster-user-service.sync-birthdays-for-users"
		},
		cron: {
			type: "string",
			description: "Cron expression for when to run job",
			default: "0 0 * * *"
		},
		at: {
			type: "string",
			format: "date-time",
			description: "Timestamp when to run job if job should be triggered once by date",
			default: "2019-02-21T14:25:40.167Z"
		},
		description: {
			type: "string",
			description: "Optional description of job",
			default: "job for syncing birthdays of users"
		},
		maxFailures: {
			type: "integer",
			description: "Max failed attempts until a repeating job is failed",
			default: 53
		},
		data: {
			type: "object",
			description: "Optional data object that will be included in request to subject",
			default: { birthdaySurprise: "Happy birthday!" }
		},
		tags: {
			type: "array",
			description: "Optional tags",
			items: {
				type: "string",
				description: "Optional tag"
			},
			default: ["birthday", "happy", "sync"]
		}
	},
	required: ["subject", "id"]
}