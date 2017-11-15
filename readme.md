# Fruster schedule service

Service that runs jobs on a given interval or time.

Job state is persisted for logging and retry logic (depending on job configuration).

Fruster job service uses database for locking a job so only one execution is guarenteed. However
it is recommended that any jobs that are triggered are idempotent.


## Exposing

### `schedule-service.create-job`

Creates or updates (upserts) a new job.


#### Example requests

Create a job that will be fired every day at 10 am

```
{
    "reqId": "89b9e6b7-76ac-4817-8e27-c1d2d0bd13c8",
    "data": {
        // Unique id of job, if none is provided a UUID will be created
        "id": "send",

        // Optional display name of job
        "name": "Daily usage report"
        
        // Optional description of job
        "description": "Sends out daily usage report via email to admins",
        
        // Subject to invoke
        "subject": "analytics-service.send-report",

        // Optional data object that will be included in 
        "data": {},
        
        // Optional tags
        "tags": [ "analytics" ],
            
        // Cron pattern that describes when job will run
        "cron": "* * * * * *",
        
        // If job should be triggered once by date
        "at": "2017-02-23T16:00:00"                                                      
    }
}
```

## Configuration

See `conf.js`.

## Roadmap

* Add support for multiple instances (is-master)
* Retry logic
* Log severity and related notifications
