import { NetworkAccessError } from "./NetworkAccessError";

type URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;
type HttpMethod = GoogleAppsScript.URL_Fetch.HttpMethod;

// See. https://docs.esa.io/posts/102#%E3%82%A8%E3%83%A9%E3%83%BC%E3%83%AC%E3%82%B9%E3%83%9D%E3%83%B3%E3%82%B9
interface Response {
  errors?: string;
  message?: string;
}

// See. https://docs.esa.io/posts/102#GET%20/v1/teams/:team_name/posts/:post_number
interface Post extends Response {
  number: number;
  name: string;
  full_name: string;
  wip: boolean;
  body_md: string;
  body_html: string;
  created_at: Date;
  message: string;
  url: string;
  updated_at: Date;
  tags: string;
  category: string;
  revision_number: number;
  created_by: {
    name: string;
    screen_name: string;
    icon: string;
  };
  updated_by: {
    name: string;
    screen_name: string;
    icon: string;
  };
  kind: string;
  comments_count: number;
  tasks_count: number;
  done_tasks_count: number;
  stargazers_count: number;
  watchers_count: number;
  star: boolean;
  watch: boolean;
}

// See. https://docs.esa.io/posts/102#GET%20/v1/teams/:team_name/comments/:comment_id
interface Comment extends Response {
  id: number;
  body_md: string;
  body_html: string;
  created_at: Date;
  updated_at: Date;
  url: string;
  created_by: {
    name: string;
    screen_name: string;
    icon: string;
  };
  stargazers_count?: number;
  star: boolean;
}

class EsaApiClient {
  static readonly BASE_URI = "https://api.esa.io/";

  public constructor(private token: string, public team: string) {}

  /**
   * https://docs.esa.io/posts/102#GET%20/v1/teams/:team_name/posts/:post_number
   * @param postNumber
   */
  public getPost(postNumber: number): Post | null {
    const endPoint =
      EsaApiClient.BASE_URI + `/v1/teams/${this.team}/posts/${postNumber}`;
    const payload: {} = {};

    const response = this.invokeAPI(endPoint, payload) as Post;

    if (response.errors) {
      if (response.message === "Resource Not Found") {
        return null;
      }

      throw new Error(
        `getPost faild. response: ${JSON.stringify(
          response
        )}, postNumber: ${postNumber}, payload: ${JSON.stringify(payload)}`
      );
    }

    return response;
  }

  /**
   * https://docs.esa.io/posts/102#GET%20/v1/teams/:team_name/comments/:comment_id
   * @param commentId
   */
  public getComment(commentId: number): Comment | null {
    const endPoint =
      EsaApiClient.BASE_URI + `/v1/teams/${this.team}/comments/${commentId}`;
    const payload: {} = {};

    const response = this.invokeAPI(endPoint, payload) as Comment;

    if (response.errors) {
      if (response.message === "Resource Not Found") {
        return null;
      }

      throw new Error(
        `getPost faild. response: ${JSON.stringify(
          response
        )}, commentId: ${commentId}, payload: ${JSON.stringify(payload)}`
      );
    }

    return response;
  }

  private postRequestHeader() {
    return {
      "content-type": "application/json; charset=UTF-8",
      Authorization: `Bearer ${this.token}`,
    };
  }

  private getRequestHeader() {
    return {
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${this.token}`,
    };
  }

  private postRequestOptions(payload: string | {}): URLFetchRequestOptions {
    const options: URLFetchRequestOptions = {
      method: "post",
      headers: this.postRequestHeader(),
      muteHttpExceptions: true,
      payload: payload instanceof String ? payload : JSON.stringify(payload),
    };

    return options;
  }

  private getRequestOptions(): URLFetchRequestOptions {
    const options: URLFetchRequestOptions = {
      method: "get",
      headers: this.getRequestHeader(),
      muteHttpExceptions: true,
    };

    return options;
  }

  /**
   * @param endPoint Slack API endpoint
   * @param options
   * @throws NetworkAccessError
   */
  private invokeAPI(endPoint: string, payload: {}): Response {
    let response;

    try {
      switch (this.preferredHttpMethod(endPoint)) {
        case "post":
          response = UrlFetchApp.fetch(
            endPoint,
            this.postRequestOptions(payload)
          );
          break;
        case "get":
          response = UrlFetchApp.fetch(
            this.formUrlEncoded(endPoint, payload),
            this.getRequestOptions()
          );
          break;
      }
    } catch (e) {
      console.warn(`DNS error, etc. ${e.message}`);
      throw new NetworkAccessError(500, e.message);
    }

    switch (response.getResponseCode()) {
      case 200:
      case 404:
        return JSON.parse(response.getContentText());
      default:
        console.warn(
          `Strava API error. endpoint: ${endPoint}, status: ${response.getResponseCode()}, content: ${response.getContentText()}`
        );
        throw new NetworkAccessError(
          response.getResponseCode(),
          response.getContentText()
        );
    }
  }

  private preferredHttpMethod(endPoint: string): HttpMethod {
    switch (true) {
      default:
        return "get";
      // default:
      //   return "post";
    }
  }

  private formUrlEncoded(endPoint: string, payload: {}): string {
    const query = Object.entries<string>(payload)
      .map(([key, value]) => `${key}=${encodeURI(value)}`)
      .join("&");

    return `${endPoint}?${query}`;
  }
}

export { EsaApiClient, Post, Comment };
