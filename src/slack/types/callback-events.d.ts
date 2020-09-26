declare namespace Slack {
  namespace CallbackEvent {
    interface EventBase {
      type: string;
      event_ts: string;
      user: string;
      ts: string;
      item: string;
    }
    interface EmojiChangedEvent extends EventBase {
      subtype: string;
      names?: string[];
      name?: string;
      value: string;
    }
    interface LinkSharedEvent extends EventBase {
      channel: string;
      message_ts: string;
      thread_ts: string;
      links: {
        domain: string;
        url: string;
      }[];
    }
  }
}
