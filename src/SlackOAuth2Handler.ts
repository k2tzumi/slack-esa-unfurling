import * as OAuth2 from "apps-script-oauth2/src/OAuth2";
import {} from "apps-script-oauth2/src/Service";

type Properties = GoogleAppsScript.Properties.Properties;
type HtmlOutput = GoogleAppsScript.HTML.HtmlOutput;

interface OauthAccess {
  ok: boolean;
  error?: string;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id: string;
  app_id: string;
  team: Team;
  enterprise: Enterprise;
  authed_user: AuthedUser;
  incoming_webhook: IncomingWebhook;
}

interface Team {
  name: string;
  id: string;
}

interface Enterprise {
  name: string;
  id: string;
}

interface AuthedUser {
  id: string;
  scope: string;
  access_token: string;
  token_type: string;
}

interface IncomingWebhook {
  channel: string;
  channel_id: string;
  configuration_url: string;
  url: string;
}

interface TokenPayload {
  code: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  grant_type: string;
}

class SlackOAuth2Handler {
  public get token(): OauthAccess {
    return this.service.getToken(false);
  }

  public get access_token(): string {
    return this.service.getAccessToken();
  }

  public get authorizationUrl(): string {
    return this.service.getAuthorizationUrl({});
  }

  public get redirectUri(): string {
    return this.service.getRedirectUri();
  }

  public get requestURL() {
    const serviceURL = ScriptApp.getService().getUrl();
    return serviceURL.replace("/dev", "/exec");
  }

  public get channelName(): string | null {
    return this.token.incoming_webhook.channel;
  }

  public get botUserId(): string | null {
    return this.token.bot_user_id;
  }

  public get incomingWebhookUrl(): string | null {
    return this.token.incoming_webhook.url;
  }

  private get eventSubscriptionsUrl(): string | null {
    if (this.token.app_id) {
      return `https://api.slack.com/apps/${this.token.app_id}/event-subscriptions`;
    }
    return null;
  }

  private get slashCommnadsUrl(): string | null {
    if (this.token.app_id) {
      return `https://api.slack.com/apps/${this.token.app_id}/slash-commands`;
    }
    return null;
  }

  private get interactiveMessagesUrl(): string | null {
    if (this.token.app_id) {
      return `https://api.slack.com/apps/${this.token.app_id}/interactive-messages`;
    }
    return null;
  }

  public static readonly SCOPE = "links:read,links:write,chat:write";

  private service: Service_;

  public constructor(
    private clientId: string,
    private clientSecret: string,
    private propertyStore: Properties,
    private callbackFunctionName: string,
    private nextOAuthURL: string = null
  ) {
    this.service = OAuth2.createService("slack")
      .setAuthorizationBaseUrl("https://slack.com/oauth/v2/authorize")
      .setTokenUrl("https://slack.com/api/oauth.v2.access")
      .setTokenFormat(OAuth2.TOKEN_FORMAT.JSON)
      .setClientId(this.clientId)
      .setClientSecret(this.clientSecret)
      .setCallbackFunction(this.callbackFunctionName)
      .setPropertyStore(this.propertyStore)
      .setScope(SlackOAuth2Handler.SCOPE)
      .setTokenPayloadHandler(this.tokenPayloadHandler);
  }

  /**
   * Handles the OAuth callback.
   */
  public authCallback(request): HtmlOutput {
    const authorized = this.service.handleCallback(request);
    if (authorized) {
      console.info(
        `authCallback authorized. token: ${JSON.stringify(this.token)}`
      );

      return this.createAuthenSuccessHtml();
    }

    return HtmlService.createHtmlOutput("Denied. You can close this tab.");
  }

  /**
   * Reset the authorization state, so that it can be re-tested.
   */
  public clearService() {
    this.service.reset();
  }

  public verifyAccessToken(): boolean {
    return this.service.hasAccess();
  }

  public getRedirectUri(): string {
    return this.service.getRedirectUri();
  }

  public setRedirectUri(redirectUri: string): void {
    this.service.setRedirectUri(redirectUri);
  }

  private tokenPayloadHandler = (tokenPayload: TokenPayload): TokenPayload => {
    console.info(`tokenPayloadHandler: ${JSON.stringify(tokenPayload)}`);
    delete tokenPayload.redirect_uri;

    return tokenPayload;
  };

  private createAuthenSuccessHtml(): HtmlOutput {
    if (this.nextOAuthURL) {
      const successMessage = `<script>window.top.location.href='${this.nextOAuthURL}';</script>`;

      const template = HtmlService.createTemplate(successMessage);
      return HtmlService.createHtmlOutput(template.evaluate());
    } else {
      let successMessage = `
        Success!<br />
        Setting Request URL.<br />
        <a href="<?= eventSubscriptionsUrl ?>" target="_blank">Setting EventSubscriptions</a><br />
        <a href="<?= interactiveMessagesUrl ?>" target="_blank" >Setting Interactivity & Shortcuts</a><br />
        `;

      if (SlackOAuth2Handler.SCOPE.indexOf("commands") !== -1) {
        successMessage += `<a href="<?= slashCommnadsUrl ?>" target="_blank" >Setting Slash Commands</a><br />`;
      }

      const template = HtmlService.createTemplate(successMessage);
      template.eventSubscriptionsUrl = this.eventSubscriptionsUrl;
      template.interactiveMessagesUrl = this.interactiveMessagesUrl;

      if (SlackOAuth2Handler.SCOPE.indexOf("commands") !== -1) {
        template.slashCommnadsUrl = this.slashCommnadsUrl;
      }

      return HtmlService.createHtmlOutput(template.evaluate());
    }
  }
}

export { SlackOAuth2Handler };
