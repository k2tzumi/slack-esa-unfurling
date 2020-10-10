import { Slack } from "../src/slack/types/index.d";

const properites = {
  getProperty: jest.fn(() => {
    return "dummy";
  }),
  deleteAllProperties: jest.fn(),
  deleteProperty: jest.fn(),
  getKeys: jest.fn(),
  getProperties: jest.fn(),
  setProperties: jest.fn(),
  setProperty: jest.fn(),
};

PropertiesService.getScriptProperties = jest.fn(() => properites);
PropertiesService.getUserProperties = jest.fn(() => properites);

const service = {
  setAuthorizationBaseUrl: jest.fn(() => {
    return this;
  }),
};

OAuth2.createService = jest.fn(() => service);
let apiResponse;
const response = {
  getResponseCode: jest.fn(() => {
    return 200;
  }),
  getContentText: jest.fn(() => {
    return JSON.stringify(apiResponse);
  }),
  getBlob: jest.fn(() => {
    return "";
  }),
};
UrlFetchApp.fetch = jest.fn(() => response);

const fileIteraater = {
  hasNext: jest.fn(() => {
    return false;
  }),
};
Utilities.jsonStringify = jest.fn();

import { createUnfurls, extractImage } from "../src/Code";
import { EsaApiClient } from "../src/EsaApiClient";
describe("Code", () => {
  describe("createUnfurls", () => {
    it("post success", () => {
      const url = "https://team.esa.io/posts/4";
      const client = new EsaApiClient("token", "team");
      apiResponse = {
        number: 1,
        name: "hi!",
        full_name: "日報/2015/05/09/hi! #api #dev",
        wip: true,
        body_md: "# Getting Started",
        body_html:
          '<h1 id="1-0-0" name="1-0-0">\n<a class="anchor" href="#1-0-0"><i class="fa fa-link"></i><span class="hidden" data-text="Getting Started"> &gt; Getting Started</span></a>Getting Started</h1>\n',
        created_at: "2015-05-09T11:54:50+09:00",
        message: "Add Getting Started section",
        url,
        updated_at: "2015-05-09T11:54:51+09:00",
        tags: ["api", "dev"],
        category: "日報/2015/05/09",
        revision_number: 1,
        created_by: {
          name: "Atsuo Fukaya",
          screen_name: "fukayatsu",
          icon:
            "http://img.esa.io/uploads/production/users/1/icon/thumb_m_402685a258cf2a33c1d6c13a89adec92.png",
        },
        updated_by: {
          name: "Atsuo Fukaya",
          screen_name: "fukayatsu",
          icon:
            "http://img.esa.io/uploads/production/users/1/icon/thumb_m_402685a258cf2a33c1d6c13a89adec92.png",
        },
        kind: "flow",
        comments_count: 1,
        tasks_count: 1,
        done_tasks_count: 1,
        stargazers_count: 1,
        watchers_count: 1,
        star: true,
        watch: true,
      };
      const expected = [
        {
          type: "context",
          elements: [
            {
              type: "image",
              image_url:
                "http://img.esa.io/uploads/production/users/1/icon/thumb_m_402685a258cf2a33c1d6c13a89adec92.png",
              alt_text: "created_by",
            },
            {
              type: "mrkdwn",
              text: "*<https://team.esa.io/members/fukayatsu|fukayatsu>*",
            },
            { type: "mrkdwn", text: "Add Getting Started section" },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "<https://team.esa.io/posts/4|[WIP] 日報/2015/05/09/hi! #api #dev>",
          },
          fields: [{ type: "mrkdwn", text: "# Getting Started" }],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text:
                "Created by <https://team.esa.io/members/fukayatsu|fukayatsu>",
            },
            {
              type: "image",
              image_url:
                "http://img.esa.io/uploads/production/users/1/icon/thumb_m_402685a258cf2a33c1d6c13a89adec92.png",
              alt_text: "updated_by",
            },
            { type: "mrkdwn", text: "2015-05-09T11:54:51+09:00" },
          ],
        },
      ];
      const actual = createUnfurls(client, url);
      console.log(JSON.stringify(actual[url].blocks));

      expect(actual[url]).toHaveProperty("blocks", expected);
    });
    it("comment success", () => {
      const url = "https://team.esa.io/posts/2#comment-123";
      const client = new EsaApiClient("token", "team");
      apiResponse = {
        id: 13,
        body_md: "読みたい",
        body_html: "<p>読みたい</p>",
        created_at: "2014-05-13T16:17:42+09:00",
        updated_at: "2014-05-18T23:02:29+09:00",
        url,
        created_by: {
          name: "TAEKO AKATSUKA",
          screen_name: "taea",
          icon:
            "https://img.esa.io/uploads/production/users/2/icon/thumb_m_2690997f07b7de3014a36d90827603d6.jpg",
        },
        stargazers_count: 0,
        star: false,
      };
      const expected = [
        {
          type: "context",
          elements: [
            {
              type: "image",
              image_url:
                "https://img.esa.io/uploads/production/users/2/icon/thumb_m_2690997f07b7de3014a36d90827603d6.jpg",
              alt_text: "commented on",
            },
            {
              type: "mrkdwn",
              text: "*<https://team.esa.io/members/taea|taea>*",
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "taea commented on <https://team.esa.io/posts/2#comment-123|undefined>",
          },
          fields: [{ type: "mrkdwn", text: "読みたい" }],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "Created by <https://team.esa.io/members/taea|taea>",
            },
            {
              type: "image",
              image_url:
                "https://img.esa.io/uploads/production/users/2/icon/thumb_m_2690997f07b7de3014a36d90827603d6.jpg",
              alt_text: "created_by",
            },
            { type: "mrkdwn", text: "2014-05-18T23:02:29+09:00" },
          ],
        },
      ];
      const actual = createUnfurls(client, url);
      console.log(JSON.stringify(actual[url].blocks));

      expect(actual[url]).toHaveProperty("blocks", expected);
    });
    it("post with images success", () => {
      const url = "https://team.esa.io/posts/4";
      const client = new EsaApiClient("token", "team");
      apiResponse = {
        number: 1,
        name: "hi!",
        full_name: "日報/2015/05/09/hi! #api #dev",
        wip: true,
        body_md: "# Getting Started",
        body_html:
          '<h1 id="1-0-0" name="1-0-0">\n<a class="anchor" href="#1-0-0"><i class="fa fa-link"></i><span class="hidden" data-text="Getting Started"> &gt; Getting Started</span></a>Getting Started</h1><img src="data:image/svg+xml;charset=utf-8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxv%0AbmU9Im5vIj8+PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9z%0AdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5r%0AIiBjb250ZW50U2NyaXB0VHlwZT0iYXBwbGljYXRpb24vZWNtYXNjcmlwdCIg%0AY29udGVudFN0eWxlVHlwZT0idGV4dC9jc3MiIGhlaWdodD0iMTgycHgiIHBy%0AZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiIHN0eWxlPSJ3aWR0aDo5NHB4O2hl%0AaWdodDoxODJweDsiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDk0IDE4%0AMiIgd2lkdGg9Ijk0cHgiIHpvb21BbmRQYW49Im1hZ25pZnkiPjxkZWZzPjxm%0AaWx0ZXIgaGVpZ2h0PSIzMDAlIiBpZD0iZnoxNHF5NDRnMjFneCIgd2lkdGg9%0AIjMwMCUiIHg9Ii0xIiB5PSItMSI+PGZlR2F1c3NpYW5CbHVyIHJlc3VsdD0i%0AYmx1ck91dCIgc3RkRGV2aWF0aW9uPSIyLjAiLz48ZmVDb2xvck1hdHJpeCBp%0Abj0iYmx1ck91dCIgcmVzdWx0PSJibHVyT3V0MiIgdHlwZT0ibWF0cml4IiB2%0AYWx1ZXM9IjAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIC40%0AIDAiLz48ZmVPZmZzZXQgZHg9IjQuMCIgZHk9IjQuMCIgaW49ImJsdXJPdXQy%0AIiByZXN1bHQ9ImJsdXJPdXQzIi8+PGZlQmxlbmQgaW49IlNvdXJjZUdyYXBo%0AaWMiIGluMj0iYmx1ck91dDMiIG1vZGU9Im5vcm1hbCIvPjwvZmlsdGVyPjwv%0AZGVmcz48Zz48IS0tTUQ1PVtmOWFjZmZkY2Q0YjQ0MjE3N2FmNDZjNjM0Zjcw%0ANjQ1NV0KY2xhc3MgSGVsbG8tLT48cmVjdCBmaWxsPSIjRkVGRUNFIiBmaWx0%0AZXI9InVybCgjZnoxNHF5NDRnMjFneCkiIGhlaWdodD0iNDgiIGlkPSJIZWxs%0AbyIgc3R5bGU9InN0cm9rZTogI0E4MDAzNjsgc3Ryb2tlLXdpZHRoOiAxLjU7%0AIiB3aWR0aD0iNjMiIHg9IjkuNSIgeT0iNyIvPjxlbGxpcHNlIGN4PSIyNC41%0AIiBjeT0iMjMiIGZpbGw9IiNBREQxQjIiIHJ4PSIxMSIgcnk9IjExIiBzdHls%0AZT0ic3Ryb2tlOiAjQTgwMDM2OyBzdHJva2Utd2lkdGg6IDEuMDsiLz48cGF0%0AaCBkPSJNMjYuODQzOCwxOC42NzE5IEMyNS45MDYzLDE4LjIzNDQgMjUuMzEy%0ANSwxOC4wOTM4IDI0LjQzNzUsMTguMDkzOCBDMjEuODEyNSwxOC4wOTM4IDE5%0ALjgxMjUsMjAuMTcxOSAxOS44MTI1LDIyLjg5MDYgTDE5LjgxMjUsMjQuMDE1%0ANiBDMTkuODEyNSwyNi41OTM4IDIxLjkyMTksMjguNDg0NCAyNC44MTI1LDI4%0ALjQ4NDQgQzI2LjAzMTMsMjguNDg0NCAyNy4xODc1LDI4LjE4NzUgMjcuOTM3%0ANSwyNy42NDA2IEMyOC41MTU2LDI3LjIzNDQgMjguODQzOCwyNi43ODEzIDI4%0ALjg0MzgsMjYuMzkwNiBDMjguODQzOCwyNS45Mzc1IDI4LjQ1MzEsMjUuNTQ2%0AOSAyNy45ODQ0LDI1LjU0NjkgQzI3Ljc2NTYsMjUuNTQ2OSAyNy41NjI1LDI1%0ALjYyNSAyNy4zNzUsMjUuODEyNSBDMjYuOTIxOSwyNi4yOTY5IDI2LjkyMTks%0AMjYuMjk2OSAyNi43MzQ0LDI2LjM5MDYgQzI2LjMxMjUsMjYuNjU2MyAyNS42%0AMjUsMjYuNzgxMyAyNC44NTk0LDI2Ljc4MTMgQzIyLjgxMjUsMjYuNzgxMyAy%0AMS41MTU2LDI1LjY4NzUgMjEuNTE1NiwyMy45ODQ0IEwyMS41MTU2LDIyLjg5%0AMDYgQzIxLjUxNTYsMjEuMTA5NCAyMi43NjU2LDE5Ljc5NjkgMjQuNSwxOS43%0AOTY5IEMyNS4wNzgxLDE5Ljc5NjkgMjUuNjg3NSwxOS45NTMxIDI2LjE1NjMs%0AMjAuMjAzMSBDMjYuNjQwNiwyMC40ODQ0IDI2LjgxMjUsMjAuNzAzMSAyNi45%0AMDYzLDIxLjEwOTQgQzI2Ljk2ODgsMjEuNTE1NiAyNywyMS42NDA2IDI3LjE0%0AMDYsMjEuNzY1NiBDMjcuMjgxMywyMS45MDYzIDI3LjUxNTYsMjIuMDE1NiAy%0ANy43MzQ0LDIyLjAxNTYgQzI4LDIyLjAxNTYgMjguMjY1NiwyMS44NzUgMjgu%0ANDM3NSwyMS42NTYzIEMyOC41NDY5LDIxLjUgMjguNTc4MSwyMS4zMTI1IDI4%0ALjU3ODEsMjAuODkwNiBMMjguNTc4MSwxOS40Njg4IEMyOC41NzgxLDE5LjAz%0AMTMgMjguNTYyNSwxOC45MDYzIDI4LjQ2ODgsMTguNzUgQzI4LjMxMjUsMTgu%0ANDg0NCAyOC4wMzEzLDE4LjM0MzggMjcuNzM0NCwxOC4zNDM4IEMyNy40Mzc1%0ALDE4LjM0MzggMjcuMjM0NCwxOC40Mzc1IDI3LjAxNTYsMTguNzUgTDI2Ljg0%0AMzgsMTguNjcxOSBaICIvPjx0ZXh0IGZpbGw9IiMwMDAwMDAiIGZvbnQtZmFt%0AaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBsZW5ndGhBZGp1c3Q9%0AInNwYWNpbmdBbmRHbHlwaHMiIHRleHRMZW5ndGg9IjMxIiB4PSIzOC41IiB5%0APSIyNy4xNTQzIj5IZWxsbzwvdGV4dD48bGluZSBzdHlsZT0ic3Ryb2tlOiAj%0AQTgwMDM2OyBzdHJva2Utd2lkdGg6IDEuNTsiIHgxPSIxMC41IiB4Mj0iNzEu%0ANSIgeTE9IjM5IiB5Mj0iMzkiLz48bGluZSBzdHlsZT0ic3Ryb2tlOiAjQTgw%0AMDM2OyBzdHJva2Utd2lkdGg6IDEuNTsiIHgxPSIxMC41IiB4Mj0iNzEuNSIg%0AeTE9IjQ3IiB5Mj0iNDciLz48IS0tTUQ1PVsxYjE1NjIzMTRlZjUwZWRmOTIx%0AYmFkMGNkMjA0MTg2YV0KY2xhc3MgV29ybGQtLT48cmVjdCBmaWxsPSIjRkVG%0ARUNFIiBmaWx0ZXI9InVybCgjZnoxNHF5NDRnMjFneCkiIGhlaWdodD0iNDgi%0AIGlkPSJXb3JsZCIgc3R5bGU9InN0cm9rZTogI0E4MDAzNjsgc3Ryb2tlLXdp%0AZHRoOiAxLjU7IiB3aWR0aD0iNjgiIHg9IjciIHk9IjExNSIvPjxlbGxpcHNl%0AIGN4PSIyMiIgY3k9IjEzMSIgZmlsbD0iI0FERDFCMiIgcng9IjExIiByeT0i%0AMTEiIHN0eWxlPSJzdHJva2U6ICNBODAwMzY7IHN0cm9rZS13aWR0aDogMS4w%0AOyIvPjxwYXRoIGQ9Ik0yNC4zNDM4LDEyNi42NzE5IEMyMy40MDYzLDEyNi4y%0AMzQ0IDIyLjgxMjUsMTI2LjA5MzggMjEuOTM3NSwxMjYuMDkzOCBDMTkuMzEy%0ANSwxMjYuMDkzOCAxNy4zMTI1LDEyOC4xNzE5IDE3LjMxMjUsMTMwLjg5MDYg%0ATDE3LjMxMjUsMTMyLjAxNTYgQzE3LjMxMjUsMTM0LjU5MzggMTkuNDIxOSwx%0AMzYuNDg0NCAyMi4zMTI1LDEzNi40ODQ0IEMyMy41MzEzLDEzNi40ODQ0IDI0%0ALjY4NzUsMTM2LjE4NzUgMjUuNDM3NSwxMzUuNjQwNiBDMjYuMDE1NiwxMzUu%0AMjM0NCAyNi4zNDM4LDEzNC43ODEzIDI2LjM0MzgsMTM0LjM5MDYgQzI2LjM0%0AMzgsMTMzLjkzNzUgMjUuOTUzMSwxMzMuNTQ2OSAyNS40ODQ0LDEzMy41NDY5%0AIEMyNS4yNjU2LDEzMy41NDY5IDI1LjA2MjUsMTMzLjYyNSAyNC44NzUsMTMz%0ALjgxMjUgQzI0LjQyMTksMTM0LjI5NjkgMjQuNDIxOSwxMzQuMjk2OSAyNC4y%0AMzQ0LDEzNC4zOTA2IEMyMy44MTI1LDEzNC42NTYzIDIzLjEyNSwxMzQuNzgx%0AMyAyMi4zNTk0LDEzNC43ODEzIEMyMC4zMTI1LDEzNC43ODEzIDE5LjAxNTYs%0AMTMzLjY4NzUgMTkuMDE1NiwxMzEuOTg0NCBMMTkuMDE1NiwxMzAuODkwNiBD%0AMTkuMDE1NiwxMjkuMTA5NCAyMC4yNjU2LDEyNy43OTY5IDIyLDEyNy43OTY5%0AIEMyMi41NzgxLDEyNy43OTY5IDIzLjE4NzUsMTI3Ljk1MzEgMjMuNjU2Mywx%0AMjguMjAzMSBDMjQuMTQwNiwxMjguNDg0NCAyNC4zMTI1LDEyOC43MDMxIDI0%0ALjQwNjMsMTI5LjEwOTQgQzI0LjQ2ODgsMTI5LjUxNTYgMjQuNSwxMjkuNjQw%0ANiAyNC42NDA2LDEyOS43NjU2IEMyNC43ODEzLDEyOS45MDYzIDI1LjAxNTYs%0AMTMwLjAxNTYgMjUuMjM0NCwxMzAuMDE1NiBDMjUuNSwxMzAuMDE1NiAyNS43%0ANjU2LDEyOS44NzUgMjUuOTM3NSwxMjkuNjU2MyBDMjYuMDQ2OSwxMjkuNSAy%0ANi4wNzgxLDEyOS4zMTI1IDI2LjA3ODEsMTI4Ljg5MDYgTDI2LjA3ODEsMTI3%0ALjQ2ODggQzI2LjA3ODEsMTI3LjAzMTMgMjYuMDYyNSwxMjYuOTA2MyAyNS45%0ANjg4LDEyNi43NSBDMjUuODEyNSwxMjYuNDg0NCAyNS41MzEzLDEyNi4zNDM4%0AIDI1LjIzNDQsMTI2LjM0MzggQzI0LjkzNzUsMTI2LjM0MzggMjQuNzM0NCwx%0AMjYuNDM3NSAyNC41MTU2LDEyNi43NSBMMjQuMzQzOCwxMjYuNjcxOSBaICIv%0APjx0ZXh0IGZpbGw9IiMwMDAwMDAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlm%0AIiBmb250LXNpemU9IjEyIiBsZW5ndGhBZGp1c3Q9InNwYWNpbmdBbmRHbHlw%0AaHMiIHRleHRMZW5ndGg9IjM2IiB4PSIzNiIgeT0iMTM1LjE1NDMiPldvcmxk%0APC90ZXh0PjxsaW5lIHN0eWxlPSJzdHJva2U6ICNBODAwMzY7IHN0cm9rZS13%0AaWR0aDogMS41OyIgeDE9IjgiIHgyPSI3NCIgeTE9IjE0NyIgeTI9IjE0NyIv%0APjxsaW5lIHN0eWxlPSJzdHJva2U6ICNBODAwMzY7IHN0cm9rZS13aWR0aDog%0AMS41OyIgeDE9IjgiIHgyPSI3NCIgeTE9IjE1NSIgeTI9IjE1NSIvPjwhLS1N%0ARDU9WzEzMTIxNmRmZTExZmMxMDIxZGRiYzY1ZDMwZWI3ZmM0XQpyZXZlcnNl%0AIGxpbmsgSGVsbG8gdG8gV29ybGQtLT48cGF0aCBjb2RlTGluZT0iNCIgZD0i%0ATTQxLDc1LjAyMzYgQzQxLDg4LjU3OTIgNDEsMTAzLjAzODEgNDEsMTE0LjY3%0AODQgIiBmaWxsPSJub25lIiBpZD0iSGVsbG8tYmFja3RvLVdvcmxkIiBzdHls%0AZT0ic3Ryb2tlOiAjQTgwMDM2OyBzdHJva2Utd2lkdGg6IDEuMDsiLz48cG9s%0AeWdvbiBmaWxsPSJub25lIiBwb2ludHM9IjM0LjAwMDEsNzUuMDAwNSw0MSw1%0ANSw0OC4wMDAxLDc1LjAwMDQsMzQuMDAwMSw3NS4wMDA1IiBzdHlsZT0ic3Ry%0Ab2tlOiAjQTgwMDM2OyBzdHJva2Utd2lkdGg6IDEuMDsiLz48L2c+PC9zdmc+%0A" alt="UML"><img src="https://img.esa.io/uploads/production/pictures/105/3203/image/378bedb1186931ecfa019e92dafc1692.gif" alt="patapata (( ⁰⊖⁰)/)">\n',
        created_at: "2015-05-09T11:54:50+09:00",
        message: "Add Getting Started section",
        url,
        updated_at: "2015-05-09T11:54:51+09:00",
        tags: ["api", "dev"],
        category: "日報/2015/05/09",
        revision_number: 1,
        created_by: {
          name: "Atsuo Fukaya",
          screen_name: "fukayatsu",
          icon:
            "http://img.esa.io/uploads/production/users/1/icon/thumb_m_402685a258cf2a33c1d6c13a89adec92.png",
        },
        updated_by: {
          name: "Atsuo Fukaya",
          screen_name: "fukayatsu",
          icon:
            "http://img.esa.io/uploads/production/users/1/icon/thumb_m_402685a258cf2a33c1d6c13a89adec92.png",
        },
        kind: "flow",
        comments_count: 1,
        tasks_count: 1,
        done_tasks_count: 1,
        stargazers_count: 1,
        watchers_count: 1,
        star: true,
        watch: true,
      };
      const expected = [
        {
          type: "context",
          elements: [
            {
              type: "image",
              image_url:
                "http://img.esa.io/uploads/production/users/1/icon/thumb_m_402685a258cf2a33c1d6c13a89adec92.png",
              alt_text: "created_by",
            },
            {
              type: "mrkdwn",
              text: "*<https://team.esa.io/members/fukayatsu|fukayatsu>*",
            },
            { type: "mrkdwn", text: "Add Getting Started section" },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "<https://team.esa.io/posts/4|[WIP] 日報/2015/05/09/hi! #api #dev>",
          },
          fields: [{ type: "mrkdwn", text: "# Getting Started" }],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text:
                "Created by <https://team.esa.io/members/fukayatsu|fukayatsu>",
            },
            {
              type: "image",
              image_url:
                "http://img.esa.io/uploads/production/users/1/icon/thumb_m_402685a258cf2a33c1d6c13a89adec92.png",
              alt_text: "updated_by",
            },
            { type: "mrkdwn", text: "2015-05-09T11:54:51+09:00" },
          ],
        },
        {
          type: "image",
          image_url:
            "https://img.esa.io/uploads/production/pictures/105/3203/image/378bedb1186931ecfa019e92dafc1692.gif",
          alt_text: "patapata (( ⁰⊖⁰)/)",
        },
      ];
      const actual = createUnfurls(client, url);
      console.log(JSON.stringify(actual[url].blocks));

      expect(actual[url]).toHaveProperty("blocks", expected);
    });
    it("long post success", () => {
      const url = "https://team.esa.io/posts/4";
      const client = new EsaApiClient("token", "team");
      apiResponse = {
        number: 1,
        name: "hi!",
        full_name: "日報/2015/05/09/hi! #api #dev",
        wip: true,
        body_md:
          "* 1\n* 2\n* 3\n* 4\n* 5\n* 6\n* 7\n* 8\n* 9\n* 10\n* 11\n* 12",
        body_html:
          '<h1 id="1-0-0" name="1-0-0">\n<a class="anchor" href="#1-0-0"><i class="fa fa-link"></i><span class="hidden" data-text="Getting Started"> &gt; Getting Started</span></a>Getting Started</h1>\n',
        created_at: "2015-05-09T11:54:50+09:00",
        message: "Add Getting Started section",
        url,
        updated_at: "2015-05-09T11:54:51+09:00",
        tags: ["api", "dev"],
        category: "日報/2015/05/09",
        revision_number: 1,
        created_by: {
          name: "Atsuo Fukaya",
          screen_name: "fukayatsu",
          icon:
            "http://img.esa.io/uploads/production/users/1/icon/thumb_m_402685a258cf2a33c1d6c13a89adec92.png",
        },
        updated_by: {
          name: "Atsuo Fukaya",
          screen_name: "fukayatsu",
          icon:
            "http://img.esa.io/uploads/production/users/1/icon/thumb_m_402685a258cf2a33c1d6c13a89adec92.png",
        },
        kind: "flow",
        comments_count: 1,
        tasks_count: 1,
        done_tasks_count: 1,
        stargazers_count: 1,
        watchers_count: 1,
        star: true,
        watch: true,
      };
      const expected = [
        {
          type: "context",
          elements: [
            {
              type: "image",
              image_url:
                "http://img.esa.io/uploads/production/users/1/icon/thumb_m_402685a258cf2a33c1d6c13a89adec92.png",
              alt_text: "created_by",
            },
            {
              type: "mrkdwn",
              text: "*<https://team.esa.io/members/fukayatsu|fukayatsu>*",
            },
            { type: "mrkdwn", text: "Add Getting Started section" },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "<https://team.esa.io/posts/4|[WIP] 日報/2015/05/09/hi! #api #dev>",
          },
          fields: [
            {
              type: "mrkdwn",
              text: "* 1\n* 2\n* 3\n* 4\n* 5\n* 6\n* 7\n* 8\n* 9\n* 10",
            },
          ],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text:
                "Created by <https://team.esa.io/members/fukayatsu|fukayatsu>",
            },
            {
              type: "image",
              image_url:
                "http://img.esa.io/uploads/production/users/1/icon/thumb_m_402685a258cf2a33c1d6c13a89adec92.png",
              alt_text: "updated_by",
            },
            { type: "mrkdwn", text: "2015-05-09T11:54:51+09:00" },
          ],
        },
      ];
      const actual = createUnfurls(client, url);
      console.log(JSON.stringify(actual[url].blocks));

      expect(actual[url]).toHaveProperty("blocks", expected);
    });
  });
  describe("extractImage", () => {
    it("parse emoji", () => {
      const actual = extractImage(
        '<img class="emoji" title=":grinning:" alt=":grinning:" src="https://assets.esa.io/images/emoji/unicode/1f600.png">'
      );

      expect(actual).toBeNull();
    });
    it("parse non emoji", () => {
      const actual = extractImage(
        '<img src="https://img.esa.io/uploads/production/pictures/1/910/image/dffd841aac82710597076cb37a56627e.png" alt="スクリーンショット 2014-11-14 20.15.43.png">'
      );
      const expected = {
        alt_text: "スクリーンショット 2014-11-14 20.15.43.png",
        image_url:
          "https://img.esa.io/uploads/production/pictures/1/910/image/dffd841aac82710597076cb37a56627e.png",
        type: "image",
      };

      expect(actual).toEqual(expected);
    });
    it("no alt", () => {
      const actual = extractImage(
        '<img src="https://img.esa.io/uploads/production/pictures/1/910/image/dffd841aac82710597076cb37a56627e.png">'
      );
      const expected = {
        image_url:
          "https://img.esa.io/uploads/production/pictures/1/910/image/dffd841aac82710597076cb37a56627e.png",
        type: "image",
      };

      expect(actual).toEqual(expected);
    });
  });
});
