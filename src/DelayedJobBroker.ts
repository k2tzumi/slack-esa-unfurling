import { JobBroker, JobFunction, Job, JobParameter } from "./JobBroker";

class DelayedJobBroker extends JobBroker {
  private constructor(private scheduled_at: Date = null) {
    super();
  }

  static createJob(scheduled_at: Date): DelayedJobBroker {
    return new this(scheduled_at);
  }

  public performLater(callback: JobFunction, parameter: {}): void {
    this.enqueue(callback, parameter);
  }

  static perform(closure: JobFunction): void {
    new this().consumeJob(closure, this.perform.caller.name);
  }

  protected createJob(callback: JobFunction, parameter: {}): Job {
    const trigger = ScriptApp.newTrigger(callback.name)
      .timeBased()
      .at(this.scheduled_at)
      .create();
    const jobParameter: JobParameter = {
      created_at: this.now,
      handler: callback.name,
      id: trigger.getUniqueId(),
      parameter: JSON.stringify(parameter),
      state: "waiting",
      scheduled_at: this.scheduled_at.getTime(),
    };

    return {
      trigger,
      parameter: jobParameter,
    };
  }
}

export { DelayedJobBroker };
