import { SlackHandler } from "./SlackHandler";
import { DuplicateEventError } from "./CallbackEventHandler";
import { JobBroker } from "./JobBroker";
import { SlackOAuth2Handler } from "./SlackOAuth2Handler";
import { EsaOAuth2Handler } from "./EsaOAuth2Handler";
import { Slack } from "./slack/types/index.d";
import { SlackApiClient } from "./SlackApiClient";
import { SlackWebhooks } from "./SlackWebhooks";
import { EsaApiClient, Post, Comment } from "./EsaApiClient";

type TextOutput = GoogleAppsScript.Content.TextOutput;
type HtmlOutput = GoogleAppsScript.HTML.HtmlOutput;
type LinkSharedEvent = Slack.CallbackEvent.LinkSharedEvent;
type BlockActions = Slack.Interactivity.BlockActions;
type ButtonAction = Slack.Interactivity.ButtonAction;
type InteractionResponse = Slack.Interactivity.InteractionResponse;

const properties = PropertiesService.getScriptProperties();

const SLACK_CLIENT_ID: string = properties.getProperty("SLACK_CLIENT_ID");
const SLACK_CLIENT_SECRET: string = properties.getProperty(
  "SLACK_CLIENT_SECRET"
);
const ESA_CLIENT_ID: string = properties.getProperty("ESA_CLIENT_ID");
const ESA_CLIENT_SECRET: string = properties.getProperty("ESA_CLIENT_SECRET");
let slackOAuth2Handler: SlackOAuth2Handler;
let esaOAuth2Handler: EsaOAuth2Handler;

const slackHandleCallback = (request): HtmlOutput => {
  return createSlackOAuth2Handler().authCallback(request);
};

const esaHandleCallback = (request): HtmlOutput => {
  const { serviceName } = request.parameter;
  const team = serviceName.split("_")[1];
  const user = serviceName.split("_")[2];
  const cacheKey = `${team}_${user}`;

  const handler = createEsaOAuth2Handler(team, user);
  // Authentication
  const output = handler.authCallback(request);

  // Retrieving Unauthenticated Event Information from the Cache.
  const cache = CacheService.getScriptCache();
  const formValue = JSON.parse(cache.get(cacheKey));

  if (formValue) {
    const { channel, message_ts, url, response_url } = formValue;

    // Unfurls now that we've been authenticated.
    doUnfurls(channel, user, message_ts, url);

    // delete ephemeral message
    const webhook = new SlackWebhooks(response_url);
    webhook.invoke({ delete_original: true });
  }

  return output;
};

function createSlackApiClient(): SlackApiClient {
  return new SlackApiClient(createSlackOAuth2Handler().access_token);
}

function createEsaOAuth2Handler(team: string, user: string): EsaOAuth2Handler {
  if (!esaOAuth2Handler) {
    esaOAuth2Handler = new EsaOAuth2Handler(
      ESA_CLIENT_ID,
      ESA_CLIENT_SECRET,
      PropertiesService.getUserProperties(),
      esaHandleCallback.name,
      team,
      user
    );
  }

  return esaOAuth2Handler;
}

function createSlackOAuth2Handler(): SlackOAuth2Handler {
  if (!slackOAuth2Handler) {
    slackOAuth2Handler = new SlackOAuth2Handler(
      SLACK_CLIENT_ID,
      SLACK_CLIENT_SECRET,
      PropertiesService.getUserProperties(),
      slackHandleCallback.name
    );
  }

  return slackOAuth2Handler;
}

/**
 * Authorizes and makes a request to the Slack API.
 */
function doGet(request): HtmlOutput {
  const handler = createSlackOAuth2Handler();

  // Clear authentication by accessing with the get parameter `?logout=true`
  if (request.parameter.logout) {
    const userProperties = PropertiesService.getUserProperties();
    handler.clearService();
    userProperties.deleteAllProperties();
    const template = HtmlService.createTemplate(
      'Logout<br /><a href="<?= requestUrl ?>" target="_blank">refresh</a>.'
    );
    template.requestUrl = slackOAuth2Handler.requestURL;
    return HtmlService.createHtmlOutput(template.evaluate());
  }

  if (!handler.verifyAccessToken()) {
    const template = HtmlService.createTemplate(
      'RedirectUri:<?= redirectUrl ?> <br /><a href="<?= authorizationUrl ?>" target="_blank">Authorize Slack</a>.'
    );
    template.authorizationUrl = handler.authorizationUrl;
    template.redirectUrl = handler.redirectUri;
    return HtmlService.createHtmlOutput(template.evaluate());
  }

  return HtmlService.createHtmlOutput("OK");
}

const asyncLogging = (): void => {
  const jobBroker: JobBroker = new JobBroker();
  jobBroker.consumeJob((parameter: {}) => {
    console.info(JSON.stringify(parameter));
  });
};

const VERIFICATION_TOKEN: string = properties.getProperty("VERIFICATION_TOKEN");

