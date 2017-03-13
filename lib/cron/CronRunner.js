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
		this.syncInterval = ms(options.syncInterval || "10s");

		if(options.start) {
			this.start();			
		}
	}

	start() {
		setInterval(() => this.synchronize(), this.syncInterval);
		this.synchronize();
	}

	synchronize() {
		return this.repo.findAllSchedulable().then(stagedJobs => {

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
					if(!existingIds.includes(jobModel.id)) {
						this.jobs.push(new Job(jobModel, this.repo));
					} else {
						matchedIds.push(jobModel.id);
					}
				});

				// Remove jobs
				if(matchedIds.length != existingIds.length) {
					let jobsToRemoveIds = existingIds.filter((existingJobId) => {
						return !matchedIds.includes(existingJobId);
					});
					
					this.jobs = this.jobs.filter(job => {
						const removeJob = jobsToRemoveIds.includes(job.id);

						if(removeJob) {
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
		this.jobs.forEach(job => {
			job.stop();
		});
	}

	_isAnyRunning() {
		if(!this.jobs.length) {
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
		this.data = model.data || {};		
		this.timeZone = model.timeZone || conf.defaultTimeZone; 
		
		this.schedule();
	}

	schedule() {	
		log.debug(`Scheduled job ${this.id}`);		
		const cronOrDate = this.cron || this.at;
		this.state = jobStates.scheduled;
		this.cronJob = new CronJob(cronOrDate, () => this.runJob(), null, true, this.timeZone);
	}
	
	stop() {
		this.cronJob.stop();	
	}

	saveInvocation(invocation) {
		return this.repo.update(this.toJSON(), invocation);
	}

	isRepeating() {
		return !!this.cron;
	}

	runJob() {
		log.debug(`Running job ${this.id}`);
		const startTime = new Date();

		this.state = jobStates.running;

		let response;
		let success;
		let reqId = uuid.v4();

		bus.request(this.subject, {
			reqId: reqId,
			data: this.data
		})
		.then((resp) => {
			response = resp;
			
			success = true;
			
			if(this.isRepeating()) {
				this.state = jobStates.scheduled;				
			} else {
				this.state = jobStates.completed;
				this.cronJob.stop();
			}
		})
		.catch((err) => {
			log.warn(`Failed job ${this.id}, got error ${JSON.stringify(err.error || {})}`);
			response = err;
			this.lastFailure = new Date();

			success = false;

			if(this.isRepeating()) {
				this.state = jobStates.scheduled;				
			} else {
				this.state = jobStates.failed;
				this.cronJob.stop();
			}
		})
		.then(() => {
			const endTime = new Date();			
			this.saveInvocation({
				startTime: startTime,
				endTime: endTime,
				response: response,
				success: success
			});
		});		
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

}

module.exports = CronRunner;
