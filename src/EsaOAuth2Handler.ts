import * as OAuth2 from "apps-script-oauth2/src/OAuth2";
import {} from "apps-script-oauth2/src/Service";

type Properties = GoogleAppsScript.Properties.Properties;
type HtmlOutput = GoogleAppsScript.HTML.HtmlOutput;
type URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;

interface OauthAccess {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  granted_time: number;
}

interface TokenPayload {
  code: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  grant_type: string;
}

class EsaOAuth2Handler {
  public get token(): OauthAccess {
    return this.service.getToken(false);
  }

  public get access_token(): string {
    return this.service.getAccessToken();
  }

  public get authorizationUrl(): string {
    return this.service.getAuthorizationUrl({
      response_type: "code"
    });
  }

  public get redirectUri(): string {
    return this.service.getRedirectUri();
  }

  public get requestURL(): string {
    const serviceURL = ScriptApp.getService().getUrl();
    return serviceURL.replace("/dev", "/exec");
  }

  public static readonly SCOPE = "read";

  private service: Service_;

  public constructor(
    private clientId: string,
    private clientSecret: string,
    private propertyStore: Properties,
    private callbackFunctionName: string,
    private team: string,
    private user: string = null,
    private nextOAuthURL: string = null
  ) {
    const serviceName = `esa#${this.team}#${this.user}`;

    this.service = OAuth2.createService(serviceName)
      .setAuthorizationBaseUrl("https://api.esa.io/oauth/authorize")
      .setTokenUrl("https://api.esa.io/oauth/token")
      .setTokenFormat(OAuth2.TOKEN_FORMAT.JSON)
      .setClientId(this.clientId)
      .setClientSecret(this.clientSecret)
      .setCallbackFunction(this.callbackFunctionName)
      .setPropertyStore(this.propertyStore)
      .setScope(EsaOAuth2Handler.SCOPE)
      .setGrantType("authorization_code")
      .setTokenPayloadHandler(this.tokenPayloadHandler);
  }

  /**
   * Handles the OAuth callback.
   */
  public authCallback(request): HtmlOutput {
    const authorized = this.service.handleCallback(request);
    if (authorized) {
      return this.createAuthenSuccessHtml();
    }

    return HtmlService.createHtmlOutput("Denied. You can close this tab.");
  }

  /**
   * Reset the authorization state, so that it can be re-tested.
   */
  public clearService() {
    if (this.verifyAccessToken()) {
      this.revoke();
    }
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

  private revoke(): void {
    const formData = {
      access_token: this.access_token
    };

    const options: URLFetchRequestOptions = {
      contentType: "application/x-www-form-urlencoded",
      method: "post",
      muteHttpExceptions: true,
      payload: formData
    };

    const response = JSON.parse(
      UrlFetchApp.fetch(
        "https://api.esa.io/oauth/revoke",
        options
      ).getContentText()
    );

    if (response.errors) {
      console.warn(
        `Deauthorization error. response: ${JSON.stringify(
          response
        )}, payload: ${JSON.stringify(formData)}`
      );
    }
  }

  private tokenPayloadHandler = (tokenPayload: TokenPayload): {} => {
    return tokenPayload;
  };

  private createAuthenSuccessHtml(): HtmlOutput {
    if (this.nextOAuthURL) {
      const successMessage = `<script>window.top.location.href='${this.nextOAuthURL}';</script>`;

      const template = HtmlService.createTemplate(successMessage);
      return HtmlService.createHtmlOutput(template.evaluate());
    } else {
      const successMessage = `Success!<br />`;

      const template = HtmlService.createTemplate(successMessage);
      return HtmlService.createHtmlOutput(template.evaluate());
    }
  }
}

export { EsaOAuth2Handler };