function doPost(e): TextOutput {
  const slackHandler = new SlackHandler(VERIFICATION_TOKEN);

  slackHandler.addCallbackEventListener("link_shared", executeLinkSharedEvent);
  slackHandler.addInteractivityListener("button", executeButton);

  try {
    const process = slackHandler.handle(e);

    if (process.performed) {
      return process.output;
    }
  } catch (exception) {
    if (exception instanceof DuplicateEventError) {
      return ContentService.createTextOutput();
    } else {
      new JobBroker().enqueue(asyncLogging, {
        message: exception.message,
        stack: exception.stack,
      });
      throw exception;
    }
  }

  throw new Error(`No performed handler, request: ${JSON.stringify(e)}`);
}

const executeLinkSharedEvent = (event: LinkSharedEvent): void => {
  const handler = createEsaOAuth2Handler(
    getTeam(event.links[0].url),
    event.user
  );

  if (!handler.verifyAccessToken()) {
    postAuthenticationMessage(
      event.channel,
      event.user,
      event.message_ts,
      event.links[0].url
    );

    return;
  }

  if (event.links.length === 1) {
    doUnfurls(event.channel, event.user, event.message_ts, event.links[0].url);
  } else {
    for (const link of event.links) {
      new JobBroker().enqueue(chatUnfurl, {
        channel: event.channel,
        user: event.user,
        message_ts: event.message_ts,
        url: link.url,
      });
    }
  }
};

function getTeam(url: string): string {
  return url.match(/^https:\/\/(.*)\.esa\.io\/.*$/)[1];
}

function postAuthenticationMessage(
  channel: string,
  user: string,
  message_ts: string,
  url: string
): void {
  const handler = createEsaOAuth2Handler(getTeam(url), user);
  const client = createSlackApiClient();

  client.postEphemeral(
    channel,
    "",
    user,
    createAuthenticationBlocks(handler, message_ts, url)
  );
}

function createAuthenticationBlocks(
  handler: EsaOAuth2Handler,
  message_ts: string,
  url: string
): {}[] {
  const formValue = {
    message_ts,
    url,
  };

  let message;
  if (handler.verifyAccessToken()) {
    message =
      "Your credentials appear to be incorrect. Would you like to re-authenticate?";
  } else {
    message =
      "That looks like a esa link. Would you like to unfurling esa's URL";
  }

  return [
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: message,
        },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Yes, please",
          },
          value: JSON.stringify(formValue),
          url: handler.authorizationUrl,
          style: "primary",
          action_id: "auth",
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "No, thanks",
          },
          value: '{ "no": true }',
          action_id: "no",
        },
      ],
    },
  ];
}

function unSupportURLMessage(channel: string, user: string): void {
  const client = createSlackApiClient();

  client.postEphemeral(channel, "This URL is not supported", user);
}

const executeButton = (blockActions: BlockActions): {} => {
  const action = blockActions.actions[0] as ButtonAction;
  const response_url = blockActions.response_url;

  switch (action.action_id) {
    case "auth":
      // Deleting Previous Credentials.
      const user = blockActions.user.id;
      const formValue = JSON.parse(action.value);
      const team = getTeam(formValue.url);
      const handler = createEsaOAuth2Handler(team, user);
      handler.clearService();

      // Store cache for post-authentication
      const channel = blockActions.channel.id;
      const message_ts = formValue.message_ts;
      const cache = CacheService.getScriptCache();
      const cacheKey = `${team}_${user}`;
      const cacheValue = { ...formValue, channel, message_ts, response_url };

      cache.put(cacheKey, JSON.stringify(cacheValue));

      return {};
  }

  const webhook = new SlackWebhooks(response_url);
  const response: InteractionResponse = { delete_original: true };

  if (!webhook.invoke(response)) {
    throw new Error(
      `executeButton faild. event: ${JSON.stringify(blockActions)}`
    );
  }

  return {};
};

const chatUnfurl = (): void => {
  const jobBroker: JobBroker = new JobBroker();
  jobBroker.consumeJob(
    (parameter: {
      channel: string;
      user: string;
      message_ts: string;
      url: string;
    }) => {
      doUnfurls(
        parameter.channel,
        parameter.user,
        parameter.message_ts,
        parameter.url
      );
    }
  );
};

function doUnfurls(
  channel: string,
  user: string,
  message_ts: string,
  url: string
): void {
  const esaApiClient = createEsaApiClient(getTeam(url), user);
  const unfurls = createUnfurls(esaApiClient, url);

  // No match for a supported URL
  if (Object.keys(unfurls).length === 0) {
    unSupportURLMessage(channel, user);

    return;
  }

  const client = createSlackApiClient();
  client.chatUnfurl(channel, message_ts, unfurls);
}

function createEsaApiClient(team: string, user: string): EsaApiClient {
  const handler = createEsaOAuth2Handler(team, user);

  return new EsaApiClient(handler.access_token, team);
}

