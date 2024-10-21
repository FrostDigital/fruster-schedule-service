const testUtils = require("fruster-test-utils");
const JobRepo = require("../lib/repos/JobRepo");
const fixtures = require("./support/fixtures");
const specConstants = require("./support/spec-constants");
const { wait } = require("./support/spec-utils");
const constants = require("../constants");
const jobStates = require("../constants").jobStates;

describe("JobRepo", () => {
	let repo;

	testUtils.startBeforeEach(
		specConstants.testUtilsOptions(async ({ db }) => {
			try {
				await db
					.collection(constants.collections.invocations)
					.deleteMany({});
				await db.collection(constants.collections.jobs).deleteMany({});
			} catch (err) {
				console.error(err);
			}
			repo = new JobRepo(db);
		})
	);

	it("should insert job when it does not exist", (done) => {
		const job = fixtures.job();

		repo.create(job).then((createdJob) => {
			expect(createdJob.id).toBe(job.id);
			done();
		});
	});

	it("should upsert job when it already exists", async () => {
		let job = fixtures.job();
		let created;

		const createdJob = await repo.create(job);
		await wait(100); // wait so created date is not same (not sure if needed though)

		created = createdJob.created;
		job.subject = "updated";

		const updatedJob = await repo.create(job);

		expect(updatedJob.id).toBe(job.id);
		expect(updatedJob.subject).toBe("updated");
		expect(updatedJob.created).toEqual(created);

		const all = await repo.findAll();

		expect(all.length).toBe(1);
	});

	it("should find all jobs", (done) => {
		const job = fixtures.job();

		repo.create(job)
			.then(() => repo.findAll())
			.then((all) => {
				expect(all.length).toBe(1);
				expect(all[0]._id).toBeUndefined();
				expect(all[0].id).toBe(job.id);
				done();
			});
	});

	it("should find all schedulable jobs", (done) => {
		const job1 = fixtures.job({
			id: "id1",
			state: jobStates.running,
			invocations: [],
		});
		const job2 = fixtures.job({
			id: "id2",
			state: jobStates.scheduled,
			invocations: [],
		});
		const job3 = fixtures.job({
			id: "id3",
			state: jobStates.initial,
			invocations: [],
		});
		const job4 = fixtures.job({
			id: "id4",
			state: jobStates.scheduledAfterFailure,
			invocations: [],
		});

		repo.create(job1)
			.then(repo.create(job2))
			.then(repo.create(job3))
			.then(repo.create(job4))
			.then(sleep)
			.then(() => repo.findAllSchedulable())
			.then((all) => {
				expect(all.length).toBe(4);
				expect(all[0].invocations).toBeUndefined();
				done();
			});
	});

	it("should update with failure", (done) => {
		let job = fixtures.job();

		repo.create(job)
			.then((createdJob) => {
				createdJob.state = jobStates.failed;
				return repo.update(createdJob, {
					startTime: new Date(),
					endTime: new Date(),
				});
			})
			.then((updatedJob) => {
				expect(updatedJob.lastFailure).toBeDefined();
				expect(updatedJob.failureCount).toBe(1);
				expect(updatedJob.totalFailureCount).toBe(1);
				return repo.update(updatedJob, { aInvocation: "" });
			})
			.then((updatedJob) => {
				expect(updatedJob.failureCount).toBe(2);
				expect(updatedJob.totalFailureCount).toBe(2);
				done();
			});
	});

	it("should remove job", (done) => {
		let job = fixtures.job();

		repo.create(job)
			.then(() => repo.remove(job.id))
			.then((removedJob) => {
				expect(removedJob.removed).toBe(true);
				expect(removedJob.id).toBe(job.id);
				done();
			});
	});
});

async function sleep() {
	return new Promise((resolve) => setTimeout(resolve, 1000));
}
