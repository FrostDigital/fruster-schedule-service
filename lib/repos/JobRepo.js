const constants = require("../../constants");

class JobRepo {

	constructor(db) {
		this.collection = db.collection(constants.collections.jobs);
		this.collection.createIndex({id: 1}, true);
	}

	get(id) {
		return this.collection.findOne({id: id}, {_id: 0});
	}

	findAll() {
		return this.collection.find({}, { _id: 0}).toArray();
	}

	findAllScheduledAndRunning() {
		const query = {
			state: { 
				$in: ["scheduled", "running"]
			}
		};

		return this.collection.find(query, { _id: 0}).toArray();		
	}

	upsert(job) {
		const query = {
			id: job.id
		};

		const update = {
			$set: job,
			$setOnInsert: {created: new Date()}
		};

		const options = {
			upsert: true,
			returnOriginal: false,
			projection: {
				_id: 0
			}
		};

		return this.collection.findOneAndUpdate(query, update, options)
			.then(res => res.value);
	}

	update(job, invocation) {
		const query = {
			id: job.id
		};

		job.updated = new Date();
		
		// Failure count is incremented, not passed in as a value
		delete job.failureCount;

		let update = {
			$set: job		
		};

		if(invocation) {
			update.$push = { invocations: invocation };
		}

		if(job.state == "failure") {
			update.$inc = { failureCount: 1 };
			update.$set.lastFailure = new Date();
		}

		const options = {
			returnOriginal: false,
			projection: {
				_id: 0
			}
		};

		return this.collection.findOneAndUpdate(query, update, options)
			.then(res => res.value);
	}

}

module.exports = JobRepo;
