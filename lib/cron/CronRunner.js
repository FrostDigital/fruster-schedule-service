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
	}

	start() {
		setInterval(() => this.synchronize(), this.syncInterval);
		this.synchronize();
		return this;
	}

	async synchronize() {
		try {
			const stagedJobs = await this.repo.findAllSchedulable();

			if (this._isAnyRunning()) {
				log.info("Job(s) is running, skipping sync this time");
			} else {
				log.debug(`Synchronizing ${stagedJobs.length} jobs`);

				const existingIds = this.jobs.map((job) => job.id);
				let matchedIds = [];

				for (const jobModel of stagedJobs) {
					if (!existingIds.includes(jobModel.id)) {
						jobModel.maxFailures =
							jobModel.maxFailures || this.globalMaxFailures;
						this.jobs.push(new Job(jobModel, this.repo));
					} else {
						const existingJob = this.jobs.find(
							(job) => job.id === jobModel.id
						);

						if (existingJob.cron !== jobModel.cron) {
							existingJob.stop();
							existingJob.cron = jobModel.cron;
							existingJob.schedule();
						}

						matchedIds.push(jobModel.id);
					}
				}

				if (matchedIds.length !== existingIds.length) {
					const jobsToRemoveIds = existingIds.filter(
						(existingJobId) => !matchedIds.includes(existingJobId)
					);

					this.jobs = this.jobs.filter((job) => {
						const removeJob = jobsToRemoveIds.includes(job.id);

						if (removeJob) {
							job.stop();
						}

						return !removeJob;
					});

					log.debug(`Removed ${jobsToRemoveIds.length} jobs`);
				}
			}
		} catch (error) {
			log.error(`Error during synchronization: ${error.message}`);
		}

		return this;
	}

	getJob(id) {
		return this.jobs.find((job) => job.id == id);
	}

	stop() {
		this.jobs.forEach((job) => {
			job.stop();
		});
	}

	_isAnyRunning() {
		if (!this.jobs.length) {
			return false;
		}
		return !!this.jobs.find((job) => job.state == jobStates.running);
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
		this.cronJob = new CronJob(
			cronOrDate,
			() => this.runJob(),
			null,
			true,
			this.timeZone
		);
	}

	stop() {
		this.cronJob.stop();
	}

	isRepeating() {
		return !!this.cron;
	}

	async runJob() {
		log.debug(`Running job ${this.id}`);
		const startTime = new Date();

		this.state = jobStates.running;

		let invocationResponse;

		try {
			invocationResponse = await bus.request({
				subject: this.subject,
				message: {
					reqId: uuid.v4(),
					data: this.data,
				},
				skipOptionsRequest: true,
			});

			if (this.isRepeating()) {
				this.state = jobStates.scheduled;
			} else {
				this.complete();
			}
		} catch (err) {
			log.warn(
				`Failed job ${this.id}, got error ${JSON.stringify(
					err.error || {}
				)}`
			);
			invocationResponse = err;
			this.lastFailure = new Date();

			if (this.isRepeating()) {
				this.state = jobStates.scheduledAfterFailure;
			} else {
				this.fail();
			}
		}

		const invocation = {
			startTime: startTime,
			endTime: new Date(),
			response: invocationResponse,
			success: invocationResponse.status < 400,
		};

		try {
			const savedJob = await this.save(invocation);
			if (savedJob.failureCount >= this.maxFailures) {
				log.warn(
					`Failing job ${this.id} after maxFailures ${this.maxFailures} been exceeded`
				);
				this.fail();
				await this.save();
			}
		} catch (error) {
			log.error(`Error saving job ${this.id}: ${error.message}`);
		}
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
			lastFailure: this.lastFailure,
		};

		return _(json).omitBy(_.isUndefined).value();
	}

	async save(invocation) {
		return await this.repo.update(this.toJSON(), invocation);
	}
}

module.exports = CronRunner;
