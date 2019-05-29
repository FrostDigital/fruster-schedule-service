const CronJob = require("cron").CronJob;
const log = require("fruster-log");
const bus = require("fruster-bus");
const uuid = require("uuid");
const conf = require("../../conf");
const _ = require("lodash");
const ms = require("ms");
const jobStates = require("../../constants").jobStates;

class CronRunner {

	constructor(jobRepo, options = {}) {
		this.repo = jobRepo;
		this.jobs = [];
		this.syncInterval = ms(options.syncInterval || "10s");
		this.globalMaxFailures = options.maxFailures || 100;

		if (options.start) {
			this.start();
		}
	}

	start() {
		setInterval(() => this.synchronize(), this.syncInterval);
		this.synchronize();
	}

	synchronize() {
		return this.repo.findAllSchedulable().then(stagedJobs => {

			if (this._isAnyRunning()) {
				log.info("Job(s) is running, skipping sync this time");
			} else {
				log.debug(`Synchronizing ${stagedJobs.length} jobs`);

				// Id's of existing all existing jobs
				const existingIds = this.jobs.map(job => job.id);

				// Id's of jobs that exists amongst existing and new
				// Is used to find out which ones to remove
				let matchedIds = [];

				// Add new jobs
				stagedJobs.forEach(jobModel => {
					if (!existingIds.includes(jobModel.id)) {
						jobModel.maxFailures = jobModel.maxFailures || this.globalMaxFailures;
						this.jobs.push(new Job(jobModel, this.repo));
					} else {
						const existingJob = this.jobs.find(job => job.id === jobModel.id);

						if (existingJob.cron !== jobModel.cron) {
							existingJob.stop();
							existingJob.cron = jobModel.cron;
							existingJob.schedule();
						}

						matchedIds.push(jobModel.id);
					}
				});

				// Remove jobs
				if (matchedIds.length !== existingIds.length) {
					let jobsToRemoveIds = existingIds.filter((existingJobId) => {
						return !matchedIds.includes(existingJobId);
					});

					this.jobs = this.jobs.filter(job => {
						const removeJob = jobsToRemoveIds.includes(job.id);

						if (removeJob) {
							job.stop();
						}

						return !removeJob;
					});

					log.debug(`Removed ${jobsToRemoveIds.length} jobs`);
				}
			}

		});
	}

	getJob(id) {
		return this.jobs.find(job => job.id == id);
	}

	stop() {
		this.jobs.forEach(job => {
			job.stop();
		});
	}

	_isAnyRunning() {
		if (!this.jobs.length) {
			return false;
		}
		return !!this.jobs.find(job => job.state == jobStates.running);
	}

}


class Job {

	constructor(model, repo) {
		this.repo = repo;
		this.id = model.id;
		this.cron = model.cron;
		this.at = model.at ? new Date(model.at) : undefined;
		this.subject = model.subject;
		this.data = model.data || {};
		this.timeZone = model.timeZone || conf.defaultTimeZone;
		this.maxFailures = model.maxFailures;

		this.schedule();
	}

	schedule() {
		log.debug(`Scheduled job ${this.id}, ${this.cron || this.at}`);
		const cronOrDate = this.cron || this.at;
		this.state = jobStates.scheduled;
		this.cronJob = new CronJob(cronOrDate, () => this.runJob(), null, true, this.timeZone);
	}

	stop() {
		this.cronJob.stop();
	}

	isRepeating() {
		return !!this.cron;
	}

	runJob() {
		log.debug(`Running job ${this.id}`);
		const startTime = new Date();

		this.state = jobStates.running;

		let invocationResponse;

		bus.request(this.subject, {
			reqId: uuid.v4(),
			data: this.data
		})
			.then((resp) => {
				invocationResponse = resp;

				if (this.isRepeating()) {
					this.state = jobStates.scheduled;
				} else {
					this.complete();
				}
			})
			.catch((err) => {
				log.warn(`Failed job ${this.id}, got error ${JSON.stringify(err.error || {})}`);
				invocationResponse = err;
				this.lastFailure = new Date();

				if (this.isRepeating()) {
					this.state = jobStates.scheduledAfterFailure;
				} else {
					this.fail();
				}
			})
			.then(() => {
				const invocation = {
					startTime: startTime,
					endTime: new Date(),
					response: invocationResponse,
					success: invocationResponse.status < 400
				};

				return this.save(invocation)
					.then((savedJob) => {
						if (savedJob.failureCount >= this.maxFailures) {
							log.warn(`Failing job ${this.id} after maxFailures ${this.maxFailures} been exceeded`);
							this.fail();
							return this.save();
						}
					});
			});
	}

	fail() {
		this.state = jobStates.failed;
		this.stop();
	}

	complete() {
		this.state = jobStates.completed;
		this.stop();
	}

	toJSON() {
		let json = {
			id: this.id,
			subject: this.subject,
			cron: this.cron,
			at: this.at,
			timeZone: this.timeZone,
			state: this.state,
			lastFailure: this.lastFailure
		};

		return _(json).omitBy(_.isUndefined).value();
	}

	save(invocation) {
		return this.repo.update(this.toJSON(), invocation);
	}
}

module.exports = CronRunner;
