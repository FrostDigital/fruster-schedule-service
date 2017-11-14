const constants = require("../../constants");
const InvocationRepo = require("./InvocationRepo");

const jobStates = constants.jobStates;

class JobRepo {
	
	constructor(db) {
		this.collection = db.collection(constants.collections.jobs);
		this.invocationRepo = new InvocationRepo(db);
	}

	get(id) {
		return this.collection.findOne({id: id}, {_id: 0});
	}

	findAll() {
		return this.collection.find({}, { _id: 0}).toArray();
	}

	findAllSchedulable() {
		const query = {
			removed: {$ne: true},
			state: { 
				$in: [
					jobStates.initial, 
					jobStates.scheduled, 
					jobStates.running,
					jobStates.scheduledAfterFailure
				]
			}
		};

		return this.collection.find(query, { _id: 0}).toArray();		
	}

	create(job) {
		const query = {
			id: job.id
		};
	
		job.state = jobStates.initial;
		delete job.invocations;

		const update = {
			$set: job,
			$setOnInsert: {created: new Date()}
		};

		const options = {
			upsert: true,
			returnOriginal: false,
			projection: {
				_id: 0,
				invocations: 0
			}
		};

		return this.collection.findOneAndUpdate(query, update, options)
			.then(res => res.value);
	}


	async update(job, invocation) {
		const query = {
			id: job.id
		};
		
		job.updated = new Date();
		
		// Remove fields from update that are incremented
		delete job.failureCount;
		delete job.totalFailureCount;		
		
		let update = {
			$set: job		
		};

		if(job.state == jobStates.scheduled || job.state == jobStates.running) {
			// reset failure count after success
			update.$set.failureCount = 0;
		} else if(!!invocation && (job.state == jobStates.failed || job.state == jobStates.scheduledAfterFailure)) {
			// increment failure counts on failure
			update.$inc = { 
				failureCount: 1,
				totalFailureCount: 1
			};			
			update.$set.lastFailure = new Date();
		}

		const options = {
			returnOriginal: false,
			projection: {
				_id: 0
			}
		};

		const updateResult = await this.collection.findOneAndUpdate(query, update, options);
		
		if (invocation) {
			await this.invocationRepo.create(job.id, invocation);
		}

		return updateResult.value;			
	}

	remove(jobId) {
		const query = {
			id: jobId
		};

		let update = {
			$set: { removed: true }		
		};

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