function createUnfurls(esaApiClient: EsaApiClient, url: string): {} {
  const unfurls = {};
  let matchUrl: string[];
  const commentMatcher = new RegExp(
    `^https://${esaApiClient.team}\.esa\.io/posts/(\\d)+#comment-(\\d+).*$`
  );
  const postMatcher = new RegExp(
    `^https://${esaApiClient.team}\.esa\.io/posts/(\\d+).*$`
  );

  matchUrl = url.match(commentMatcher);
  if (matchUrl) {
    const comment = esaApiClient.getComment(Number.parseInt(matchUrl[2], 10));
    if (comment) {
      const post = esaApiClient.getPost(Number.parseInt(matchUrl[1], 10));
      unfurls[url] = createCommentBlocks(comment, post);
    }
  } else {
    matchUrl = url.match(postMatcher);
    if (matchUrl) {
      const post = esaApiClient.getPost(Number.parseInt(matchUrl[1], 10));
      if (post) {
        unfurls[url] = createPostBlocks(post);
      }
    }
  }

  return unfurls;
}

function createCommentBlocks(comment: Comment, post: Post): {} {
  const image = extractImage(comment.body_html);

  const blocks = {
    blocks: [
      {
        type: "context",
        elements: [
          {
            type: "image",
            image_url: comment.created_by.icon,
            alt_text: "commented on",
          },
          {
            type: "mrkdwn",
            text: `*${generateMemberLink(
              comment.url,
              comment.created_by.screen_name
            )}*`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${comment.created_by.screen_name} commented on <${
            comment.url
          }|${generatePostTitle(post)}>`,
        },
        fields: [
          {
            type: "mrkdwn",
            text: head(comment.body_md, 10),
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: genarateFooter(comment),
          },
          {
            type: "image",
            image_url: comment.created_by.icon,
            alt_text: "created_by",
          },
          {
            type: "mrkdwn",
            text: comment.updated_at ? comment.updated_at : comment.created_at,
          },
        ],
      },
    ],
  };

  if (image) {
    blocks.blocks.push(image);
  }

  return blocks;
}

function createPostBlocks(post: Post): {} {
  const image = extractImage(post.body_html);

  const blocks = {
    blocks: [
      {
        type: "context",
        elements: [
          {
            type: "image",
            image_url: post.created_by.icon,
            alt_text: "created_by",
          },
          {
            type: "mrkdwn",
            text: `*${generateMemberLink(
              post.url,
              post.created_by.screen_name
            )}*`,
          },
          {
            type: "mrkdwn",
            text: post.message,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${post.url}|${generatePostTitle(post)}>`,
        },
        fields: [
          {
            type: "mrkdwn",
            text: head(post.body_md, 10),
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: genarateFooter(post),
          },
          {
            type: "image",
            image_url: post.updated_by
              ? post.updated_by.icon
              : post.created_by.icon,
            alt_text: "updated_by",
          },
          {
            type: "mrkdwn",
            text: post.updated_at ? post.updated_at : post.created_at,
          },
        ],
      },
    ],
  };

  if (image) {
    blocks.blocks.push(image);
  }

  return blocks;
}

function head(text: string, lines: number): string {
  const lineArray = text.split("\n");

  if (lineArray.length <= lines) {
    return text;
  } else {
    return lineArray.slice(0, lines).join("\n");
  }
}

function generatePostTitle(post: Post): string {
  let title = post.full_name;

  if (post.wip) {
    title = `[WIP] ${title}`;
  }

  return title;
}

function generateMemberLink(url: string, screen_name: string): string {
  return `<https://${getTeam(
    url
  )}.esa.io/members/${screen_name}|${screen_name}>`;
}

function genarateFooter(post: Post | Comment): string {
  const { updated_by, created_by, revision_number } = post;

  if (revision_number && revision_number > 1) {
    return `Updated by ${generateMemberLink(
      post.url,
      updated_by.screen_name
    )} (${generatePostRevisionLink(post)})`;
  }

  return `Created by ${generateMemberLink(post.url, created_by.screen_name)}`;
}

function generatePostRevisionLink(post: Post): string {
  return `<${post.url}/revisions/${post.revision_number}|diff>`;
}

function extractImage(html: string): {} | null {
  const images = html.match(/<img(.|\s)*?>/gi);

  if (images) {
    for (const image of images) {
      const src = image.match(/src=["|'](.*?)["|']/);
      const image_url = src ? src[1] : null;
      if (
        image_url !== null &&
        image_url.match(/^https?:\/\/.*/) &&
        image.match(/class=\"emoji\"/) === null
      ) {
        const alt = image.match(/alt=["|'](.*?)["|']/);
        const alt_text = alt ? alt[1] + "hoge" : null;
        return {
          type: "image",
          image_url,
          alt_text,
        };
      }
    }
  }
  return null;
}

export { executeLinkSharedEvent, createUnfurls, extractImage };
