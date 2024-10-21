const constants = require("../../constants");
const uuid = require("uuid");

class InvocationRepo {

	constructor(db) {
		this.collection = db.collection(constants.collections.invocations);
	}

	async get(id) {
		return this.collection.findOne({ id: id }, { projection: { _id: 0 } });
	}

	async findAll() {
		return this.collection.find({}, { projection: { _id: 0 } }).toArray();
	}

	async create(jobId, invocation) {
		invocation.id = uuid.v4();
		invocation.jobId = jobId;

		await this.collection.insertOne(invocation);

		return invocation;
	}

}

module.exports = InvocationRepo;
