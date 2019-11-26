const testUtils = require("fruster-test-utils");
const bus = require("fruster-bus");
const CronRunner = require("../lib/cron/CronRunner");
const JobRepo = require("../lib/repos/JobRepo");
const fixtures = require("./support/fixtures");
const conf = require("../conf");
const jobStates = require("../constants").jobStates;
const mockService = testUtils.mockService;

describe("CronRunner", () => {

	let cronRunner;
	let jobRepo;

	testUtils.startBeforeEach({
		mongoUrl: "mongodb://localhost:27017/cron-runner-test",
		bus: bus,
		mockNats: true,
		afterStart: (connection) => {
			jobRepo = new JobRepo(connection.db);
			cronRunner = new CronRunner(jobRepo);
			return Promise.resolve();
		}
	});

	afterEach(() => {
		cronRunner.stop();
	});

	describe("with jobs to synchronize", () => {

		beforeEach(done => {
			addMockJobs().then(done);
		});

		it("should synchronize jobs", (done) => {
			const job1 = fixtures.fireOnceJob();
			const job2 = fixtures.cronJob();

			cronRunner.synchronize().then(() => {
				expect(cronRunner.jobs.length).toBe(2);

				let scheduledJob1 = cronRunner.getJob(job1.id);
				let scheduledJob2 = cronRunner.getJob(job2.id);

				expect(scheduledJob1.state).toBe(jobStates.scheduled);
				expect(scheduledJob1.subject).toBe(job1.subject);
				expect(scheduledJob1.cron).toBeUndefined();
				expect(scheduledJob1.at).toEqual(new Date(job1.at));
				expect(scheduledJob1.timeZone).toEqual(conf.defaultTimeZone);

				expect(scheduledJob2.state).toBe(jobStates.scheduled);
				expect(scheduledJob2.subject).toBe(job2.subject);
				expect(scheduledJob2.cron).toEqual(job2.cron);
				expect(scheduledJob2.at).toBeUndefined();
				expect(scheduledJob2.timeZone).toEqual(conf.defaultTimeZone);

				done();
			});
		});

		it("should synchronize jobs and purge ones in memory that is deleted", (done) => {
			// Add fake job that does not exist in database
			cronRunner.jobs.push({
				id: "fakeJob",
				stop: function () { }
			});

			cronRunner.synchronize().then(() => {
				expect(cronRunner.jobs.length).toBe(2);
				expect(cronRunner.getJob("fakeJob")).toBeUndefined();
				done();
			});
		});

	});

	describe("with jobs to run", () => {

		let fireOnceJob;
		let repeatedJob;

		beforeEach(() => {
			const nowish = new Date(Date.now() + 1000);
			fireOnceJob = fixtures.fireOnceJob({ at: nowish });
			repeatedJob = fixtures.cronJob({ cron: "* * * * * *" });
		});


		describe("once (at)", () => {

			beforeEach((done) => {
				addMockJobs(fireOnceJob)
					.then(() => cronRunner.synchronize())
					.then(done);
			});

			it("should run job once", async () => {
				const mockFooService = mockService({
					subject: "foo-service.fire-once",
					response: ({ data }) => {
						expect(data).toBe("fireOnceJobData");
						return {
							status: 200
						}
					}
				});

				await wait();

				expect(mockFooService.invocations).toBe(1);

				const job = await jobRepo.get(fireOnceJob.id);

				expect(job.state).toBe(jobStates.completed);
				expect(job.updated).toBeDefined();
				expect(job.lastFailure).toBeUndefined();

				const invocations = await jobRepo.invocationRepo.findAll();

				expect(invocations.length).toBe(1);
				expect(invocations[0].success).toBe(true);
				expect(invocations[0].response.status).toBe(200);
				expect(invocations[0].jobId).toBe(job.id);
			});

			it("should run job once and save failure", async () => {
				mockService({
					subject: "foo-service.fire-once",
					response: {
						status: 400,
						error: {
							id: "generated by bus"
						}
					}
				});

				await wait();

				const job = await jobRepo.get(fireOnceJob.id);

				expect(job.state).toBe(jobStates.failed);

				const invocations = await jobRepo.invocationRepo.findAll();

				expect(invocations.length).toBe(1);
				expect(invocations[0].success).toBe(false);
				expect(invocations[0].response.status).toBe(400);

			});
		});

		describe("repeated jobs (cron)", () => {

			beforeEach(async () => {
				await addMockJobs(repeatedJob);
				await cronRunner.synchronize();
			});

			it("should run repeated job", async () => {
				const mockFooService = mockService({
					subject: "foo-service.cron",
					response: ({ data }) => {
						expect(data).toBe("cronJobData");
						return {
							status: 200
						}
					}
				});

				await wait();

				expect(mockFooService.invocations).toBe(1);

				await wait();

				expect(mockFooService.invocations).toBeGreaterThan(1);

				const job = await jobRepo.get(repeatedJob.id);

				expect(job.state).toBe(jobStates.scheduled);
			});

			it("should run repeated job and save failure", async () => {
				const mockFooService = mockService({
					subject: "foo-service.cron",
					response: {
						status: 400,
						error: {
							id: "generated by bus"
						}
					}
				});

				await wait();

				const job = await jobRepo.get(repeatedJob.id);

				expect(job.state).toBe(jobStates.scheduledAfterFailure);
				expect(job.lastFailure).toBeDefined();
				expect(mockFooService.invocations).toBe(1);
				expect(job.failureCount).toBe(1);
			});

			it("should fail if failureCount exceeds maxFailures", async () => {
				cronRunner.jobs[0].maxFailures = 1;

				mockService({
					subject: "foo-service.cron",
					response: {
						status: 400,
						error: {
							id: "generated by bus"
						}
					}
				});

				await wait();

				const job = await jobRepo.get(repeatedJob.id);

				expect(job.state).toBe(jobStates.failed);
				expect(job.lastFailure).toBeDefined();
				expect(job.failureCount).toBe(1);
			});

			it("should reset failureCount after success", async () => {
				let count = 1;
				mockService({
					subject: "foo-service.cron",
					response: () => {
						if (count == 1) {
							count++;
							// fail first invocation
							return {
								status: 400,
								error: {
									id: "generated by bus"
								}
							}
						} else {
							// next is successful
							return {
								status: 200,
								data: {}
							}
						}
					}
				});

				await wait();

				const job = await jobRepo.get(repeatedJob.id);

				expect(job.state).toBe(jobStates.scheduledAfterFailure);
				expect(job.lastFailure).toBeDefined();
				expect(job.failureCount).toBe(1);
				expect(job.totalFailureCount).toBe(1);

				await wait();

				const job2 = await jobRepo.get(repeatedJob.id)

				expect(job2.state).toBe(jobStates.scheduled);
				expect(job2.failureCount).toBe(0);
				expect(job2.totalFailureCount).toBe(1);

			});
		});
	});


	function wait(timeout = 1000) {
		return new Promise(resolve => {
			setTimeout(resolve, timeout);
		})
	}

	function addMockJobs(job) {
		const fireOnceJob = fixtures.fireOnceJob();
		const cronJob = fixtures.cronJob();

		if (job) {
			return jobRepo.create(job);
		} else {
			return Promise.all([
				jobRepo.create(fireOnceJob),
				jobRepo.create(cronJob)
			]);
		}
	}


});
