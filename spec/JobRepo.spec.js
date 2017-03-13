const testUtils = require("fruster-test-utils");
const bus = require("fruster-bus");
const JobRepo = require("../lib/repos/JobRepo");
const fixtures = require("./support/fixtures");

describe("JobRepo", () => {

	let repo;

	testUtils.startBeforeEach({
		mongoUrl: "mongodb://localhost:27017/job-repo-test",
		bus: bus,
		afterStart: (connection) => {
			repo = new JobRepo(connection.db);
			return Promise.resolve();
		}
	});

	it("should insert job when it does not exist", (done) => {
		const job = fixtures.job();

		repo.upsert(job).then(createdJob => {
			expect(createdJob.id).toBe(job.id);			
			done();
		});
	});

	it("should upsert job when it already exists", (done) => {
		let job = fixtures.job();
		let created;

		repo.upsert(job)
			.then(wait) // wait so created date is not same (not sure if needed though)
			.then((createdJob) => {
				created = createdJob.created;
				job.subject = "updated";
				return repo.upsert(job);
			})
			.then(updatedJob => {
				expect(updatedJob.id).toBe(job.id);			
				expect(updatedJob.subject).toBe("updated");	
				expect(updatedJob.created).toEqual(created);				
			})
			.then(() => repo.findAll())
			.then(all => {
				expect(all.length).toBe(1);
				done();
			});
	});

	it("should find all jobs", (done) => {
		const job = fixtures.job();

		repo.upsert(job)
			.then(() => repo.findAll())
			.then(all => {
				expect(all.length).toBe(1);			
				expect(all[0]._id).toBeUndefined();			
				expect(all[0].id).toBe(job.id);			
				done();
			});
	});

	it("should find all scheduled and running jobs", (done) => {
		const job1 = fixtures.job({
			id: "id1",
			state: "running"
		});
		const job2 = fixtures.job({
			id: "id2",
			state: "scheduled"
		});

		repo.upsert(job1)
			.then(repo.upsert(job2))
			.then(() => repo.findAllScheduledAndRunning())
			.then(all => {
				expect(all.length).toBe(2);							
				done();
			});
	});

	it("should update with failure", (done) => {
		let job = fixtures.job();
		
		repo.upsert(job)			
			.then((createdJob) => {	
				createdJob.state = "failure";
				return repo.update(createdJob, { startTime: new Date(), endTime: new Date()});			
			})
			.then(updatedJob => {
				expect(updatedJob.lastFailure).toBeDefined();			
				expect(updatedJob.failureCount).toBe(1);							
				expect(updatedJob.invocations.length).toBe(1);							
				return repo.update(updatedJob);
			})
			.then(updatedJob => {
				expect(updatedJob.failureCount).toBe(2);
				done();
			});		
	});


	function wait(o) {
		return new Promise(resolve => {
			setTimeout(() => resolve(o), 100);
		});
	}
});
